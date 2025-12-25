/**
 * Neo4j 节点信息查询 API
 * 根据节点ID获取节点的基本信息（用于关系显示）
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

  if (neo4j.isInt(value)) {
    return value.toNumber();
  }

  if (Array.isArray(value)) {
    return value.map(convertNeo4jValue);
  }

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
 * GET: 获取节点基本信息
 */
export async function GET(request: NextRequest) {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const { searchParams } = new URL(request.url);
    const identity = searchParams.get("identity");

    if (!identity) {
      return NextResponse.json(
        { error: "节点ID不能为空" },
        { status: 400 }
      );
    }

    const query = `
      MATCH (n)
      WHERE id(n) = $id
      RETURN n
    `;

    const result = await session.run(query, {
      id: neo4j.int(parseInt(identity)),
    });

    if (result.records.length === 0) {
      return NextResponse.json(
        { node: null },
        { status: 200 }
      );
    }

    const node = result.records[0].get("n");
    const properties = convertNeo4jValue(node.properties);

    // 提取常用的显示名称
    const name = 
      properties.name || 
      properties.title || 
      properties.label || 
      properties.doc_id || 
      properties.id;

    return NextResponse.json({
      node: {
        labels: node.labels,
        name: name,
        properties: properties,
      },
    });
  } catch (error: any) {
    console.error("查询节点信息失败:", error);
    return NextResponse.json(
      { error: error.message || "查询节点信息失败" },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

