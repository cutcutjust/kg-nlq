/**
 * Neo4j 节点搜索 API
 * 支持按属性值模糊搜索节点
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
 * POST: 搜索节点
 * 支持按任意属性值进行模糊搜索
 */
export async function POST(request: NextRequest) {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "搜索关键词不能为空" },
        { status: 400 }
      );
    }

    // 使用 Cypher 进行全文搜索
    // 搜索所有节点的所有字符串属性
    const cypherQuery = `
      MATCH (n)
      WHERE ANY(prop IN keys(n) WHERE toString(n[prop]) CONTAINS $searchQuery)
      RETURN n
      LIMIT 100
    `;

    const result = await session.run(cypherQuery, {
      searchQuery: query,
    });

    const nodes = result.records.map((record) => {
      const node = record.get("n");
      return {
        identity: node.identity.toString(),
        labels: node.labels,
        properties: convertNeo4jValue(node.properties),
      };
    });

    return NextResponse.json({
      nodes,
      total: nodes.length,
    });
  } catch (error: any) {
    console.error("搜索节点失败:", error);
    return NextResponse.json(
      { error: error.message || "搜索节点失败" },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

