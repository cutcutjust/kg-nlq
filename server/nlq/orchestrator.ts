/**
 * NLQ 编排层
 * 协调整个自然语言查询流程：LLM -> QueryPlan -> Execute -> Answer
 */

import { NLQRequest, NLQResponse, QueryPlan } from "@/lib/types";
import { getDefaultLLMClient, LLMClient } from "../llm/client";
import { executeGraphQL } from "../graphql/server";
import { getConfig } from "@/lib/config";
import { getSchemaDigest } from "./schemaDigest";
import { getPlanPrompt, getAnswerPrompt, getFixPrompt } from "./prompts";
import {
  validateQueryPlan,
  validateUserInput,
  sanitizeQueryPlan,
} from "./validators";
import {
  extractGraphFromResult,
  trimGraph,
  generateEvidence,
  trimQueryResult,
} from "./postprocess";
import { extractJsonFromText, isValidJson } from "@/lib/utils";

/**
 * 阶段 1 的响应类型（仅包含查询结果）
 */
export interface Stage1Response {
  plan: QueryPlan;
  queryResult: any;
  graph?: any;
  evidence: any[];
  warnings?: string[];
}

/**
 * 主编排函数（完整流程）
 */
export async function processNLQ(request: NLQRequest): Promise<NLQResponse> {
  const warnings: string[] = [];

  // 1. 验证用户输入
  const inputValidation = validateUserInput(request.question);
  if (!inputValidation.valid) {
    throw new Error(`输入验证失败: ${inputValidation.errors.join(", ")}`);
  }
  warnings.push(...inputValidation.warnings);

  // 2. 生成查询计划
  console.log('\n🔍 步骤 1: 生成查询计划');
  console.log('用户问题:', request.question);
  console.log('查询模式:', request.mode);
  
  const { plan, planWarnings } = await generateQueryPlan(request);
  warnings.push(...planWarnings);
  
  console.log('✅ 查询计划生成完成');
  console.log('GraphQL 查询:', plan.query.substring(0, 200) + '...');
  console.log('查询变量:', JSON.stringify(plan.variables, null, 2));

  // 3. 执行查询
  console.log('\n🔍 步骤 2: 执行 GraphQL 查询');
  
  let queryResult: any;
  try {
    queryResult = await executeGraphQL(plan.query, plan.variables);
    console.log('✅ GraphQL 查询执行完成');
  } catch (error: any) {
    console.error('❌ GraphQL 查询失败:', error.message);
    throw new Error(`查询执行失败: ${error.message}`);
  }

  // 4. 后处理结果（增加深度以包含更多关联信息）
  console.log('\n🔍 步骤 3: 后处理查询结果');
  
  const trimmedResult = trimQueryResult(queryResult, 5);
  
  console.log('📊 查询结果统计:');
  console.log('  - 药品数量:', Array.isArray(queryResult.medicines) ? queryResult.medicines.length : 0);
  console.log('  - 有引用关系:', queryResult.medicines?.[0]?.refersTo ? 'yes' : 'no');
  console.log('  - 有同类关系:', queryResult.medicines?.[0]?.relatedByCategory ? 'yes' : 'no');
  
  if (queryResult.medicines && queryResult.medicines.length > 0) {
    const firstMedicine = queryResult.medicines[0];
    console.log('  - 第一个药品:', firstMedicine.name);
    if (firstMedicine.refersTo) {
      console.log('    - 引用通则数:', firstMedicine.refersTo.length);
    }
    if (firstMedicine.relatedByCategory) {
      console.log('    - 同类药品数:', firstMedicine.relatedByCategory.length);
    }
  }
  
  console.log('✅ 结果后处理完成');

  // 5. 提取图数据（两个模式都返回图数据）
  const rawGraph = extractGraphFromResult(trimmedResult);
  const graph = trimGraph(rawGraph);

  // 6. 生成证据
  const evidence = generateEvidence(trimmedResult, rawGraph);

  // 7. 生成自然语言答案
  console.log('\n🔍 步骤 4: 生成自然语言答案');
  console.log('传递给 LLM 的数据大小:', JSON.stringify(trimmedResult).length, '字符');
  
  const answer = await generateAnswer(request.question, plan, trimmedResult);
  
  console.log('✅ 答案生成完成');
  console.log('答案长度:', answer.answer.length, '字符');
  console.log('证据数量:', answer.evidence.length);

  return {
    plan,
    answer: answer.answer,
    evidence: answer.evidence.length > 0 ? answer.evidence : evidence,
    graph,
    warnings: warnings.length > 0 ? warnings : undefined,
    queryResult: queryResult, // 返回原始查询结果
  };
}

