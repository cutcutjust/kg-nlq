/**
 * 简化的 GraphQL Schema（基于中华人民共和国药典2025版）
 * 用于避免 graphql 版本冲突问题
 */

import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLList, GraphQLNonNull, GraphQLID, GraphQLInt } from "graphql";
import { getNeo4jDriver } from "./context";

// 定义药典类型
const PharmacopoeiaType: any = new GraphQLObjectType({
  name: "Pharmacopoeia",
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLString) },
    name: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

// 定义药品类型
const MedicineType: any = new GraphQLObjectType({
  name: "Medicine",
  fields: () => ({
    doc_id: { type: new GraphQLNonNull(GraphQLString) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    edition: { type: GraphQLString },
    category: { type: GraphQLString },
    name_pinyin: { type: GraphQLString },
    name_en: { type: GraphQLString },
    content: { type: GraphQLString },
    pharmacopoeia: { type: PharmacopoeiaType },
    // 关联查询字段
    refersTo: { 
      type: new GraphQLList(MedicineType),
      description: "引用的通则或其他条目"
    },
    relatedByCategory: { 
      type: new GraphQLList(MedicineType),
      description: "同类别的相关药品"
    },
  }),
});

// 定义卷类型
const VolumeType: any = new GraphQLObjectType({
  name: "Volume",
  fields: () => ({
    name: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

// 定义分类类型
const CategoryType: any = new GraphQLObjectType({
  name: "Category",
  fields: () => ({
    name: { type: new GraphQLNonNull(GraphQLString) },
    volume: { type: GraphQLInt },
    range_start: { type: GraphQLInt },
    range_end: { type: GraphQLInt },
  }),
});

// 定义查询
const QueryType = new GraphQLObjectType({
  name: "Query",
  fields: {
    medicines: {
      type: new GraphQLList(MedicineType),
      args: {
        name: { type: GraphQLString },
        category: { type: GraphQLString },
        edition: { type: GraphQLString },
      },
      resolve: async (_source, args, context, info) => {
        const driver = getNeo4jDriver();
        const session = driver.session();
        
        try {
          // 检查是否需要查询关联数据
          const selections = info.fieldNodes[0].selectionSet?.selections || [];
          const fieldNames = selections.map((s: any) => s.name?.value);
          const needsRefersTo = fieldNames.includes('refersTo');
          const needsRelated = fieldNames.includes('relatedByCategory');
          
          // 查询药品，可选关联药典
          let query = "MATCH (m:Medicine) ";
          const params: any = {};
          let whereConditions: string[] = [];
          
          if (args.name) {
            whereConditions.push("m.name CONTAINS $name");
            params.name = args.name;
          }
          
          if (args.category) {
            whereConditions.push("m.category CONTAINS $category");
            params.category = args.category;
          }
          
          if (args.edition) {
            whereConditions.push("m.edition = $edition");
            params.edition = args.edition;
          }
          
          if (whereConditions.length > 0) {
            query += "WHERE " + whereConditions.join(" AND ") + " ";
          }
          
          query += "OPTIONAL MATCH (m)-[:BELONGS_TO]->(p:Pharmacopoeia) ";
          
          // 如果需要关联查询，使用 OPTIONAL MATCH
          if (needsRefersTo) {
            query += "OPTIONAL MATCH (m)-[:REFER_TO]->(ref:Medicine) ";
          }
          if (needsRelated) {
            query += "OPTIONAL MATCH (related:Medicine) WHERE related.category = m.category AND related.doc_id <> m.doc_id ";
          }
          
          query += "RETURN m, p";
          if (needsRefersTo) query += ", collect(DISTINCT ref) as refersTo";
          if (needsRelated) query += ", collect(DISTINCT related)[0..5] as relatedByCategory";
          query += " ORDER BY m.doc_id LIMIT 20";
          
          console.log('[GraphQL] 执行查询:', query);
          console.log('[GraphQL] 查询参数:', params);
          
          const result = await session.run(query, params);
          
          console.log('[GraphQL] 查询结果数量:', result.records.length);
          if (result.records.length > 0) {
            console.log('[GraphQL] 第一条记录:', result.records[0].get('m').properties);
          }
          
          return result.records.map(record => {
            const medicine = record.get("m");
            const pharmacopoeia = record.get("p");
            
            const medicineData: any = {
              doc_id: medicine.properties.doc_id || "",
              name: medicine.properties.name || "",
              edition: medicine.properties.edition || "",
              category: medicine.properties.category || "",
              name_pinyin: medicine.properties.name_pinyin || "",
              name_en: medicine.properties.name_en || "",
              content: medicine.properties.content || "",
              pharmacopoeia: pharmacopoeia ? {
                id: pharmacopoeia.identity?.toString() || pharmacopoeia.properties.id || "2998",
                name: pharmacopoeia.properties.name || "中华人民共和国药典2025版",
              } : null,
            };
            
            // 添加关联数据
            if (needsRefersTo) {
              const refersToNodes = record.get("refersTo") || [];
              medicineData.refersTo = refersToNodes
                .filter((n: any) => n && n.properties)
                .map((n: any) => ({
                  doc_id: n.properties.doc_id || "",
                  name: n.properties.name || "",
                  edition: n.properties.edition || "",
                  category: n.properties.category || "",
                  name_pinyin: n.properties.name_pinyin || "",
                  name_en: n.properties.name_en || "",
                  content: n.properties.content || "",
                }));
            }
            
            if (needsRelated) {
              const relatedNodes = record.get("relatedByCategory") || [];
              medicineData.relatedByCategory = relatedNodes
                .filter((n: any) => n && n.properties)
                .map((n: any) => ({
                  doc_id: n.properties.doc_id || "",
                  name: n.properties.name || "",
                  edition: n.properties.edition || "",
                  category: n.properties.category || "",
                  name_pinyin: n.properties.name_pinyin || "",
                  name_en: n.properties.name_en || "",
                  content: n.properties.content || "",
                }));
            }
            
            return medicineData;
          });
        } finally {
          await session.close();
        }
      },
    },
    volumes: {
      type: new GraphQLList(VolumeType),
      resolve: async () => {
        const driver = getNeo4jDriver();
        const session = driver.session();
        
        try {
          const query = "MATCH (v:Volume) RETURN v ORDER BY v.name";
          const result = await session.run(query);
          return result.records.map(record => {
            const node = record.get("v");
            return {
              name: node.properties.name || "",
            };
          });
        } finally {
          await session.close();
        }
      },
    },
    categories: {
      type: new GraphQLList(CategoryType),
      args: {
        volume: { type: GraphQLString },
      },
      resolve: async (_source, args) => {
        const driver = getNeo4jDriver();
        const session = driver.session();
        
        try {
          let query = "MATCH (c:Category) ";
          const params: any = {};
          
          if (args.volume) {
            query += "WHERE c.volume = toInteger($volume) ";
            const volumeMap: Record<string, number> = {
              "第一部": 1,
              "第二部": 2,
              "第三部": 3,
              "第四部": 4,
            };
            params.volume = volumeMap[args.volume] || parseInt(args.volume) || 1;
          }
          
          query += "RETURN c ORDER BY c.volume, c.name";
          
          const result = await session.run(query, params);
          return result.records.map(record => {
            const node = record.get("c");
            return {
              name: node.properties.name || "",
              volume: node.properties.volume?.toNumber ? node.properties.volume.toNumber() : node.properties.volume,
              range_start: node.properties.range_start?.toNumber ? node.properties.range_start.toNumber() : node.properties.range_start,
              range_end: node.properties.range_end?.toNumber ? node.properties.range_end.toNumber() : node.properties.range_end,
            };
          });
        } finally {
          await session.close();
        }
      },
    },
  },
});

export const simpleSchema = new GraphQLSchema({
  query: QueryType,
});

