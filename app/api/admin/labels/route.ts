/**
 * Neo4j 标签查询 API
 * 获取数据库中所有节点标签
 */

import { NextRequest, NextResponse } from "next/server";
import { getNeo4jDriver } from "@/server/graphql/context";

/**
 * GET: 获取所有节点标签
 */
export async function GET(request: NextRequest) {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const query = `CALL db.labels()`;
    const result = await session.run(query);

    const labels = result.records.map((record) => record.get(0));

    return NextResponse.json({
      labels,
    });
  } catch (error: any) {
    console.error("查询标签失败:", error);
    return NextResponse.json(
      { error: error.message || "查询标签失败" },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

