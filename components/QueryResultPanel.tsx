/**
 * 查询结果面板组件
 * 显示原始的 GraphQL 查询结果
 */

"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Database, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "./ui/button";

interface QueryResultPanelProps {
  result: any;
  onNodeClick?: (nodeId: string) => void;
}

export function QueryResultPanel({ result, onNodeClick }: QueryResultPanelProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  if (!result || !result.medicines || result.medicines.length === 0) {
    return null;
  }

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const medicines = result.medicines;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Database className="mr-2 h-5 w-5 text-blue-600" />
            数据库检索结果
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
              qwen-flash
            </span>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
              {medicines.length} 条
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {medicines.map((medicine: any, index: number) => {
            const isExpanded = expandedItems.has(index);
            const hasContent = medicine.content && medicine.content.length > 0;
            const contentPreview = hasContent 
              ? medicine.content.substring(0, 150) 
              : "无内容";

            return (
              <div
                key={medicine.doc_id || index}
                className="rounded-md border bg-white"
              >
                {/* 标题栏 */}
                <div className="flex items-start justify-between p-3">
                  <div className="flex-1">
                    <button
                      onClick={() => onNodeClick?.(medicine.doc_id)}
                      className="text-left hover:underline"
                    >
                      <h3 className="font-semibold text-blue-600">
                        {medicine.name}
                      </h3>
                    </button>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">
                        ID: {medicine.doc_id}
                      </span>
                      {medicine.edition && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-purple-700">
                          {medicine.edition}
                        </span>
                      )}
                      {medicine.category && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">
                          {medicine.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(index)}
                    className="ml-2"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* 内容预览 */}
                {!isExpanded && hasContent && (
                  <div className="border-t bg-muted/30 px-3 py-2">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {contentPreview}...
                    </p>
                  </div>
                )}

                {/* 展开的详细内容 */}
                {isExpanded && (
                  <div className="border-t p-3">
                    <div className="space-y-3">
                      {/* 基本信息 */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {medicine.name_pinyin && (
                          <div>
                            <span className="font-semibold">拼音：</span>
                            <span className="text-muted-foreground">{medicine.name_pinyin}</span>
                          </div>
                        )}
                        {medicine.name_en && (
                          <div>
                            <span className="font-semibold">英文：</span>
                            <span className="text-muted-foreground">{medicine.name_en}</span>
                          </div>
                        )}
                      </div>

                      {/* 完整内容 */}
                      {hasContent && (
                        <div>
                          <h4 className="mb-2 text-sm font-semibold">正文内容：</h4>
                          <div className="max-h-96 overflow-y-auto rounded-md bg-muted/30 p-3">
                            <p className="whitespace-pre-wrap text-xs leading-relaxed">
                              {medicine.content}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* 引用的通则 */}
                      {medicine.refersTo && medicine.refersTo.length > 0 && (
                        <div>
                          <h4 className="mb-2 text-sm font-semibold">引用的通则 ({medicine.refersTo.length})：</h4>
                          <div className="space-y-2">
                            {medicine.refersTo.map((ref: any, refIdx: number) => (
                              <button
                                key={refIdx}
                                onClick={() => onNodeClick?.(ref.doc_id)}
                                className="w-full rounded border bg-blue-50 p-2 text-left text-xs hover:bg-blue-100"
                              >
                                <div className="font-medium text-blue-900">{ref.name}</div>
                                {ref.category && (
                                  <div className="text-blue-700">{ref.category}</div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 同类药品 */}
                      {medicine.relatedByCategory && medicine.relatedByCategory.length > 0 && (
                        <div>
                          <h4 className="mb-2 text-sm font-semibold">同类药品 ({medicine.relatedByCategory.length})：</h4>
                          <div className="flex flex-wrap gap-2">
                            {medicine.relatedByCategory.map((related: any, relIdx: number) => (
                              <button
                                key={relIdx}
                                onClick={() => onNodeClick?.(related.doc_id)}
                                className="rounded bg-green-100 px-2 py-1 text-xs text-green-800 hover:bg-green-200"
                              >
                                {related.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

