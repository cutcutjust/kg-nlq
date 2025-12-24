/**
 * 节点详情面板组件
 * 显示节点的完整信息
 */

"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { X, Info, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";
import { GraphNode } from "@/lib/types";

interface NodeDetailPanelProps {
  node: GraphNode | null;
  onClose: () => void;
  onNodeClick?: (nodeId: string) => void;
}

export function NodeDetailPanel({ node, onClose, onNodeClick }: NodeDetailPanelProps) {
  if (!node) return null;

  // 获取节点类型对应的颜色
  const getTypeColor = (type: string) => {
    switch (type) {
      case "Medicine":
        return "bg-green-100 text-green-800 border-green-300";
      case "Pharmacopoeia":
        return "bg-red-100 text-red-800 border-red-300";
      case "Volume":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "Category":
        return "bg-amber-100 text-amber-800 border-amber-300";
      default:
        return "bg-blue-100 text-blue-800 border-blue-300";
    }
  };

  // 格式化属性值
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "无";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    if (typeof value === "string" && value.length > 500) {
      return value.substring(0, 500) + "...";
    }
    return String(value);
  };

  // 获取显示的属性（排除一些内部属性）
  const getDisplayProperties = () => {
    const excludeKeys = ["__typename", "refersTo", "relatedByCategory", "pharmacopoeia"];
    return Object.entries(node.properties || {})
      .filter(([key]) => !excludeKeys.includes(key))
      .sort(([a], [b]) => {
        // 重要字段排在前面
        const priority: Record<string, number> = {
          doc_id: 1,
          id: 1,
          name: 2,
          edition: 3,
          category: 4,
          name_pinyin: 5,
          name_en: 6,
        };
        return (priority[a] || 999) - (priority[b] || 999);
      });
  };

  // 获取关联节点信息
  const getRelatedNodes = () => {
    const related: { type: string; nodes: any[] }[] = [];
    
    if (node.properties?.refersTo && Array.isArray(node.properties.refersTo)) {
      related.push({ type: "引用的通则", nodes: node.properties.refersTo });
    }
    
    if (node.properties?.relatedByCategory && Array.isArray(node.properties.relatedByCategory)) {
      related.push({ type: "同类药品", nodes: node.properties.relatedByCategory });
    }
    
    if (node.properties?.pharmacopoeia) {
      related.push({ type: "所属药典", nodes: [node.properties.pharmacopoeia] });
    }
    
    return related;
  };

  const displayProperties = getDisplayProperties();
  const relatedNodes = getRelatedNodes();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="max-h-[90vh] w-full max-w-3xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="flex items-center text-lg">
            <Info className="mr-2 h-5 w-5" />
            节点详情
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="overflow-y-auto p-6" style={{ maxHeight: "calc(90vh - 5rem)" }}>
          <div className="space-y-4">
            {/* 节点基本信息 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getTypeColor(node.type)}`}>
                  {node.type}
                </span>
                <span className="text-xs text-muted-foreground">ID: {node.id}</span>
              </div>
              <h2 className="text-2xl font-bold">{node.label}</h2>
            </div>

            {/* 属性列表 */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">属性信息</h3>
              <div className="space-y-2">
                {displayProperties.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无属性信息</p>
                ) : (
                  displayProperties.map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-md border bg-muted/30 p-3"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">
                          {key}
                        </span>
                        {typeof value === "string" && value.length > 100 && (
                          <span className="text-xs text-muted-foreground">
                            {value.length} 字符
                          </span>
                        )}
                      </div>
                      <div className="text-sm">
                        {key === "content" && typeof value === "string" && value.length > 500 ? (
                          <div className="space-y-2">
                            <p className="whitespace-pre-wrap">{value.substring(0, 500)}...</p>
                            <details className="cursor-pointer">
                              <summary className="text-xs text-primary hover:underline">
                                显示完整内容 ({value.length} 字符)
                              </summary>
                              <p className="mt-2 whitespace-pre-wrap">{value}</p>
                            </details>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap break-words">
                            {formatValue(value)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
             </div>

             {/* 关联节点 */}
             {relatedNodes.length > 0 && (
               <div className="space-y-3">
                 <h3 className="text-sm font-semibold text-muted-foreground">关联节点</h3>
                 {relatedNodes.map((group, idx) => (
                   <div key={idx} className="rounded-md border bg-muted/30 p-3">
                     <div className="mb-2 text-xs font-semibold text-muted-foreground">
                       {group.type}
                     </div>
                     <div className="space-y-2">
                       {group.nodes.map((relatedNode: any, nodeIdx: number) => {
                         const nodeId = relatedNode.doc_id || relatedNode.id;
                         const nodeName = relatedNode.name || nodeId;
                         return (
                           <button
                             key={nodeIdx}
                             onClick={() => {
                               if (onNodeClick && nodeId) {
                                 onNodeClick(nodeId);
                               }
                             }}
                             className="flex w-full items-center justify-between rounded border bg-white p-2 text-left text-sm transition-colors hover:bg-accent"
                           >
                             <div className="flex-1">
                               <div className="font-medium">{nodeName}</div>
                               {relatedNode.category && (
                                 <div className="text-xs text-muted-foreground">
                                   {relatedNode.category}
                                 </div>
                               )}
                             </div>
                             <ExternalLink className="h-4 w-4 text-muted-foreground" />
                           </button>
                         );
                       })}
                     </div>
                   </div>
                 ))}
               </div>
             )}

             {/* 原始数据（折叠） */}
             <details className="rounded-md border bg-muted/30 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
                查看原始 JSON 数据
              </summary>
              <pre className="mt-2 overflow-x-auto text-xs">
                {JSON.stringify(node, null, 2)}
              </pre>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

