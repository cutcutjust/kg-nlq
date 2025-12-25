/**
 * Neo4j 节点管理 API
 * 提供节点的增删改查功能
 */

import { NextRequest, NextResponse } from "next/server";
import { getNeo4jDriver } from "@/server/graphql/context";
import neo4j from "neo4j-driver";

/**
 * 将 Neo4j 值转换为普通 JavaScript 值
 */
function convertNeo4jValue(value: any): any {
  if (value === null || value === undefined) {
    return value;
  }

  // 处理 Neo4j Integer
  if (neo4j.isInt(value)) {
    return value.toNumber();
  }

  // 处理数组
  if (Array.isArray(value)) {
    return value.map(convertNeo4jValue);
  }

  // 处理对象
  if (typeof value === "object" && value !== null) {
    const converted: any = {};
    for (const [key, val] of Object.entries(value)) {
      converted[key] = convertNeo4jValue(val);
    }
    return converted;
  }

  return value;
}

/**
 * GET: 查询节点
 * 支持按标签、属性过滤，分页查询
 */
export async function GET(request: NextRequest) {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const { searchParams } = new URL(request.url);
    const label = searchParams.get("label"); // 按标签过滤
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = parseInt(searchParams.get("skip") || "0");

    // 构建查询
    let query = label
      ? `MATCH (n:${label}) RETURN n SKIP $skip LIMIT $limit`
      : `MATCH (n) RETURN n SKIP $skip LIMIT $limit`;

    const result = await session.run(query, { 
      skip: neo4j.int(skip), 
      limit: neo4j.int(limit) 
    });

    const nodes = result.records.map((record) => {
      const node = record.get("n");
      return {
        identity: node.identity.toString(),
        labels: node.labels,
        properties: convertNeo4jValue(node.properties),
      };
    });

    // 获取总数
    const countQuery = label
      ? `MATCH (n:${label}) RETURN count(n) as total`
      : `MATCH (n) RETURN count(n) as total`;
    const countResult = await session.run(countQuery);
    const total = countResult.records[0]?.get("total").toInt() || 0;

    return NextResponse.json({
      nodes,
      total,
    });
  } catch (error: any) {
    console.error("查询节点失败:", error);
    return NextResponse.json(
      { error: error.message || "查询节点失败" },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

/**
 * POST: 创建节点
 */
export async function POST(request: NextRequest) {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const body = await request.json();
    const { labels, properties } = body;

    // 验证
    if (!labels || !Array.isArray(labels) || labels.length === 0) {
      return NextResponse.json(
        { error: "节点标签不能为空" },
        { status: 400 }
      );
    }

    // 构建标签字符串
    const labelStr = labels.map((l: string) => `:${l}`).join("");

    // 构建属性字符串
    const propKeys = Object.keys(properties || {});
    const propStr = propKeys.length > 0 ? "{" + propKeys.map(k => `${k}: $props.${k}`).join(", ") + "}" : "";

    const query = `CREATE (n${labelStr} ${propStr}) RETURN n`;

    const result = await session.run(query, { props: properties || {} });

    if (result.records.length === 0) {
      throw new Error("创建节点失败");
    }

    const node = result.records[0].get("n");

    return NextResponse.json({
      success: true,
      node: {
        identity: node.identity.toString(),
        labels: node.labels,
        properties: convertNeo4jValue(node.properties),
      },
    });
  } catch (error: any) {
    console.error("创建节点失败:", error);
    return NextResponse.json(
      { error: error.message || "创建节点失败" },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

/**
 * PUT: 更新节点
 */
export async function PUT(request: NextRequest) {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const body = await request.json();
    const { identity, properties } = body;

    if (!identity) {
      return NextResponse.json(
        { error: "节点ID不能为空" },
        { status: 400 }
      );
    }

    if (!properties || Object.keys(properties).length === 0) {
      return NextResponse.json(
        { error: "更新属性不能为空" },
        { status: 400 }
      );
    }

    // 构建SET语句
    const setParts = Object.keys(properties).map(k => `n.${k} = $props.${k}`);
    const query = `
      MATCH (n)
      WHERE id(n) = $id
      SET ${setParts.join(", ")}
      RETURN n
    `;

    const result = await session.run(query, {
      id: neo4j.int(parseInt(identity)),
      props: properties,
    });

    if (result.records.length === 0) {
      return NextResponse.json(
        { error: "节点不存在" },
        { status: 404 }
      );
    }

    const node = result.records[0].get("n");

    return NextResponse.json({
      success: true,
      node: {
        identity: node.identity.toString(),
        labels: node.labels,
        properties: convertNeo4jValue(node.properties),
      },
    });
  } catch (error: any) {
    console.error("更新节点失败:", error);
    return NextResponse.json(
      { error: error.message || "更新节点失败" },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

/**
 * DELETE: 删除节点
 */
export async function DELETE(request: NextRequest) {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const { searchParams } = new URL(request.url);
    const identity = searchParams.get("identity");
    const detachDelete = searchParams.get("detachDelete") === "true";

    if (!identity) {
      return NextResponse.json(
        { error: "节点ID不能为空" },
        { status: 400 }
      );
    }

    // 使用 DETACH DELETE 可以同时删除关联的关系
    const query = detachDelete
      ? `MATCH (n) WHERE id(n) = $id DETACH DELETE n`
      : `MATCH (n) WHERE id(n) = $id DELETE n`;

    await session.run(query, { id: neo4j.int(parseInt(identity)) });

    return NextResponse.json({
      success: true,
      message: "节点删除成功",
    });
  } catch (error: any) {
    console.error("删除节点失败:", error);
    
    // 如果是因为有关联关系导致删除失败
    if (error.code === "Neo.ClientError.Schema.ConstraintValidationFailed") {
      return NextResponse.json(
        { error: "节点有关联关系，请先删除关系或使用强制删除" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "删除节点失败" },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

