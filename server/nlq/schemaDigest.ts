/**
 * Schema Digest 生成与缓存
 * 为 LLM 提供简化的 schema 信息
 */

import { getSchemaDigest as getGraphQLSchemaDigest } from "../graphql/schema";

/**
 * Schema digest 缓存
 */
let cachedDigest: string | null = null;

/**
 * 获取 schema digest（带缓存）
 */
export function getSchemaDigest(): string {
  if (!cachedDigest) {
    cachedDigest = generateSchemaDigest();
  }
  return cachedDigest;
}

/**
 * 生成 schema digest
 */
function generateSchemaDigest(): string {
  // 使用基于中华人民共和国药典2025版的实际 schema
  const digest = `
# 中华人民共和国药典2025版 知识图谱 Schema

## 节点类型

### Pharmacopoeia (药典)
- id: String (唯一标识，固定为"2998")
- name: String (固定为"中华人民共和国药典2025版")

### Medicine (药品/条目)
- doc_id: String (唯一标识，如"49155")
- name: String (中文名称)
- edition: String (所属部，如"第一部")
- category: String (分类名称)
- name_pinyin: String (拼音名)
- name_en: String (英文名)
- content: String (正文内容)
- pharmacopoeia: Pharmacopoeia (所属药典)
- refersTo: [Medicine] (引用的通则或其他条目)
- relatedByCategory: [Medicine] (同类别的相关药品，最多5个)

### Volume (卷)
- name: String ("第一部" | "第二部" | "第三部" | "第四部")

### Category (分类)
- name: String (分类名称)
- volume: Int (所属卷号 1-4)
- range_start: Int (起始doc_id)
- range_end: Int (结束doc_id)

## 关系类型

### BELONGS_TO
- 从 Medicine 到 Pharmacopoeia
- 表示药品条目属于药典

### REFER_TO
- 从 Medicine 到 Medicine
- 表示药品条目引用通则或其他条目
- 例如：阿司匹林 -[:REFER_TO]-> 通则0512

### RELATED_BY_CATEGORY (隐式关系)
- 同类别的药品之间的关联
- 通过 category 字段匹配

## 卷和分类结构

### 第一部
- 药材和饮片 (49155-49770)
- 植物油脂和提取物 (49771-49817)
- 成方制剂和单味制剂 (49818-51433)

### 第二部
- 第一部分 (51439-54183)
- 第二部分 (54184-54215)

### 第三部
- 生物制品 (54231-54383)
- 通则与指导原则 (54384-54599)

### 第四部
- 通用技术要求和指导原则 (54610-55082)
- 药用辅料 (55083-55469)

## GraphQL 查询语法

**重要**：使用简化的GraphQL语法，不支持复杂嵌套和where子句。

### 查询药品（含药典关联和相关条目）
\`\`\`graphql
query SearchMedicines($name: String, $category: String, $edition: String) {
  medicines(name: $name, category: $category, edition: $edition) {
    doc_id
    name
    edition
    category
    name_pinyin
    name_en
    content
    pharmacopoeia {
      id
      name
    }
    refersTo {
      doc_id
      name
      category
      content
    }
    relatedByCategory {
      doc_id
      name
      category
      content
    }
  }
}
\`\`\`

注意：查询关联节点时，务必包含 content 字段，以便获取完整的通则内容和操作方法。

### 查询卷
\`\`\`graphql
query GetVolumes {
  volumes {
    name
  }
}
\`\`\`

### 查询分类
\`\`\`graphql
query GetCategories($volume: String) {
  categories(volume: $volume) {
    name
    volume
    range_start
    range_end
  }
}
\`\`\`

## 查询示例

### 示例1：查找阿司匹林
\`\`\`graphql
query {
  medicines(name: "阿司匹林") {
    doc_id
    name
    category
    content
  }
}
\`\`\`
变量: {}

### 示例2：查找药材和饮片分类
\`\`\`graphql
query {
  medicines(category: "药材和饮片") {
    doc_id
    name
    category
  }
}
\`\`\`
变量: {}

### 示例3：查找第一部的药品
\`\`\`graphql
query SearchByEdition($ed: String!) {
  medicines(edition: $ed) {
    doc_id
    name
    category
  }
}
\`\`\`
变量: {"ed": "第一部"}

## 限制和注意事项（非常重要！）
1. **不支持where子句**：❌ medicines(where: {name: "xxx"}) ✅ medicines(name: "xxx")
2. **不支持options参数**：❌ medicines(options: {limit: 10}) ✅ medicines(name: "xxx")
3. **不支持first参数**：❌ medicines(first: 10) ✅ medicines(name: "xxx")
4. **不支持关系查询**：暂不支持查询REFER_TO等关系
5. **所有参数都是可选的**：不提供参数返回所有记录（最多20条）
6. **使用CONTAINS匹配**：name和category参数使用模糊匹配
7. **正确格式**：medicines(name: $medicName, category: $cat) 
8. **错误格式**：medicines(where: {...}, options: {...})
`;
  
  // 添加额外的查询建议
  const suggestions = `

# 查询最佳实践

1. **使用变量**: 将用户输入作为变量传递，例如 \`$medicineName: String\`
2. **只查询需要的字段**: 优先查询 doc_id, name, category, edition 等关键字段
3. **使用参数过滤**: 通过 \`name: $name\` 精确查询

# 常见查询模式

## 按名称查询药品（推荐包含关联查询以获取完整图谱和通则内容）
\`\`\`graphql
query SearchMedicine($name: String) {
  medicines(name: $name) {
    doc_id
    name
    edition
    category
    content
    pharmacopoeia {
      id
      name
    }
    refersTo {
      doc_id
      name
      category
      content
    }
    relatedByCategory {
      doc_id
      name
      category
      content
    }
  }
}
\`\`\`

关键：refersTo 中的通则包含详细的检验方法和操作流程，必须查询 content 字段。

## 按分类查询药品（简化查询，不含关联）
\`\`\`graphql
query SearchByCategory($category: String) {
  medicines(category: $category) {
    doc_id
    name
    edition
    category
    content
  }
}
\`\`\`

## 查询所有卷
\`\`\`graphql
query GetAllVolumes {
  volumes {
    name
  }
}
\`\`\`
`;

  return digest + suggestions;
}

/**
 * 清除缓存（用于 schema 更新后）
 */
export function clearSchemaDigestCache(): void {
  cachedDigest = null;
}

/**
 * 提取 schema 中的实体类型
 */
export function getEntityTypes(): string[] {
  return ["Person", "Drug", "Disease"];
}

/**
 * 提取 schema 中的关系类型
 */
export function getRelationshipTypes(): string[] {
  return ["RESEARCHES", "TREATS"];
}

/**
 * 获取实体的可查询字段
 */
export function getEntityFields(entityType: string): string[] {
  const fieldMap: Record<string, string[]> = {
    Person: ["id", "name", "aliases", "affiliation"],
    Drug: ["id", "name", "description", "approvalDate"],
    Disease: ["id", "name", "description", "symptoms"],
  };
  
  return fieldMap[entityType] || ["id", "name"];
}

