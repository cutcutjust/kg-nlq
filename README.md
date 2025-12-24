# Neo4j 知识图谱自然语言查询系统

基于 Neo4j 和 LLM（通义千问）的知识图谱自然语言查询与可视化系统。

## 功能特性

- ✅ **自然语言查询**：用中文问问题，自动生成 GraphQL 查询
- ✅ **智能回答**：LLM 生成清晰的中文答案，附带证据引用
- ✅ **图可视化**：使用 Cytoscape.js 展示知识图谱子图
- ✅ **证据高亮**：点击证据项，自动在图中高亮对应节点和边
- ✅ **两种模式**：问答模式（QA）和浏览模式（Browse）
- ✅ **安全保障**：查询变量化、结果限制、禁止危险操作

## 技术栈

- **前端**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **图可视化**: Cytoscape.js
- **后端**: Apollo Server + @neo4j/graphql
- **数据库**: Neo4j
- **LLM**: 通义千问（兼容 OpenAI API）

## 快速开始

### 1. 环境要求

- Node.js 18+
- Neo4j 5.x（本地或远程实例）
- pnpm 或 npm

### 2. 安装依赖

```bash
# 使用 pnpm（推荐）
pnpm install

# 或使用 npm
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# Neo4j 配置
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password_here

# 通义千问配置
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_API_KEY=sk-your-qwen-api-key
LLM_MODEL=qwen-turbo

# 限制配置（可选）
NLQ_MAX_ROWS=50
NLQ_MAX_NODES=80
NLQ_MAX_EDGES=120
```

#### 获取通义千问 API Key

1. 访问：https://help.aliyun.com/zh/model-studio/get-api-key
2. 注册阿里云账号
3. 开通通义千问服务
4. 获取 API Key

**推荐模型**：
- `qwen-turbo`：快速响应，适合实时查询
- `qwen-plus`：平衡性能，适合日常使用
- `qwen-max`：最强性能，适合复杂查询

### 4. 准备 Neo4j 数据

**方式一：使用示例数据**

项目内置了一个示例 schema（Person、Drug、Disease）。你需要在 Neo4j 中创建相应的数据：

```cypher
// 创建示例数据
CREATE (p1:Person {id: "p1", name: "张三", affiliation: "清华大学"})
CREATE (p2:Person {id: "p2", name: "李四", affiliation: "北京大学"})

CREATE (d1:Drug {id: "d1", name: "阿司匹林", description: "非甾体抗炎药"})
CREATE (d2:Drug {id: "d2", name: "布洛芬", description: "解热镇痛药"})

CREATE (dis1:Disease {id: "dis1", name: "心脏病", description: "心血管疾病"})
CREATE (dis2:Disease {id: "dis2", name: "头痛", description: "常见症状"})

CREATE (p1)-[:RESEARCHES]->(d1)
CREATE (p2)-[:RESEARCHES]->(d2)
CREATE (d1)-[:TREATS]->(dis1)
CREATE (d2)-[:TREATS]->(dis2)
```

**方式二：修改 Schema 适配你的图谱**

编辑 `server/graphql/schema.ts`，修改 `typeDefs` 以匹配你的 Neo4j 图谱结构。

### 5. 启动开发服务器

```bash
# 使用 pnpm
pnpm dev

# 或使用 npm
npm run dev
```

访问：http://localhost:3000

### 6. 使用示例

#### 问答模式（QA）

输入问题：
- "阿司匹林治疗什么疾病？"
- "有哪些研究人员在研究心脏病药物？"
- "布洛芬是什么？"

#### 浏览模式（Browse）

输入问题：
- "展示阿司匹林的关系网络"
- "浏览心脏病相关的子图"

## 项目结构

```
kg-nlq/
├── app/                      # Next.js App Router
│   ├── api/
│   │   ├── nlq/route.ts     # NLQ API 端点
│   │   └── graphql/route.ts # GraphQL API 端点
│   ├── page.tsx             # 主页面
│   ├── layout.tsx           # 根布局
│   └── globals.css          # 全局样式
├── components/              # React 组件
│   ├── ui/                  # shadcn/ui 基础组件
│   ├── ChatPanel.tsx        # 聊天面板
│   ├── AnswerPanel.tsx      # 答案展示
│   ├── EvidenceList.tsx     # 证据列表
│   ├── GraphCanvas.tsx      # 图可视化
│   └── Topbar.tsx           # 顶部导航
├── lib/                     # 工具库
│   ├── types.ts             # TypeScript 类型定义
│   ├── config.ts            # 配置管理
│   ├── utils.ts             # 工具函数
│   └── apolloClient.ts      # Apollo Client 配置
├── server/                  # 服务端逻辑
│   ├── graphql/             # GraphQL 服务
│   │   ├── schema.ts        # Neo4j GraphQL Schema
│   │   ├── server.ts        # Apollo Server
│   │   └── context.ts       # Neo4j Driver 管理
│   ├── nlq/                 # NLQ 编排层
│   │   ├── orchestrator.ts  # 主编排逻辑
│   │   ├── prompts.ts       # LLM 提示词
│   │   ├── validators.ts    # 验证器
│   │   ├── schemaDigest.ts  # Schema 摘要
│   │   └── postprocess.ts   # 结果后处理
│   └── llm/                 # LLM 客户端
│       └── client.ts        # 通义千问客户端
├── .env.example             # 环境变量示例
├── package.json             # 项目依赖
├── tsconfig.json            # TypeScript 配置
├── tailwind.config.ts       # Tailwind 配置
└── README.md                # 本文件
```

