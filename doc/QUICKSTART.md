# 快速启动指南

## 5 分钟快速上手

### 第 1 步：安装依赖（1分钟）

```bash
cd web/kg-nlq
pnpm install
/npm install
```

### 第 2 步：配置环境（1分钟）

```bash
# 复制环境变量模板
cp env.example .env
```

编辑 `.env` 文件，填入以下配置：

```env
# Neo4j（如果你已有 Neo4j 实例）
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=你的密码

# 通义千问（使用提供的 API Key）
LLM_API_KEY=sk-f09ad7f79c3c47f29a6e95011d99255a
LLM_MODEL=qwen-turbo
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
```

### 第 3 步：设置 Neo4j 数据库（2分钟）

**选项 A：使用 Docker（最快）**

```bash
docker run -d \
  --name neo4j-kg \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/test123456 \
  neo4j:5.14
```

然后更新 `.env` 中的密码为 `test123456`

**选项 B：使用现有 Neo4j**

确保 Neo4j 正在运行，并更新 `.env` 配置。

### 第 4 步：导入示例数据（1分钟）

1. 访问 http://localhost:7474
2. 登录 Neo4j Browser（用户名：`neo4j`，密码：你设置的密码）
3. 复制并执行 `scripts/sample-data.cypher` 中的内容

或使用 cypher-shell：

```bash
cat scripts/sample-data.cypher | docker exec -i neo4j-kg cypher-shell -u neo4j -p test123456
```

### 第 5 步：启动应用（30秒）

```bash
pnpm dev

npm run dev
```

访问：http://localhost:3000

## 测试查询

### 问答模式

试试这些问题：

1. **"阿司匹林治疗什么疾病？"**

   - 应返回：心脏病、头痛、关节炎
2. **"有哪些药物可以治疗头痛？"**

   - 应返回：阿司匹林、布洛芬、对乙酰氨基酚
3. **"张三研究了哪些药物？"**

   - 应返回：阿司匹林、他汀类药物

### 浏览模式

切换到浏览模式，试试：

1. **"展示阿司匹林的关系网络"**

   - 应显示：阿司匹林及其相关的疾病和研究人员
2. **"浏览心脏病相关的治疗方案"**

   - 应显示：心脏病、相关药物和研究人员的子图

## 功能演示

1. **点击证据高亮**：在证据列表中点击任意证据项，图中对应的节点和边会高亮显示
2. **查看调试信息**：展开答案面板下方的"调试信息"，可以看到生成的 GraphQL 查询和变量
3. **历史记录**：查看左侧的历史记录，点击可以快速回到之前的查询

## 常见问题

### Q: 提示 "缺少必需的环境变量: NEO4J_PASSWORD"

**A:** 确保 `.env` 文件中设置了 `NEO4J_PASSWORD`

### Q: 提示 "Neo4j 连接失败"

**A:** 检查：

- Neo4j 服务是否启动：`docker ps`
- 端口是否正确：默认 7687
- 密码是否正确

### Q: LLM 返回错误或超时

**A:** 检查：

- API Key 是否正确
- 网络是否能访问阿里云服务
- 可以尝试更换模型为 `qwen-plus`

### Q: 查询返回 "未查询到相关信息"

**A:** 检查：

- 示例数据是否已导入
- 尝试使用提供的示例问题
- 确保问题中的实体名称在数据库中存在

## 下一步

✅ 系统运行正常？继续探索：

1. **修改 Schema**：编辑 `server/graphql/schema.ts` 以匹配你的图谱
2. **调整提示词**：优化 `server/nlq/prompts.ts` 以提高查询准确性
3. **添加数据**：在 Neo4j 中添加更多实体和关系
4. **自定义样式**：修改 `components/GraphCanvas.tsx` 中的图样式

## 技术支持

- 📖 查看完整文档：`README.md`
- 🔧 详细设置说明：`scripts/setup.md`
- 💬 遇到问题？检查控制台日志

---

**🎉 祝你使用愉快！**
