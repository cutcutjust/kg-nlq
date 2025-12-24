/**
 * Neo4j GraphQL Schema 定义
 * 使用 @neo4j/graphql 自动生成 GraphQL API
 */

import { Neo4jGraphQL } from "@neo4j/graphql";
import { getNeo4jDriver } from "./context";

/**
 * GraphQL Type Definitions
 * 
 * 这是一个示例 schema，用户应根据自己的图谱结构修改
 * 
 * 示例图谱：
 * - Person (研究人员)
 * - Drug (药物)
 * - Disease (疾病)
 * - Person -[:RESEARCHES]-> Drug
 * - Drug -[:TREATS]-> Disease
 */
export const typeDefs = `
  type Person {
    id: ID! @id
    name: String!
    aliases: [String!]
    affiliation: String
    researches: [Drug!]! @relationship(type: "RESEARCHES", direction: OUT)
  }

  type Drug {
    id: ID! @id
    name: String!
    description: String
    approvalDate: String
    researchers: [Person!]! @relationship(type: "RESEARCHES", direction: IN)
    treats: [Disease!]! @relationship(type: "TREATS", direction: OUT)
  }

  type Disease {
    id: ID! @id
    name: String!
    description: String
    symptoms: [String!]
    treatedBy: [Drug!]! @relationship(type: "TREATS", direction: IN)
  }
`;

/**
 * 创建 Neo4j GraphQL Schema
 */
let neoSchema: Neo4jGraphQL | null = null;

export function getNeo4jGraphQLSchema(): Neo4jGraphQL {
  if (!neoSchema) {
    const driver = getNeo4jDriver();
    
    neoSchema = new Neo4jGraphQL({
      typeDefs,
      driver,
      config: {
        // 禁用 mutation（只读模式）
        enableMutations: false,
      },
    });
  }
  
  return neoSchema;
}

/**
 * 生成 GraphQL Schema
 */
export async function getExecutableSchema() {
  const neoSchema = getNeo4jGraphQLSchema();
  return neoSchema.getSchema();
}

/**
 * 获取 Schema 摘要信息（用于 LLM prompt）
 */
export function getSchemaDigest(): string {
  return `
# Neo4j 图谱 Schema

## 节点类型

### Person (研究人员)
- id: ID (唯一标识)
- name: String (姓名)
- aliases: [String] (别名列表)
- affiliation: String (所属机构)
- 关系: RESEARCHES -> Drug

### Drug (药物)
- id: ID (唯一标识)
- name: String (药物名称)
- description: String (药物描述)
- approvalDate: String (批准日期)
- 关系: TREATS -> Disease; RESEARCHES <- Person

### Disease (疾病)
- id: ID (唯一标识)
- name: String (疾病名称)
- description: String (疾病描述)
- symptoms: [String] (症状列表)
- 关系: TREATS <- Drug

## 关系类型

1. RESEARCHES: Person -> Drug (研究人员研究某药物)
2. TREATS: Drug -> Disease (药物治疗某疾病)

## 查询示例

查询某药物治疗的疾病:
\`\`\`graphql
query GetDrugTreatments($drugName: String!) {
  drugs(where: { name: $drugName }) {
    name
    treats {
      name
      description
    }
  }
}
\`\`\`

查询某研究人员的研究成果:
\`\`\`graphql
query GetPersonResearch($personName: String!) {
  people(where: { name: $personName }) {
    name
    researches {
      name
      treats {
        name
      }
    }
  }
}
\`\`\`
`.trim();
}

