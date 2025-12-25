/**
 * Neo4j 关系管理 API
 * 提供关系的增删改查功能
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
 * GET: 查询关系
 */
export async function GET(request: NextRequest) {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // 按类型过滤
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = parseInt(searchParams.get("skip") || "0");

    // 构建查询
    let query = type
      ? `MATCH (a)-[r:${type}]->(b) RETURN r, id(a) as startId, id(b) as endId SKIP $skip LIMIT $limit`
      : `MATCH (a)-[r]->(b) RETURN r, id(a) as startId, id(b) as endId SKIP $skip LIMIT $limit`;

    const result = await session.run(query, { 
      skip: neo4j.int(skip), 
      limit: neo4j.int(limit) 
    });

    const relationships = result.records.map((record) => {
      const rel = record.get("r");
      return {
        identity: rel.identity.toString(),
        type: rel.type,
        startNodeId: record.get("startId").toString(),
        endNodeId: record.get("endId").toString(),
        properties: convertNeo4jValue(rel.properties),
      };
    });

    // 获取总数
    const countQuery = type
      ? `MATCH ()-[r:${type}]->() RETURN count(r) as total`
      : `MATCH ()-[r]->() RETURN count(r) as total`;
    const countResult = await session.run(countQuery);
    const total = countResult.records[0]?.get("total").toInt() || 0;

    return NextResponse.json({
      relationships,
      total,
    });
  } catch (error: any) {
    console.error("查询关系失败:", error);
    return NextResponse.json(
      { error: error.message || "查询关系失败" },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

/**
 * POST: 创建关系
 */
export async function POST(request: NextRequest) {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const body = await request.json();
    const { startNodeId, endNodeId, type, properties } = body;

    // 验证
    if (!startNodeId || !endNodeId || !type) {
      return NextResponse.json(
        { error: "起始节点、结束节点和关系类型不能为空" },
        { status: 400 }
      );
    }

    // 构建属性字符串
    const propKeys = Object.keys(properties || {});
    const propStr = propKeys.length > 0 ? "{" + propKeys.map(k => `${k}: $props.${k}`).join(", ") + "}" : "";

    const query = `
      MATCH (a), (b)
      WHERE id(a) = $startId AND id(b) = $endId
      CREATE (a)-[r:${type} ${propStr}]->(b)
      RETURN r, id(a) as startId, id(b) as endId
    `;

    const result = await session.run(query, {
      startId: neo4j.int(parseInt(startNodeId)),
      endId: neo4j.int(parseInt(endNodeId)),
      props: properties || {},
    });

    if (result.records.length === 0) {
      throw new Error("创建关系失败，请检查节点是否存在");
    }

    const rel = result.records[0].get("r");

    return NextResponse.json({
      success: true,
      relationship: {
        identity: rel.identity.toString(),
        type: rel.type,
        startNodeId: result.records[0].get("startId").toString(),
        endNodeId: result.records[0].get("endId").toString(),
        properties: convertNeo4jValue(rel.properties),
      },
    });
  } catch (error: any) {
    console.error("创建关系失败:", error);
    return NextResponse.json(
      { error: error.message || "创建关系失败" },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

/**
 * PUT: 更新关系
 */
export async function PUT(request: NextRequest) {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const body = await request.json();
    const { identity, properties } = body;

    if (!identity) {
      return NextResponse.json(
        { error: "关系ID不能为空" },
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
    const setParts = Object.keys(properties).map(k => `r.${k} = $props.${k}`);
    const query = `
      MATCH ()-[r]->()
      WHERE id(r) = $id
      SET ${setParts.join(", ")}
      RETURN r, startNode(r) as a, endNode(r) as b
    `;

    const result = await session.run(query, {
      id: neo4j.int(parseInt(identity)),
      props: properties,
    });

    if (result.records.length === 0) {
      return NextResponse.json(
        { error: "关系不存在" },
        { status: 404 }
      );
    }

    const rel = result.records[0].get("r");
    const startNode = result.records[0].get("a");
    const endNode = result.records[0].get("b");

    return NextResponse.json({
      success: true,
      relationship: {
        identity: rel.identity.toString(),
        type: rel.type,
        startNodeId: startNode.identity.toString(),
        endNodeId: endNode.identity.toString(),
        properties: convertNeo4jValue(rel.properties),
      },
    });
  } catch (error: any) {
    console.error("更新关系失败:", error);
    return NextResponse.json(
      { error: error.message || "更新关系失败" },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

/**
 * DELETE: 删除关系
 */
export async function DELETE(request: NextRequest) {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const { searchParams } = new URL(request.url);
    const identity = searchParams.get("identity");

    if (!identity) {
      return NextResponse.json(
        { error: "关系ID不能为空" },
        { status: 400 }
      );
    }

    const query = `
      MATCH ()-[r]->()
      WHERE id(r) = $id
      DELETE r
    `;

    await session.run(query, { id: neo4j.int(parseInt(identity)) });

    return NextResponse.json({
      success: true,
      message: "关系删除成功",
    });
  } catch (error: any) {
    console.error("删除关系失败:", error);
    return NextResponse.json(
      { error: error.message || "删除关系失败" },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

