# 项目结构详解

## 完整目录树

```
kg-nlq/
├── 📁 app/                          # Next.js App Router
│   ├── 📄 layout.tsx               # 根布局组件
│   ├── 📄 page.tsx                 # 主页面（整合所有功能）
│   ├── 📄 globals.css              # 全局样式
│   └── 📁 api/                     # API 路由
│       ├── 📁 nlq/
│       │   └── 📄 route.ts         # 自然语言查询 API 端点
│       └── 📁 graphql/
│           └── 📄 route.ts         # GraphQL API 端点（Apollo Server）
│
├── 📁 components/                   # React 组件
│   ├── 📁 ui/                      # shadcn/ui 基础组件
│   │   ├── 📄 button.tsx
│   │   ├── 📄 card.tsx
│   │   ├── 📄 input.tsx
│   │   ├── 📄 select.tsx
│   │   └── 📄 accordion.tsx
│   ├── 📄 Topbar.tsx               # 顶部导航栏
│   ├── 📄 ChatPanel.tsx            # 左侧聊天面板（输入+历史）
│   ├── 📄 AnswerPanel.tsx          # 右上答案展示面板
│   ├── 📄 EvidenceList.tsx         # 证据列表（可点击高亮）
│   └── 📄 GraphCanvas.tsx          # 图可视化画布（Cytoscape.js）
│
├── 📁 lib/                          # 工具库和共享代码
│   ├── 📄 types.ts                 # TypeScript 类型定义（前后端共享）
│   ├── 📄 config.ts                # 配置管理（环境变量加载）
│   ├── 📄 utils.ts                 # 工具函数（cn, generateId 等）
│   └── 📄 apolloClient.ts          # Apollo Client 配置（前端 GraphQL）
│
├── 📁 server/                       # 服务端逻辑
│   ├── 📁 graphql/                 # GraphQL 服务
│   │   ├── 📄 schema.ts            # Neo4j GraphQL Schema 定义
│   │   ├── 📄 server.ts            # Apollo Server 创建和管理
│   │   └── 📄 context.ts           # Neo4j Driver 连接管理
│   │
│   ├── 📁 nlq/                     # 自然语言查询编排层
│   │   ├── 📄 orchestrator.ts     # 主编排逻辑（两段式流程）
│   │   ├── 📄 prompts.ts           # LLM 提示词模板
│   │   ├── 📄 validators.ts        # 查询计划验证器
│   │   ├── 📄 schemaDigest.ts     # Schema 摘要生成
│   │   └── 📄 postprocess.ts       # 结果后处理（提取图、生成证据）
│   │
│   └── 📁 llm/                     # LLM 客户端
│       └── 📄 client.ts            # 通义千问客户端（兼容 OpenAI API）
│
├── 📁 scripts/                      # 脚本和工具
│   ├── 📄 sample-data.cypher       # Neo4j 示例数据
│   └── 📄 setup.md                 # 设置指南
│
├── 📁 styles/                       # 样式文件（如果需要）
│
├── 📄 package.json                  # 项目依赖和脚本
├── 📄 tsconfig.json                 # TypeScript 配置
├── 📄 tailwind.config.ts            # Tailwind CSS 配置
├── 📄 postcss.config.js             # PostCSS 配置
├── 📄 next.config.js                # Next.js 配置
├── 📄 .gitignore                    # Git 忽略文件
├── 📄 env.example                   # 环境变量模板
├── 📄 README.md                     # 完整文档
├── 📄 QUICKSTART.md                 # 快速启动指南
└── 📄 PROJECT_STRUCTURE.md          # 本文件
```

## 核心模块说明

### 1. 前端层（app/ + components/）

#### 主页面 (`app/page.tsx`)
- **职责**：整合所有组件，管理全局状态
- **状态管理**：
  - `response`: 当前查询响应
  - `isLoading`: 加载状态
  - `highlight`: 图高亮信息
  - `history`: 查询历史记录
  - `error`: 错误信息
