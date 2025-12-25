/**
 * Neo4j 关系类型查询 API
 * 获取数据库中所有关系类型
 */

import { NextRequest, NextResponse } from "next/server";
import { getNeo4jDriver } from "@/server/graphql/context";

/**
 * GET: 获取所有关系类型
 */
export async function GET(request: NextRequest) {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const query = `CALL db.relationshipTypes()`;
    const result = await session.run(query);

    const types = result.records.map((record) => record.get(0));

    return NextResponse.json({
      types,
    });
  } catch (error: any) {
    console.error("查询关系类型失败:", error);
    return NextResponse.json(
      { error: error.message || "查询关系类型失败" },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

