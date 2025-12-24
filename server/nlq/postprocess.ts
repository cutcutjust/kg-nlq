/**
 * 查询结果后处理
 * 裁剪、聚合、提取证据、生成子图
 */

import { GraphNode, GraphEdge, GraphData, EvidenceItem } from "@/lib/types";
import { getConfig } from "@/lib/config";

/**
 * 从查询结果中提取节点和边（药典版本）
 */
export function extractGraphFromResult(result: any): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();

  function addNode(item: any, type: string) {
    if (!item) return;
    // 药典使用 doc_id 作为唯一标识
    const nodeId = item.doc_id || item.id;
    if (!nodeId) return;

    
    if (!nodeIds.has(nodeId)) {
      nodeIds.add(nodeId);
      nodes.push({
        id: nodeId,
        label: item.name || nodeId,
        type: type,
        properties: { ...item },
      });
    }
  }

  function addEdge(sourceId: string, targetId: string, type: string, properties: any = {}) {
    const edgeId = `${sourceId}-${type}-${targetId}`;
    
    if (!edgeIds.has(edgeId)) {
      edgeIds.add(edgeId);
      edges.push({
        id: edgeId,
        source: sourceId,
        target: targetId,
        type: type,
        properties,
      });
    }
  }

  function processEntity(entity: any, type: string) {
    if (!entity) return;
    
    addNode(entity, type);

    const entityId = entity.doc_id || entity.id;

    // 处理药品与药典的关系
    if (type === "Medicine" && entity.pharmacopoeia) {
      const pharmacopoeia = entity.pharmacopoeia;
      const pharmId = pharmacopoeia.id || "2998";
      
      // 添加药典节点
      if (!nodeIds.has(pharmId)) {
        nodeIds.add(pharmId);
        nodes.push({
          id: pharmId,
          label: pharmacopoeia.name || "中华人民共和国药典2025版",
          type: "Pharmacopoeia",
          properties: pharmacopoeia,
        });
      }
      
      // 添加 BELONGS_TO 关系
      if (entityId) {
        addEdge(entityId, pharmId, "BELONGS_TO");
      }
    }

    // 处理 REFER_TO 关系（引用的通则）
    if (type === "Medicine" && entity.refersTo && Array.isArray(entity.refersTo)) {
      entity.refersTo.forEach((referred: any) => {
        if (referred && (referred.doc_id || referred.id)) {
          addNode(referred, "Medicine");
          const referredId = referred.doc_id || referred.id;
          if (entityId && referredId) {
            addEdge(entityId, referredId, "REFER_TO", { label: "引用" });
          }
        }
      });
    }

    // 处理同类别关联（相关药品）
    if (type === "Medicine" && entity.relatedByCategory && Array.isArray(entity.relatedByCategory)) {
      entity.relatedByCategory.forEach((related: any) => {
        if (related && (related.doc_id || related.id)) {
          addNode(related, "Medicine");
          const relatedId = related.doc_id || related.id;
          if (entityId && relatedId) {
            addEdge(entityId, relatedId, "RELATED", { label: "同类别" });
          }
        }
      });
    }
    
    // 旧代码处理 Drug 的关系（保留以供参考）
    /*
    if (type === "Drug") {
      // TREATS 关系
      if (entity.treats && Array.isArray(entity.treats)) {
        entity.treats.forEach((disease: any) => {
          addNode(disease, "Disease");
          addEdge(entity.id, disease.id, "TREATS");
        });
      }

      // RESEARCHES 关系（反向）
      if (entity.researchers && Array.isArray(entity.researchers)) {
        entity.researchers.forEach((person: any) => {
          addNode(person, "Person");
          addEdge(person.id, entity.id, "RESEARCHES");
        });
      }
    }
    */

    // 处理 Person 的关系（旧代码，已注释）
    /*
    if (type === "Person") {
      if (entity.researches && Array.isArray(entity.researches)) {
        entity.researches.forEach((drug: any) => {
          addNode(drug, "Drug");
          addEdge(entity.id, drug.id, "RESEARCHES");
          
          // 递归处理 drug 的关系
          if (drug.treats && Array.isArray(drug.treats)) {
            drug.treats.forEach((disease: any) => {
              addNode(disease, "Disease");
              addEdge(drug.id, disease.id, "TREATS");
            });
          }
        });
      }
    }
    */

    // 处理 Disease 的关系（旧代码，已注释）
    /*
    if (type === "Disease") {
      if (entity.treatedBy && Array.isArray(entity.treatedBy)) {
        entity.treatedBy.forEach((drug: any) => {
          addNode(drug, "Drug");
          addEdge(drug.id, entity.id, "TREATS");
        });
      }
    }
    */
  }

  // 遍历结果对象（药典版本）
  function traverse(obj: any, parentType?: string) {
    if (!obj || typeof obj !== "object") return;

    // 检查是否是实体数组
    if (Array.isArray(obj)) {
      obj.forEach((item) => traverse(item, parentType));
      return;
    }

    // 检查是否是单个实体（药典使用 doc_id）
    if (obj.doc_id || obj.id) {
      const type = obj.__typename || parentType || "Medicine";
      processEntity(obj, type);
      return;
    }

    // 递归处理对象的键
    for (const [key, value] of Object.entries(obj)) {
      if (key === "medicines" || key === "Medicine") {
        traverse(value, "Medicine");
      } else if (key === "volumes" || key === "Volume") {
        traverse(value, "Volume");
      } else if (key === "categories" || key === "Category") {
        traverse(value, "Category");
      } else {
        traverse(value, parentType);
      }
    }
  }

  traverse(result);

  console.log(`[GraphExtraction] 提取了 ${nodes.length} 个节点和 ${edges.length} 条边`);
  if (nodes.length > 0) {
    console.log(`[GraphExtraction] 第一个节点:`, nodes[0].id, nodes[0].label, nodes[0].type);
  }
  if (edges.length > 0) {
    console.log(`[GraphExtraction] 边的类型分布:`, {
      BELONGS_TO: edges.filter(e => e.type === 'BELONGS_TO').length,
      REFER_TO: edges.filter(e => e.type === 'REFER_TO').length,
      RELATED: edges.filter(e => e.type === 'RELATED').length,
    });
    console.log(`[GraphExtraction] 第一条边示例:`, edges[0]);
  }

  return { nodes, edges };
}

