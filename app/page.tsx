/**
 * 主页面
 * 整合所有组件，实现完整的交互流程
 */

"use client";

import React, { useState } from "react";
import { Topbar } from "@/components/Topbar";
import { ChatPanel } from "@/components/ChatPanel";
import { AnswerPanel } from "@/components/AnswerPanel";
import { QueryResultPanel } from "@/components/QueryResultPanel";
import { EvidenceList } from "@/components/EvidenceList";
import { GraphCanvas } from "@/components/GraphCanvas";
import { NodeDetailPanel } from "@/components/NodeDetailPanel";
import {
  NLQResponse,
  QueryIntent,
  HighlightInfo,
  ChatHistoryItem,
  GraphNode,
} from "@/lib/types";
import { generateId } from "@/lib/utils";

export default function HomePage() {
  const [response, setResponse] = useState<NLQResponse | null>(null);
  const [queryResult, setQueryResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false); // 新增：智能答案加载状态
  const [highlight, setHighlight] = useState<HighlightInfo | undefined>();
  const [highlightedEvidence, setHighlightedEvidence] = useState<number | null>(
    null
  );
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  /**
   * 提交查询（分阶段处理）
   */
  const handleSubmit = async (question: string, mode: QueryIntent) => {
    // 先清理状态，避免 DOM 操作冲突
    setHighlight(undefined);
    setHighlightedEvidence(null);
    setError(null);
    
    // 延迟清空数据，避免 React 渲染冲突
    setTimeout(() => {
      setResponse(null);
      setQueryResult(null);
    }, 0);
    
    setIsLoading(true);
    setIsLoadingAnswer(false);

    try {
      // ========== 阶段 1: 快速获取查询结果 ==========
      console.log("🚀 开始阶段 1: 获取数据库查询结果...");
      
      const stage1Res = await fetch("/api/nlq-staged?stage=1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          mode,
        }),
      });

      if (!stage1Res.ok) {
        const errorData = await stage1Res.json();
        throw new Error(errorData.message || "查询失败");
      }

      const stage1Data = await stage1Res.json();
      console.log("✅ 阶段 1 完成：查询结果已获取", stage1Data);
      
      // 立即显示查询结果
      setQueryResult(stage1Data.queryResult);
      
      // 创建临时响应对象（用于显示图和证据）
      const tempResponse: NLQResponse = {
        plan: stage1Data.plan,
        answer: "", // 暂时为空
        evidence: stage1Data.evidence || [],
        graph: stage1Data.graph,
        warnings: stage1Data.warnings,
        queryResult: stage1Data.queryResult,
      };
      setResponse(tempResponse);
      
      setIsLoading(false); // 阶段 1 完成，停止主加载状态
      setIsLoadingAnswer(true); // 开始加载智能答案

      // ========== 阶段 2: 生成智能答案（后台进行）==========
      console.log("🚀 开始阶段 2: 生成智能答案...");
      
      const stage2Res = await fetch("/api/nlq-staged?stage=2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          plan: stage1Data.plan,
          queryResult: stage1Data.queryResult,
        }),
      });

      if (!stage2Res.ok) {
        const errorData = await stage2Res.json();
        console.error("阶段 2 失败:", errorData.message);
        // 即使阶段 2 失败，也保留阶段 1 的结果
        setIsLoadingAnswer(false);
        return;
      }

      const stage2Data = await stage2Res.json();
      console.log("✅ 阶段 2 完成：智能答案已生成", stage2Data);
      
      // 更新完整响应
      const fullResponse: NLQResponse = {
        plan: stage1Data.plan,
        answer: stage2Data.answer,
        evidence: stage2Data.evidence.length > 0 ? stage2Data.evidence : stage1Data.evidence,
        graph: stage1Data.graph,
        warnings: stage1Data.warnings,
        queryResult: stage1Data.queryResult,
      };
      setResponse(fullResponse);
      setIsLoadingAnswer(false);

      // 添加到历史记录
      const historyItem: ChatHistoryItem = {
        id: generateId(),
        question,
        response: fullResponse,
        timestamp: Date.now(),
      };
      setHistory((prev) => [historyItem, ...prev.slice(0, 19)]); // 保留最近20条
    } catch (err: any) {
      console.error("查询错误:", err);
      setError(err.message || "查询失败，请检查网络连接和服务配置");
      setIsLoading(false);
      setIsLoadingAnswer(false);
    }
  };

  /**
   * 点击证据项
   */
  const handleEvidenceClick = (highlightInfo: HighlightInfo, index: number) => {
    setHighlight(highlightInfo);
    setHighlightedEvidence(index);
  };

  /**
   * 点击节点（显示详情）
   */
  const handleNodeClick = async (nodeId: string) => {
    console.log("节点被点击:", nodeId);
    
    // 从图数据中查找节点
    if (response?.graph) {
      const node = response.graph.nodes.find(n => n.id === nodeId);
      if (node) {
        setSelectedNode(node);
      }
    }
  };

  /**
   * 选择历史记录
   */
  const handleHistorySelect = (item: ChatHistoryItem) => {
    setResponse(item.response);
    setHighlight(undefined);
    setHighlightedEvidence(null);
    setError(null);
  };

  return (
    <div className="flex h-screen flex-col">
      {/* 顶部导航栏 */}
      <Topbar />

      {/* 主内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：聊天面板 */}
        <div className="w-96 overflow-y-auto border-r p-4">
          <ChatPanel
            onSubmit={handleSubmit}
            isLoading={isLoading}
            history={history}
            onHistorySelect={handleHistorySelect}
          />
        </div>

        {/* 右侧：答案和图可视化 */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* 上半部分：答案和证据 */}
          <div className="overflow-y-auto border-b p-4">
            <div className="space-y-4">
              {/* 错误提示 */}
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-4">
                  <h3 className="font-semibold text-red-900">查询失败</h3>
                  <p className="mt-1 text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* 查询结果面板（原始数据） */}
              {queryResult && (
                <QueryResultPanel
                  result={queryResult}
                  onNodeClick={handleNodeClick}
                />
              )}

              {/* LLM 生成的答案 */}
              <AnswerPanel response={response} isLoadingAnswer={isLoadingAnswer} />

              {/* 证据列表 */}
              {response && response.evidence.length > 0 && (
                <EvidenceList
                  evidence={response.evidence}
                  onEvidenceClick={(highlightInfo) => {
                    const index = response.evidence.findIndex(
                      (e) =>
                        JSON.stringify(e.nodeIds) ===
                          JSON.stringify(highlightInfo.nodeIds) &&
                        JSON.stringify(e.edgeIds) ===
                          JSON.stringify(highlightInfo.edgeIds)
                    );
                    handleEvidenceClick(highlightInfo, index);
                  }}
                  highlightedEvidence={highlightedEvidence}
                  onNodeDetailClick={handleNodeClick}
                />
              )}
            </div>
          </div>

          {/* 下半部分：图可视化 */}
          <div className="flex-1 p-4">
            <GraphCanvas
              graph={response?.graph}
              highlight={highlight}
              onNodeClick={handleNodeClick}
            />
          </div>
        </div>
      </div>

      {/* 节点详情面板 */}
      <NodeDetailPanel
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        onNodeClick={handleNodeClick}
      />
    </div>
  );
}