- **交互流程**：
  1. 用户提交问题 → `handleSubmit`
  2. 调用 `/api/nlq` API
  3. 更新响应和历史记录
  4. 点击证据 → 高亮图元素
  5. 点击节点 → 可触发新查询

#### 组件说明

| 组件 | 功能 | 主要 Props |
|------|------|-----------|
| `ChatPanel` | 问题输入、模式切换、历史记录 | `onSubmit`, `isLoading`, `history` |
| `AnswerPanel` | 显示答案、警告、调试信息 | `response` |
| `EvidenceList` | 证据列表，点击高亮 | `evidence`, `onEvidenceClick` |
| `GraphCanvas` | Cytoscape.js 图可视化 | `graph`, `highlight`, `onNodeClick` |

### 2. API 层（app/api/）

#### NLQ API (`app/api/nlq/route.ts`)
- **端点**：`POST /api/nlq`
- **输入**：`{ question: string, mode: "qa" | "browse", context?: {...} }`
- **输出**：`NLQResponse`
- **流程**：
  1. 验证请求格式
  2. 调用 `processNLQ` 编排函数
  3. 返回结构化响应

#### GraphQL API (`app/api/graphql/route.ts`)
- **端点**：`POST /api/graphql`
- **职责**：Apollo Server 集成
- **功能**：
  - 提供 GraphQL Playground（开发环境）
  - 处理 GraphQL 查询
  - 自动连接 Neo4j

### 3. 服务端核心逻辑（server/）

#### NLQ 编排层 (`server/nlq/orchestrator.ts`)

**两段式处理流程**：

```
阶段 1: 生成查询计划
  ├─ 获取 schema digest
  ├─ 构建提示词
  ├─ 调用 LLM 生成 QueryPlan
  ├─ 提取和验证 JSON
  └─ 必要时自动修复

阶段 2: 执行查询 + 生成答案
  ├─ 执行 GraphQL 查询
  ├─ 后处理结果
  ├─ 提取图数据（browse 模式）
  ├─ 生成证据项
  ├─ 调用 LLM 生成自然语言答案
  └─ 返回完整响应
```

#### 关键模块

| 模块 | 文件 | 功能 |
|------|------|------|
| **提示词管理** | `prompts.ts` | 查询计划生成提示词、答案生成提示词、修复提示词 |
| **验证器** | `validators.ts` | 验证查询计划、用户输入、查询结果 |
| **Schema 摘要** | `schemaDigest.ts` | 为 LLM 提供简化的 schema 描述 |
| **后处理器** | `postprocess.ts` | 提取节点/边、生成证据、裁剪结果 |

#### GraphQL 服务 (`server/graphql/`)

- **`schema.ts`**：定义 Neo4j GraphQL TypeDefs
- **`server.ts`**：创建 Apollo Server，执行查询
- **`context.ts`**：管理 Neo4j Driver 连接（单例）

#### LLM 客户端 (`server/llm/client.ts`)

- **兼容性**：支持 OpenAI API 格式
- **功能**：
  - `chat()`: 多轮对话
  - `generate()`: 单次生成
  - `generateWithRetry()`: 带重试的生成
- **配置**：
  - baseUrl、apiKey、model
  - temperature、maxTokens、timeout

### 4. 共享类型（lib/types.ts）

#### 核心类型

```typescript
QueryIntent = "qa" | "browse"

QueryPlan {
  intent: QueryIntent
  query_language: "graphql"
  query: string
  variables: Record<string, any>
  safety: { maxRows: number }
  answer_style: { tone, includeEvidence }
}

NLQRequest {
  question: string
  mode: QueryIntent
  context?: { focusNodeId?: string }
}

NLQResponse {
  plan: QueryPlan
  answer: string
  evidence: EvidenceItem[]
  graph?: GraphData
  warnings?: string[]
}
```

### 5. 配置管理（lib/config.ts）

