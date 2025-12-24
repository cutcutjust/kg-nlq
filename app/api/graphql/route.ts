/**
 * GraphQL API Route
 * 使用 Apollo Server 处理 GraphQL 请求
 */

import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest } from "next/server";
import { getApolloServer } from "@/server/graphql/server";
import { createContext } from "@/server/graphql/context";

/**
 * 创建 Next.js Handler
 */
let handler: any = null;

async function getHandler() {
  if (!handler) {
    const server = await getApolloServer();
    handler = startServerAndCreateNextHandler(server, {
      context: createContext,
    });
  }
  return handler;
}

/**
 * GET /api/graphql
 * 支持 GraphQL Playground（开发环境）
 */
export async function GET(request: NextRequest) {
  const h = await getHandler();
  return h(request);
}

/**
 * POST /api/graphql
 * 处理 GraphQL 查询
 */
export async function POST(request: NextRequest) {
  const h = await getHandler();
  return h(request);
}

