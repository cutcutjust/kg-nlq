/**
 * 核心类型定义
 * 前后端共享的数据契约
 */

/** 查询意图类型 */
export type QueryIntent = "qa" | "browse";

/** 查询语言类型 */
export type QueryLanguage = "graphql";

/** 回答风格 */
export interface AnswerStyle {
  tone: "concise" | "normal";
  includeEvidence: boolean;
}

/** 查询计划（LLM第一阶段输出） */
export interface QueryPlan {
  intent: QueryIntent;
  query_language: QueryLanguage;
  query: string;
  variables: Record<string, any>;
  safety: {
    maxRows: number;
  };
  answer_style: AnswerStyle;
}

/** 自然语言查询请求 */
export interface NLQRequest {
  question: string;
  mode: QueryIntent;
  context?: {
    focusNodeId?: string;
  };
}

/** 证据项 */
export interface EvidenceItem {
  text: string;
  nodeIds: string[];
  edgeIds: string[];
}

/** 图节点 */
export interface GraphNode {
  id: string;
  label: string;
  type: string;
  properties: Record<string, any>;
}

/** 图边 */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
}

/** 图数据结构 */
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** 自然语言查询响应 */
export interface NLQResponse {
  plan: QueryPlan;
  answer: string;
  evidence: EvidenceItem[];
  graph?: GraphData;
  warnings?: string[];
  queryResult?: any; // 原始查询结果
}

/** 配置类型 */
export interface Config {
  neo4j: {
    uri: string;
    user: string;
    password: string;
  };
  llm: {
    baseUrl: string;
    apiKey: string;
    model: string;
    planModel: string; // 快速模型用于生成查询计划
    answerModel: string; // 智能模型用于生成答案
  };
  nlq: {
    maxRows: number;
    maxNodes: number;
    maxEdges: number;
  };
}

/** LLM 聊天消息 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** LLM 响应 */
export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** 高亮信息 */
export interface HighlightInfo {
  nodeIds: string[];
  edgeIds: string[];
}

/** 聊天历史项 */
export interface ChatHistoryItem {
  id: string;
  question: string;
  response: NLQResponse;
  timestamp: number;
}