/**
 * 阶段 1: 快速返回查询结果（不生成 LLM 答案）
 */
export async function processNLQStage1(request: NLQRequest): Promise<Stage1Response> {
  const warnings: string[] = [];

  // 1. 验证用户输入
  const inputValidation = validateUserInput(request.question);
  if (!inputValidation.valid) {
    throw new Error(`输入验证失败: ${inputValidation.errors.join(", ")}`);
  }
  warnings.push(...inputValidation.warnings);

  // 2. 生成查询计划（使用快速模型）
  console.log('\n🔍 阶段 1 - 步骤 1: 生成查询计划');
  console.log('用户问题:', request.question);
  
  const { plan, planWarnings } = await generateQueryPlan(request);
  warnings.push(...planWarnings);
  
  console.log('✅ 查询计划生成完成');

  // 3. 执行查询
  console.log('\n🔍 阶段 1 - 步骤 2: 执行 GraphQL 查询');
  
  let queryResult: any;
  try {
    queryResult = await executeGraphQL(plan.query, plan.variables);
    console.log('✅ GraphQL 查询执行完成');
  } catch (error: any) {
    console.error('❌ GraphQL 查询失败:', error.message);
    throw new Error(`查询执行失败: ${error.message}`);
  }

  // 4. 后处理结果
  const trimmedResult = trimQueryResult(queryResult, 5);
  let graph = extractGraphFromResult(trimmedResult);
  const evidence = generateEvidence(trimmedResult, graph);
  
  if (graph.nodes.length > 80 || graph.edges.length > 120) {
    graph = trimGraph(graph);
  }

  console.log('✅ 阶段 1 完成：查询结果已准备好');

  return {
    plan,
    queryResult,
    graph,
    evidence,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * 阶段 2: 生成智能答案（基于已有的查询结果）
 */
export async function processNLQStage2(
  question: string,
  plan: QueryPlan,
  queryResult: any
): Promise<{ answer: string; evidence: any[] }> {
  console.log('\n🔍 阶段 2: 生成智能答案');
  
  const trimmedResult = trimQueryResult(queryResult, 5);
  
  const dataSize = JSON.stringify({ question, plan, trimmedResult }).length;
  console.log(`传递给 LLM 的数据大小: ${dataSize} 字符`);
  
  const answer = await generateAnswer(question, plan, trimmedResult);
  
  console.log('✅ 阶段 2 完成：智能答案已生成');
  
  return answer;
}

/**
 * 主编排函数（完整流程，用于向后兼容）
 */
async function generateQueryPlan(
  request: NLQRequest
): Promise<{ plan: QueryPlan; planWarnings: string[] }> {
  const config = getConfig();
  
  // 使用快速模型生成查询计划
  const planLLM = new LLMClient({
    baseUrl: config.llm.baseUrl,
    apiKey: config.llm.apiKey,
    model: config.llm.planModel, // qwen-flash
    temperature: 0.1, // 低温度，更确定性
    maxTokens: 2000,
  });
  
  console.log(`📤 使用快速模型生成查询计划: ${config.llm.planModel}`);
  
  const schemaDigest = getSchemaDigest();
  const warnings: string[] = [];

  // 构建提示词
  const prompt = getPlanPrompt(schemaDigest, request.question, request.mode);

  // 调用 LLM
  let response;
  try {
    response = await planLLM.generateWithRetry(prompt, undefined, 1);
  } catch (error: any) {
    throw new Error(`LLM 调用失败 (${config.llm.planModel}): ${error.message}`);
  }

  // 提取 JSON
  const jsonText = extractJsonFromText(response.content);
  
  if (!isValidJson(jsonText)) {
    // 尝试修复
    console.warn("LLM 返回的不是有效的 JSON，尝试修复...");
    const fixedPlan = await fixQueryPlan(response.content, "返回的不是有效的 JSON", schemaDigest);
    return { plan: fixedPlan, planWarnings: ["LLM 返回格式不正确，已自动修复"] };
  }

  const rawPlan = JSON.parse(jsonText);

  // 验证查询计划
  const validation = validateQueryPlan(rawPlan);
  
  if (!validation.valid) {
    console.warn("查询计划验证失败:", validation.errors);
    
    // 尝试修复一次
    try {
      const fixedPlan = await fixQueryPlan(
        JSON.stringify(rawPlan, null, 2),
        validation.errors.join("; "),
        schemaDigest
      );
      warnings.push("查询计划已自动修复");
      return { plan: fixedPlan, planWarnings: warnings };
    } catch (error) {
      throw new Error(
        `查询计划验证失败且无法修复: ${validation.errors.join(", ")}`
      );
    }
  }

  warnings.push(...validation.warnings);

  // 清理和规范化
  const plan = sanitizeQueryPlan(rawPlan);

  return { plan, planWarnings: warnings };
}

/**
 * 修复查询计划
 */
async function fixQueryPlan(
  originalPlan: string,
  error: string,
  schemaDigest: string
): Promise<QueryPlan> {
  const llmClient = getDefaultLLMClient();
  const prompt = getFixPrompt(originalPlan, error, schemaDigest);

  const response = await llmClient.generate(prompt);
  const jsonText = extractJsonFromText(response.content);

  if (!isValidJson(jsonText)) {
    throw new Error("修复后的查询计划仍然不是有效的 JSON");
  }

  const fixedPlan = JSON.parse(jsonText);
  
  // 再次验证
  const validation = validateQueryPlan(fixedPlan);
  if (!validation.valid) {
    throw new Error(`修复失败: ${validation.errors.join(", ")}`);
  }

  return sanitizeQueryPlan(fixedPlan);
}

/**
 * 阶段 2: 生成自然语言答案（使用智能模型）
 */
async function generateAnswer(
  question: string,
  plan: QueryPlan,
  queryResult: any
): Promise<{ answer: string; evidence: any[] }> {
  const config = getConfig();
  
  // 使用智能模型生成答案
  const answerLLM = new LLMClient({
    baseUrl: config.llm.baseUrl,
    apiKey: config.llm.apiKey,
    model: config.llm.answerModel, // qwen-plus
    temperature: 0.3, // 适中温度，平衡创造性和准确性
    maxTokens: 4000,
  });
  
  console.log(`📤 使用智能模型生成答案: ${config.llm.answerModel}`);

  // 构建提示词
  const prompt = getAnswerPrompt(question, plan, queryResult);

  // 调用 LLM
  let response;
  try {
    response = await answerLLM.generateWithRetry(prompt, undefined, 1);
  } catch (error: any) {
    // 如果 LLM 调用失败，返回降级答案
    console.error("生成答案失败:", error);
    return {
      answer: "抱歉，在生成答案时遇到了问题。不过我已成功查询到相关数据，请查看下方的证据列表。",
      evidence: [],
    };
  }

  // 提取 JSON
  const jsonText = extractJsonFromText(response.content);

  if (!isValidJson(jsonText)) {
    // 降级：直接使用 LLM 的文本输出
    return {
      answer: response.content,
      evidence: [],
    };
  }

  try {
    const result = JSON.parse(jsonText);
    return {
      answer: result.answer || "未能生成答案",
      evidence: result.evidence || [],
    };
  } catch {
    return {
      answer: response.content,
      evidence: [],
    };
  }
}

