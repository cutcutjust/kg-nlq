/**
 * Neo4j GraphQL Context
 * 创建和管理 Neo4j driver 连接
 */

import neo4j, { Driver } from "neo4j-driver";
import { getConfig } from "@/lib/config";

let driver: Driver | null = null;

/**
 * 获取 Neo4j Driver 实例（单例）
 */
export function getNeo4jDriver(): Driver {
  if (!driver) {
    const config = getConfig();
    
    driver = neo4j.driver(
      config.neo4j.uri,
      neo4j.auth.basic(config.neo4j.user, config.neo4j.password),
      {
        maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
      }
    );

    // 验证连接
    driver
      .verifyConnectivity()
      .then(() => {
        console.log("✓ Neo4j 连接成功");
      })
      .catch((error) => {
        console.error("✗ Neo4j 连接失败:", error);
      });
  }
  
  return driver;
}

/**
 * 关闭 Neo4j Driver 连接
 */
export async function closeNeo4jDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
    console.log("Neo4j 连接已关闭");
  }
}

/**
 * 创建 GraphQL Context
 */
export interface Neo4jContext {
  driver: Driver;
  driverConfig: {
    database?: string;
  };
}

export function createContext(): Neo4jContext {
  return {
    driver: getNeo4jDriver(),
    driverConfig: {
      database: process.env.NEO4J_DATABASE || "neo4j",
    },
  };
}

