# 项目设置指南

## 1. 安装依赖

```bash
cd web/kg-nlq
pnpm install
# 或
npm install
```

## 2. 配置环境变量

复制 `env.example` 为 `.env`：

```bash
cp env.example .env
```

编辑 `.env` 文件，填入你的配置：

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_actual_password

LLM_API_KEY=sk-f09ad7f79c3c47f29a6e95011d99255a
LLM_MODEL=qwen-turbo
```

## 3. 设置 Neo4j 数据库

### 方式 A：使用 Neo4j Desktop（推荐）

1. 下载安装 [Neo4j Desktop](https://neo4j.com/download/)
2. 创建新数据库，设置密码
3. 启动数据库
4. 在 Neo4j Browser 中运行 `scripts/sample-data.cypher`

### 方式 B：使用 Docker

```bash
docker run \
  --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/your_password \
  neo4j:5.14
```

然后访问 http://localhost:7474，执行 `scripts/sample-data.cypher`

## 4. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

## 5. 测试查询

尝试以下问题：

### 问答模式（QA）
- "阿司匹林治疗什么疾病？"
- "有哪些药物可以治疗头痛？"
- "张三研究了哪些药物？"
- "心脏病有哪些治疗方法？"

### 浏览模式（Browse）
- "展示阿司匹林的关系网络"
- "浏览心脏病相关的药物和研究人员"

## 常见问题

### 无法连接到 Neo4j

检查：
1. Neo4j 服务是否启动
2. 端口 7687 是否开放
3. 用户名密码是否正确

### LLM API 调用失败

检查：
1. API Key 是否正确
2. 网络是否能访问通义千问服务
3. API Key 是否有足够的额度

### 查询返回空结果

检查：
1. 示例数据是否已导入
2. 查询的实体名称是否存在于数据库中

## 下一步

- 根据你的图谱修改 `server/graphql/schema.ts`
- 调整提示词以提高查询准确性
- 添加更多示例数据