## 核心流程

### NLQ 处理流程（两段式）

```
用户问题
    ↓
[阶段 1] LLM 生成查询计划 (QueryPlan)
    ├─ 分析意图 (qa/browse)
    ├─ 生成 GraphQL 查询
    ├─ 变量化用户输入
    └─ 设置安全限制
    ↓
[验证] 查询计划校验
    ├─ 检查语法
    ├─ 检查安全性
    └─ 必要时自动修复
    ↓
[执行] Neo4j GraphQL 查询
    ↓
[后处理] 提取节点/边，生成证据
    ↓
[阶段 2] LLM 生成自然语言答案
    ├─ 基于查询结果
    ├─ 生成中文回答
    └─ 关联证据项
    ↓
返回完整响应
```

## 修改 Schema

如果你有自己的 Neo4j 图谱，需要修改 `server/graphql/schema.ts`：

```typescript
export const typeDefs = `
  type YourNodeType {
    id: ID! @id
    name: String!
    // 添加你的属性
  }
  
  type AnotherNodeType {
    id: ID! @id
    name: String!
    // 添加你的属性
    relatedNodes: [YourNodeType!]! @relationship(type: "YOUR_RELATIONSHIP", direction: OUT)
  }
`;
```

同时更新 `getSchemaDigest()` 函数，为 LLM 提供准确的 schema 描述。

## 常见问题

### 1. LLM 生成的查询失败？

**原因**：LLM 可能不熟悉你的 schema。

**解决**：
- 确保 `schemaDigest.ts` 中的 schema 描述清晰
- 在提示词中添加更多查询示例
- 尝试使用 `qwen-plus` 或 `qwen-max` 模型

### 2. 如何调整结果数量限制？

修改 `.env` 文件：

```env
NLQ_MAX_ROWS=100     # 最多返回的行数
NLQ_MAX_NODES=150    # 最多显示的节点数
NLQ_MAX_EDGES=200    # 最多显示的边数
```

### 3. Neo4j 连接失败？

检查：
- Neo4j 服务是否启动
- URI、用户名、密码是否正确
- 防火墙是否开放 7687 端口

### 4. GraphQL 查询权限问题？

建议为 Neo4j 用户设置只读权限：

```cypher
// 创建只读角色
CREATE ROLE nlq_readonly;
GRANT MATCH {*} ON GRAPH * TO nlq_readonly;
DENY WRITE ON GRAPH * TO nlq_readonly;

// 分配给用户
GRANT ROLE nlq_readonly TO your_user;
```

### 5. 通义千问 API 调用超时？

修改 `server/llm/client.ts` 中的 `timeout` 参数：

```typescript
this.timeout = options?.timeout ?? 120000; // 增加到 120 秒
```

## 安全注意事项

✅ **已实现的安全措施**：
- 用户输入不直接拼接到查询（使用变量）
- 禁止 mutation 操作
- 强制结果数量限制
- 查询计划验证
- 危险模式检测

⚠️ **建议的额外措施**：
- 使用只读 Neo4j 用户
- 实现速率限制（API 层）
- 添加用户认证
- 监控 LLM API 使用量

## 性能优化

- **Schema Digest 缓存**：启动时生成一次，避免重复计算
- **Neo4j Driver 复用**：单例模式，避免频繁连接
- **结果裁剪**：后端限制返回数据量
- **前端分页**：历史记录仅保留最近 20 条

## 生产部署

### 环境变量配置

确保生产环境设置了所有必需的环境变量。

### 构建生产版本

```bash
pnpm build
pnpm start
```

### Docker 部署（可选）

创建 `Dockerfile`：

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可

MIT License

## 联系方式

如有问题，请提交 GitHub Issue。

---

**Powered by**:
- [Next.js](https://nextjs.org/)
- [Neo4j](https://neo4j.com/)
- [通义千问](https://help.aliyun.com/zh/model-studio/)
- [Cytoscape.js](https://js.cytoscape.org/)

