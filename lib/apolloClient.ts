/**
 * Apollo Client 配置
 * 用于前端 GraphQL 查询
 */

import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

/**
 * 创建 Apollo Client 实例
 */
export function createApolloClient() {
  return new ApolloClient({
    link: new HttpLink({
      uri: "/api/graphql",
      credentials: "same-origin",
    }),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "network-only",
      },
      query: {
        fetchPolicy: "network-only",
      },
    },
  });
}

/**
 * 单例 Apollo Client
 */
let apolloClient: ApolloClient<any> | null = null;

/**
 * 获取 Apollo Client 实例（单例）
 */
export function getApolloClient() {
  if (!apolloClient) {
    apolloClient = createApolloClient();
  }
  return apolloClient;
}

