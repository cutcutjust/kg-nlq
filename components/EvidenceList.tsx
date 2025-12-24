/**
 * 证据列表组件
 * 显示证据项，点击可高亮对应的节点和边
 */

"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { FileText, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { EvidenceItem, HighlightInfo } from "@/lib/types";

interface EvidenceListProps {
  evidence: EvidenceItem[];
  onEvidenceClick: (highlight: HighlightInfo) => void;
  highlightedEvidence: number | null;
  onNodeDetailClick?: (nodeId: string) => void;
}

export function EvidenceList({
  evidence,
  onEvidenceClick,
  highlightedEvidence,
  onNodeDetailClick,
}: EvidenceListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (evidence.length === 0) {
    return null;
  }

  const toggleExpand = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <FileText className="mr-2 h-5 w-5" />
          证据列表
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {evidence.map((item, index) => (
            <div
              key={index}
              className={`rounded-md border transition-all ${
                highlightedEvidence === index
                  ? "border-primary bg-primary/5 shadow-md"
                  : "hover:border-primary/50"
              }`}
            >
              <button
                onClick={() =>
                  onEvidenceClick({
                    nodeIds: item.nodeIds,
                    edgeIds: item.edgeIds,
                  })
                }
                className="w-full p-3 text-left"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {index + 1}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          点击高亮节点
                        </span>
                      </div>
                      <button
                        onClick={(e) => toggleExpand(index, e)}
                        className="flex items-center text-xs text-primary hover:underline"
                      >
                        {expandedIndex === index ? (
                          <>
                            <ChevronUp className="mr-1 h-3 w-3" />
                            收起
                          </>
                        ) : (
                          <>
                            <ChevronDown className="mr-1 h-3 w-3" />
                            详情
                          </>
                        )}
                      </button>
                    </div>
                    <p className={`text-sm leading-relaxed ${expandedIndex === index ? "" : "line-clamp-2"}`}>
                      {item.text}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {item.nodeIds.length > 0 && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">
                          {item.nodeIds.length} 节点
                        </span>
                      )}
                      {item.edgeIds.length > 0 && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">
                          {item.edgeIds.length} 边
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>

              {/* 展开的详细信息 */}
              {expandedIndex === index && (
                <div className="border-t bg-muted/30 p-3">
                  <div className="space-y-2 text-xs">
                    {item.nodeIds.length > 0 && (
                      <div>
                        <span className="font-semibold text-muted-foreground">关联节点:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.nodeIds.map((nodeId) => (
                            <button
                              key={nodeId}
                              onClick={(e) => {
                                e.stopPropagation();
                                onNodeDetailClick?.(nodeId);
                              }}
                              className="group flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-blue-800 transition-colors hover:bg-blue-200"
                            >
                              <code className="text-xs">{nodeId}</code>
                              <Eye className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {item.edgeIds.length > 0 && (
                      <div>
                        <span className="font-semibold text-muted-foreground">关联边 ID:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.edgeIds.map((edgeId) => (
                            <code key={edgeId} className="rounded bg-green-100 px-1.5 py-0.5 text-green-800">
                              {edgeId}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

