// Neo4j 示例数据
// 在 Neo4j Browser 中执行此脚本以创建示例图谱

// 清空现有数据（谨慎使用！）
// MATCH (n) DETACH DELETE n;

// 创建研究人员（Person）
CREATE (p1:Person {id: "p1", name: "张三", affiliation: "清华大学", aliases: ["Zhang San", "Z. San"]})
CREATE (p2:Person {id: "p2", name: "李四", affiliation: "北京大学", aliases: ["Li Si", "L. Si"]})
CREATE (p3:Person {id: "p3", name: "王五", affiliation: "复旦大学", aliases: ["Wang Wu"]})

// 创建药物（Drug）
CREATE (d1:Drug {
  id: "d1", 
  name: "阿司匹林", 
  description: "非甾体抗炎药，用于解热、镇痛、抗炎",
  approvalDate: "1899-01-01"
})
CREATE (d2:Drug {
  id: "d2", 
  name: "布洛芬", 
  description: "非甾体抗炎药，用于缓解疼痛和炎症",
  approvalDate: "1969-01-01"
})
CREATE (d3:Drug {
  id: "d3", 
  name: "对乙酰氨基酚", 
  description: "解热镇痛药，用于治疗轻度至中度疼痛",
  approvalDate: "1955-01-01"
})
CREATE (d4:Drug {
  id: "d4", 
  name: "他汀类药物", 
  description: "降脂药，用于降低胆固醇水平",
  approvalDate: "1987-01-01"
})

// 创建疾病（Disease）
CREATE (dis1:Disease {
  id: "dis1", 
  name: "心脏病", 
  description: "心血管系统疾病的总称",
  symptoms: ["胸痛", "气短", "心悸"]
})
CREATE (dis2:Disease {
  id: "dis2", 
  name: "头痛", 
  description: "头部疼痛的症状",
  symptoms: ["头部胀痛", "偏头痛", "紧张性头痛"]
})
CREATE (dis3:Disease {
  id: "dis3", 
  name: "关节炎", 
  description: "关节炎症性疾病",
  symptoms: ["关节疼痛", "肿胀", "活动受限"]
})
CREATE (dis4:Disease {
  id: "dis4", 
  name: "发烧", 
  description: "体温升高的症状",
  symptoms: ["体温升高", "乏力", "出汗"]
})
CREATE (dis5:Disease {
  id: "dis5", 
  name: "高胆固醇血症", 
  description: "血液中胆固醇水平过高",
  symptoms: ["无明显症状", "可能有黄色瘤"]
})

// 创建研究关系（RESEARCHES）
CREATE (p1)-[:RESEARCHES]->(d1)
CREATE (p1)-[:RESEARCHES]->(d4)
CREATE (p2)-[:RESEARCHES]->(d2)
CREATE (p2)-[:RESEARCHES]->(d3)
CREATE (p3)-[:RESEARCHES]->(d3)

// 创建治疗关系（TREATS）
CREATE (d1)-[:TREATS]->(dis1)
CREATE (d1)-[:TREATS]->(dis2)
CREATE (d1)-[:TREATS]->(dis3)

CREATE (d2)-[:TREATS]->(dis2)
CREATE (d2)-[:TREATS]->(dis3)
CREATE (d2)-[:TREATS]->(dis4)

CREATE (d3)-[:TREATS]->(dis2)
CREATE (d3)-[:TREATS]->(dis4)

CREATE (d4)-[:TREATS]->(dis1)
CREATE (d4)-[:TREATS]->(dis5)

// 验证数据
MATCH (n) RETURN count(n) as total_nodes;
MATCH ()-[r]->() RETURN count(r) as total_relationships;

