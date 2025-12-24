/**
 * 配置管理
 * 读取和校验环境变量
 */

import { Config } from "./types";

/**
 * 获取环境变量，如果不存在则抛出错误
 */
function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少必需的环境变量: ${name}，请检查 .env 文件配置`);
  }
  return value;
}

/**
 * 获取环境变量，如果不存在则返回默认值
 */
function getEnvVarWithDefault(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

/**
 * 获取数字类型的环境变量
 */
function getEnvNumber(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`环境变量 ${name} 必须是有效的数字，当前值: ${value}`);
  }
  return parsed;
}

/**
 * 加载并验证配置
 */
export function loadConfig(): Config {
  return {
    neo4j: {
      uri: getEnvVarWithDefault("NEO4J_URI", "bolt://localhost:7687"),
      user: getEnvVarWithDefault("NEO4J_USER", "neo4j"),
      password: getEnvVar("NEO4J_PASSWORD"),
    },
    llm: {
      baseUrl: getEnvVarWithDefault(
        "LLM_BASE_URL",
        "https://dashscope.aliyuncs.com/compatible-mode/v1"
      ),
      apiKey: getEnvVar("LLM_API_KEY"),
      model: getEnvVarWithDefault("LLM_MODEL", "qwen-turbo"),
      // 快速模型用于生成查询计划
      planModel: getEnvVarWithDefault("LLM_PLAN_MODEL", "qwen-flash"),
      // 智能模型用于生成答案
      answerModel: getEnvVarWithDefault("LLM_ANSWER_MODEL", "qwen-plus"),
    },
    nlq: {
      maxRows: getEnvNumber("NLQ_MAX_ROWS", 50),
      maxNodes: getEnvNumber("NLQ_MAX_NODES", 80),
      maxEdges: getEnvNumber("NLQ_MAX_EDGES", 120),
    },
  };
}

/**
 * 单例配置实例
 */
let configInstance: Config | null = null;

/**
 * 获取配置实例（单例模式）
 */
export function getConfig(): Config {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

/**
 * 验证配置是否完整
 */
export function validateConfig(config: Config): void {
  const errors: string[] = [];

  if (!config.neo4j.uri) errors.push("Neo4j URI 未配置");
  if (!config.neo4j.user) errors.push("Neo4j 用户名未配置");
  if (!config.neo4j.password) errors.push("Neo4j 密码未配置");
  
  if (!config.llm.baseUrl) errors.push("LLM Base URL 未配置");
  if (!config.llm.apiKey) errors.push("LLM API Key 未配置");
  if (!config.llm.model) errors.push("LLM 模型未配置");
  if (!config.llm.planModel) errors.push("LLM 计划模型未配置");
  if (!config.llm.answerModel) errors.push("LLM 答案模型未配置");

  if (config.nlq.maxRows <= 0) errors.push("NLQ_MAX_ROWS 必须大于 0");
  if (config.nlq.maxNodes <= 0) errors.push("NLQ_MAX_NODES 必须大于 0");
  if (config.nlq.maxEdges <= 0) errors.push("NLQ_MAX_EDGES 必须大于 0");

  if (errors.length > 0) {
    throw new Error(`配置验证失败:\n${errors.join("\n")}`);
  }
}

