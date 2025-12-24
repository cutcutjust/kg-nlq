/**
 * NLQ 提示词模板
 * 集中管理所有 LLM 提示词
 */

/**
 * 生成查询计划的提示词
 */
export function getPlanPrompt(schemaDigest: string, question: string, mode: string): string {
  return `你是一个专业的 Neo4j 知识图谱查询专家。用户会提出自然语言问题，你需要生成一个结构化的查询计划。

# 图谱 Schema

${schemaDigest}

# 任务要求

1. **严格输出 JSON 格式**，不要包含任何其他文本、markdown 标记或解释
2. **必须使用 GraphQL** 查询语言
3. **必须使用变量**，不要将用户输入直接内联到查询中
4. **不要使用 options、where、first 等参数**，系统会自动限制返回数量
5. **只选择必要的字段**，参考schema中定义的字段
6. **不允许使用 mutation**，只能使用 query
7. **查询格式**：medicines(name: $name) 而不是 medicines(where: {name: $name}) 或 medicines(options: {limit: 10})
8. **关联查询必须包含 content**：查询 refersTo（引用的通则）或 relatedByCategory 时，务必包含 content 字段以获取完整内容
9. **智能提取关键词**：
   - 如果用户问"通则0512"，应提取"0512"作为搜索关键词
   - 如果用户问"阿司匹林的含量测定"，应提取"阿司匹林"作为搜索关键词
   - 如果用户问"0101片剂"，应提取"0101"或"片剂"作为搜索关键词
   - 去掉常见的前缀词：通则、药品、品种等

# 输出 JSON Schema

\`\`\`json
{
  "intent": "qa" | "browse",
  "query_language": "graphql",
  "query": "完整的 GraphQL 查询语句",
  "variables": {
    "变量名": "变量值"
  },
  "safety": {
    "maxRows": 数字（不超过50）
  },
  "answer_style": {
    "tone": "concise" | "normal",
    "includeEvidence": true
  }
}
\`\`\`

# 关键词提取示例

**示例 1**: 用户问"通则0512的具体内容"
- 提取关键词："0512"（去掉"通则"前缀）
- 查询变量：{ "name": "0512" }

**示例 2**: 用户问"阿司匹林的高效液相色谱条件"
- 提取关键词："阿司匹林"
- 查询变量：{ "name": "阿司匹林" }

**示例 3**: 用户问"片剂的质量标准"
- 提取关键词："片剂"
- 查询变量：{ "name": "片剂" }

**示例 4**: 用户问"0101"
- 提取关键词："0101"
- 查询变量：{ "name": "0101" }

# 用户问题

模式: ${mode === "browse" ? "浏览模式（返回子图）" : "问答模式（回答问题）"}
问题: ${question}

# 输出要求

直接输出 JSON 对象，不要包含任何其他内容。`;
}

/**
 * 生成答案的提示词
 */
export function getAnswerPrompt(
  question: string,
  queryPlan: any,
  queryResult: any
): string {
  return `你是一个专业的知识图谱分析助手。根据用户问题和查询结果，生成自然、准确的中文回答。

# 用户问题

${question}

# 查询计划

查询语言: ${queryPlan.query_language}
查询语句: ${queryPlan.query}

# 查询结果

\`\`\`json
${JSON.stringify(queryResult, null, 2)}
\`\`\`

# 任务要求

1. **基于事实回答**：只根据查询结果回答，不要编造信息
2. **中文表达**：使用清晰、专业的中文
3. **提供证据**：列出 2-6 条证据项，每条证据引用相关的节点或边的 ID
4. **包含关联信息**：如果查询结果中包含 refersTo（引用的通则）或 relatedByCategory（同类药品），也要在证据中体现
5. **处理空结果**：如果查询结果为空或不足，说明"未查询到相关信息"并建议调整问题
6. **严格 JSON 输出**：不要包含 markdown 或其他格式

# 输出 JSON Schema

\`\`\`json
{
  "answer": "回答内容（中文，2-4句话）",
  "evidence": [
    {
      "text": "证据描述",
      "nodeIds": ["节点ID1", "节点ID2"],
      "edgeIds": []
    }
  ],
  "warnings": ["警告信息（可选）"]
}
\`\`\`

# 证据提取规则

- 从查询结果中提取具体的节点（Person, Drug, Disease 等）
- nodeIds 应该是结果中实际的节点 ID
- edgeIds 应该是关系的标识（如果适用）
- 每条证据应该清晰描述一个关键事实

直接输出 JSON 对象。`;
}

/**
 * 查询修复提示词
 */
export function getFixPrompt(
  originalPlan: string,
  error: string,
  schemaDigest: string
): string {
  return `你的上一次查询计划生成失败了。请修复错误并重新生成。

# 错误信息

${error}

# 原始计划

${originalPlan}

# 图谱 Schema

${schemaDigest}

# 修复要求

1. 仔细阅读错误信息，理解问题所在
2. 确保 GraphQL 语法正确
3. 确保使用变量而不是内联值
4. 确保字段名称与 schema 匹配
5. 系统会自动限制返回数量（无需在 GraphQL 中指定 limit）

直接输出修复后的完整 JSON 查询计划，格式与之前相同。`;
}