**环境变量**：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `NEO4J_URI` | `bolt://localhost:7687` | Neo4j 连接地址 |
| `NEO4J_USER` | `neo4j` | Neo4j 用户名 |
| `NEO4J_PASSWORD` | *必需* | Neo4j 密码 |
| `LLM_BASE_URL` | 通义千问地址 | LLM API 基础 URL |
| `LLM_API_KEY` | *必需* | LLM API Key |
| `LLM_MODEL` | `qwen-turbo` | LLM 模型名称 |
| `NLQ_MAX_ROWS` | `50` | 最大返回行数 |
| `NLQ_MAX_NODES` | `80` | 最大显示节点数 |
| `NLQ_MAX_EDGES` | `120` | 最大显示边数 |

## 数据流

### 查询流程

```
用户输入问题
    ↓
ChatPanel (提交)
    ↓
page.tsx (handleSubmit)
    ↓
POST /api/nlq
    ↓
server/nlq/orchestrator.ts (processNLQ)
    ├─ 生成 QueryPlan (LLM)
    ├─ 验证计划 (validators)
    ├─ 执行 GraphQL (Apollo Server)
    ├─ 提取图数据 (postprocess)
    ├─ 生成答案 (LLM)
    └─ 返回 NLQResponse
    ↓
page.tsx (更新状态)
    ↓
AnswerPanel + EvidenceList + GraphCanvas
```

### 高亮流程

```
用户点击证据项
    ↓
EvidenceList (onEvidenceClick)
    ↓
page.tsx (handleEvidenceClick)
    ↓
更新 highlight 状态
    ↓
GraphCanvas (useEffect[highlight])
    ↓
Cytoscape 高亮节点/边
```

## 扩展点

### 1. 添加新的节点类型

编辑 `server/graphql/schema.ts`：

```typescript
type NewNodeType {
  id: ID! @id
  name: String!
  // 添加字段
}
```

更新 `schemaDigest.ts` 和 `postprocess.ts`

### 2. 自定义提示词

编辑 `server/nlq/prompts.ts`，调整：
- `getPlanPrompt()`: 查询计划生成
- `getAnswerPrompt()`: 答案生成

### 3. 修改图样式

编辑 `components/GraphCanvas.tsx`，调整 Cytoscape 样式：

```typescript
style: [
  {
    selector: 'node[type="YourType"]',
    style: {
      'background-color': '#your-color'
    }
  }
]
```

### 4. 添加新的验证规则

编辑 `server/nlq/validators.ts`，在 `validateQueryPlan()` 中添加规则。

## 性能优化

1. **缓存**：
   - Schema digest 启动时生成一次
   - Neo4j Driver 单例
   - Apollo Server 单例

2. **限制**：
   - 查询结果行数限制
   - 图节点/边数量限制
   - 历史记录数量限制（20条）

3. **懒加载**：
   - Cytoscape 实例复用
   - 按需更新元素

## 安全措施

✅ **已实现**：
- 查询变量化（禁止字符串拼接）
- Mutation 禁用
- 结果数量强制限制
- 危险模式检测
- 输入验证

⚠️ **建议**：
- 实现速率限制
- 添加用户认证
- 使用只读 Neo4j 用户
- 监控 API 使用

## 调试技巧

1. **查看 LLM 提示词**：在 `server/nlq/orchestrator.ts` 中添加 `console.log(prompt)`

2. **检查 GraphQL 查询**：启用调试面板，查看生成的查询和变量

3. **Neo4j 查询日志**：在 Neo4j Browser 中查看执行的 Cypher 查询

4. **前端状态**：使用 React DevTools 查看组件状态

## 常用命令

```bash
# 开发
pnpm dev

# 构建
pnpm build

# 生产启动
pnpm start

# Lint
pnpm lint

# 类型检查
pnpm tsc --noEmit
```

---

**更多信息**，请查看 `README.md` 和 `QUICKSTART.md`。

