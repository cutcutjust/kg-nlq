/**
 * 查询计划验证器
 * 确保 LLM 生成的查询计划安全且有效
 */

import { QueryPlan } from "@/lib/types";
import { getConfig } from "@/lib/config";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 验证查询计划
 */
export function validateQueryPlan(plan: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 检查必需字段
  if (!plan.intent) {
    errors.push("缺少 intent 字段");
  } else if (!["qa", "browse"].includes(plan.intent)) {
    errors.push(`无效的 intent: ${plan.intent}，必须是 "qa" 或 "browse"`);
  }

  if (!plan.query_language) {
    errors.push("缺少 query_language 字段");
  } else if (plan.query_language !== "graphql") {
    errors.push(`当前只支持 GraphQL，不支持: ${plan.query_language}`);
  }

  if (!plan.query) {
    errors.push("缺少 query 字段");
  }

  if (!plan.variables) {
    warnings.push("缺少 variables 字段（建议使用变量化查询）");
  }

  if (!plan.safety || typeof plan.safety.maxRows !== "number") {
    errors.push("缺少或无效的 safety.maxRows 字段");
  }

  // 验证 query 内容
  if (plan.query) {
    const queryLower = plan.query.toLowerCase();
    
    // 禁止 mutation
    if (queryLower.includes("mutation")) {
      errors.push("查询中不允许包含 mutation 操作");
    }

    // 检查是否以 query 开头
    if (!queryLower.trim().startsWith("query")) {
      errors.push("GraphQL 查询必须以 'query' 关键字开头");
    }

    // 检查危险操作
    const dangerousPatterns = ["__schema", "__type", "delete", "drop", "remove"];
    for (const pattern of dangerousPatterns) {
      if (queryLower.includes(pattern)) {
        warnings.push(`查询中包含可能的危险模式: ${pattern}`);
      }
    }

    // 系统会自动限制返回数量（在 Neo4j 查询中 LIMIT 20）
    // 不再需要在 GraphQL 中检查 limit
  }

  // 验证 maxRows 限制
  const config = getConfig();
  if (plan.safety && plan.safety.maxRows > config.nlq.maxRows) {
    errors.push(
      `maxRows (${plan.safety.maxRows}) 超过系统限制 (${config.nlq.maxRows})`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 验证查询结果
 */
export function validateQueryResult(result: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (result === null || result === undefined) {
    errors.push("查询结果为空");
  }

  if (typeof result !== "object") {
    errors.push("查询结果不是有效的对象");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 清理和规范化查询计划
 */
export function sanitizeQueryPlan(plan: any): QueryPlan {
  const config = getConfig();
  
  return {
    intent: plan.intent || "qa",
    query_language: "graphql",
    query: plan.query || "",
    variables: plan.variables || {},
    safety: {
      maxRows: Math.min(plan.safety?.maxRows || 20, config.nlq.maxRows),
    },
    answer_style: {
      tone: plan.answer_style?.tone || "normal",
      includeEvidence: plan.answer_style?.includeEvidence !== false,
    },
  };
}

/**
 * 验证用户输入
 */
export function validateUserInput(question: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!question || question.trim().length === 0) {
    errors.push("问题不能为空");
  }

  if (question.length > 1000) {
    errors.push("问题长度不能超过 1000 个字符");
  }

  if (question.length < 3) {
    warnings.push("问题过短，建议提供更详细的描述");
  }

  // 检测可能的注入攻击
  const suspiciousPatterns = [
    /\bDROP\b/i,
    /\bDELETE\b/i,
    /\bREMOVE\b/i,
    /<script/i,
    /javascript:/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(question)) {
      warnings.push("检测到可疑输入模式，已标记");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

