/**
 * Neo4j 关系搜索 API
 * 支持按类型或属性值模糊搜索关系
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
 * POST: 搜索关系
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

    // 搜索关系类型或属性
    const cypherQuery = `
      MATCH (a)-[r]->(b)
      WHERE type(r) CONTAINS $searchQuery 
         OR ANY(prop IN keys(r) WHERE toString(r[prop]) CONTAINS $searchQuery)
      RETURN r, id(a) as startId, id(b) as endId
      LIMIT 100
    `;

    const result = await session.run(cypherQuery, {
      searchQuery: query,
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

    return NextResponse.json({
      relationships,
      total: relationships.length,
    });
  } catch (error: any) {
    console.error("搜索关系失败:", error);
    return NextResponse.json(
      { error: error.message || "搜索关系失败" },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