/**
 * 裁剪图数据以符合大小限制
 */
export function trimGraph(graph: GraphData): GraphData {
  const config = getConfig();
  
  const nodes = graph.nodes.slice(0, config.nlq.maxNodes);
  const nodeIds = new Set(nodes.map((n) => n.id));
  
  // 只保留两端都在节点集合中的边
  const edges = graph.edges
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    .slice(0, config.nlq.maxEdges);

  return { nodes, edges };
}

/**
 * 从查询结果生成证据项（药典版本）
 */
export function generateEvidence(result: any, graph: GraphData): EvidenceItem[] {
  const evidence: EvidenceItem[] = [];

  // 为药品生成证据
  if (result.medicines && Array.isArray(result.medicines)) {
    result.medicines.slice(0, 6).forEach((medicine: any) => {
      const nodeIds = [medicine.doc_id || medicine.id];
      const edgeIds: string[] = [];
      
      let text = `【${medicine.name}】`;
      
      if (medicine.category) {
        text += ` - 分类：${medicine.category}`;
      }
      
      if (medicine.edition) {
        text += ` (${medicine.edition})`;
      }
      
      if (medicine.content && medicine.content.length > 0) {
        const contentPreview = medicine.content.substring(0, 50);
        text += `。${contentPreview}${medicine.content.length > 50 ? '...' : ''}`;
      }
      
      evidence.push({ text, nodeIds, edgeIds });

      // 为引用的通则生成证据
      if (medicine.refersTo && Array.isArray(medicine.refersTo)) {
        medicine.refersTo.slice(0, 3).forEach((referred: any) => {
          const refNodeIds = [referred.doc_id || referred.id];
          const refEdgeIds = [`${medicine.doc_id || medicine.id}-REFER_TO-${referred.doc_id || referred.id}`];
          
          let refText = `  ↳ 引用：【${referred.name}】`;
          if (referred.category) {
            refText += ` - ${referred.category}`;
          }
          
          evidence.push({ text: refText, nodeIds: refNodeIds, edgeIds: refEdgeIds });
        });
      }

      // 为同类别相关药品生成证据
      if (medicine.relatedByCategory && Array.isArray(medicine.relatedByCategory)) {
        medicine.relatedByCategory.slice(0, 2).forEach((related: any) => {
          const relNodeIds = [related.doc_id || related.id];
          const relEdgeIds = [`${medicine.doc_id || medicine.id}-RELATED-${related.doc_id || related.id}`];
          
          let relText = `  ↳ 同类：【${related.name}】`;
          if (related.category) {
            relText += ` - ${related.category}`;
          }
          
          evidence.push({ text: relText, nodeIds: relNodeIds, edgeIds: relEdgeIds });
        });
      }
    });
  }

  // 旧代码：为药物生成证据（已注释）
  /*
  if (result.drugs && Array.isArray(result.drugs)) {
    result.drugs.slice(0, 5).forEach((drug: any) => {
      const nodeIds = [drug.id];
      const edgeIds: string[] = [];
      
      let text = `药物"${drug.name}"`;
      
      if (drug.treats && drug.treats.length > 0) {
        const diseaseNames = drug.treats.slice(0, 3).map((d: any) => d.name).join("、");
        text += `治疗${diseaseNames}`;
        
        drug.treats.slice(0, 3).forEach((d: any) => {
          nodeIds.push(d.id);
          edgeIds.push(`${drug.id}-TREATS-${d.id}`);
        });
      }
      
      if (drug.description) {
        text += `。${drug.description}`;
      }
      
      evidence.push({ text, nodeIds, edgeIds });
    });
  }
  */

  // 旧代码：为研究人员生成证据（已注释）
  /*
  if (result.people && Array.isArray(result.people)) {
    result.people.slice(0, 5).forEach((person: any) => {
      const nodeIds = [person.id];
      const edgeIds: string[] = [];
      
      let text = `研究人员"${person.name}"`;
      
      if (person.affiliation) {
        text += `来自${person.affiliation}`;
      }
      
      if (person.researches && person.researches.length > 0) {
        const drugNames = person.researches.slice(0, 3).map((d: any) => d.name).join("、");
        text += `，研究了${drugNames}`;
        
        person.researches.slice(0, 3).forEach((d: any) => {
          nodeIds.push(d.id);
          edgeIds.push(`${person.id}-RESEARCHES-${d.id}`);
        });
      }
      
      evidence.push({ text, nodeIds, edgeIds });
    });
  }
  */

  // 旧代码：为疾病生成证据（已注释）
  /*
  if (result.diseases && Array.isArray(result.diseases)) {
    result.diseases.slice(0, 5).forEach((disease: any) => {
      const nodeIds = [disease.id];
      const edgeIds: string[] = [];
      
      let text = `疾病"${disease.name}"`;
      
      if (disease.description) {
        text += `：${disease.description}`;
      }
      
      if (disease.treatedBy && disease.treatedBy.length > 0) {
        const drugNames = disease.treatedBy.slice(0, 3).map((d: any) => d.name).join("、");
        text += `。可使用${drugNames}治疗`;
        
        disease.treatedBy.slice(0, 3).forEach((d: any) => {
          nodeIds.push(d.id);
          edgeIds.push(`${d.id}-TREATS-${disease.id}`);
        });
      }
      
      evidence.push({ text, nodeIds, edgeIds });
    });
  }
  */

  return evidence.slice(0, 6); // 最多返回 6 条证据
}

/**
 * 裁剪查询结果（减少 payload 大小）
 */
export function trimQueryResult(result: any, maxDepth: number = 3): any {
  const config = getConfig();
  
  function trim(obj: any, depth: number): any {
    if (depth > maxDepth || obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      // 限制数组长度
      return obj.slice(0, config.nlq.maxRows).map((item) => trim(item, depth + 1));
    }

    if (typeof obj === "object") {
      const trimmed: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        // 跳过一些不必要的字段
        if (key.startsWith("__")) continue;
        
        trimmed[key] = trim(value, depth + 1);
      }
      
      return trimmed;
    }

    return obj;
  }

  return trim(result, 0);
}

