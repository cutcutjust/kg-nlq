/**
 * Apollo Server 配置
 * 为 Next.js API Route 提供 GraphQL 服务
 */

import { ApolloServer } from "@apollo/server";
import { simpleSchema } from "./schema-simple";
import { createContext, Neo4jContext } from "./context";

let apolloServer: ApolloServer<Neo4jContext> | null = null;

/**
 * 创建 Apollo Server 实例（单例）
 */
export async function getApolloServer(): Promise<ApolloServer<Neo4jContext>> {
  if (!apolloServer) {
    const schema = simpleSchema;
    
    apolloServer = new ApolloServer<Neo4jContext>({
      schema,
      introspection: true, // 允许内省（开发环境）
      includeStacktraceInErrorResponses: process.env.NODE_ENV === "development",
    });

    await apolloServer.start();
    console.log("✓ Apollo Server 已启动");
  }
  
  return apolloServer;
}

/**
 * 执行 GraphQL 查询
 */
export async function executeGraphQL(
  query: string,
  variables?: Record<string, any>
): Promise<any> {
  const server = await getApolloServer();
  const context = createContext();
  
  const result = await server.executeOperation(
    {
      query,
      variables,
    },
    {
      contextValue: context,
    }
  );

  if (result.body.kind === "single") {
    if (result.body.singleResult.errors) {
      throw new Error(
        `GraphQL 执行错误: ${JSON.stringify(result.body.singleResult.errors)}`
      );
    }
    return result.body.singleResult.data;
  }
  
  throw new Error("不支持的 GraphQL 响应类型");
}

