/**
 * 图可视化画布组件
 * 使用 Cytoscape.js 渲染知识图谱
 */

"use client";

import React, { useEffect, useRef, useState } from "react";
import { GraphData, HighlightInfo } from "@/lib/types";

// 动态导入 cytoscape，避免 SSR 问题
let cytoscape: any = null;
if (typeof window !== "undefined") {
  cytoscape = require("cytoscape");
}

type Core = any;
type NodeSingular = any;
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Network, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "./ui/button";

interface GraphCanvasProps {
  graph?: GraphData;
  highlight?: HighlightInfo;
  onNodeClick?: (nodeId: string) => void;
}

export function GraphCanvas({ graph, highlight, onNodeClick }: GraphCanvasProps) {
  const normalContainerRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const isDestroyingRef = useRef<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 初始化 Cytoscape
  useEffect(() => {
    const container = isFullscreen ? fullscreenContainerRef.current : normalContainerRef.current;
    if (!container || !cytoscape) {
      console.log('[GraphCanvas] 初始化跳过 - container:', !!container, 'cytoscape:', !!cytoscape, 'isFullscreen:', isFullscreen);
      return;
    }

    console.log('[GraphCanvas] 初始化 Cytoscape - isFullscreen:', isFullscreen);
    
    // 重置销毁标记
    isDestroyingRef.current = false;

    // 创建 Cytoscape 实例
    cyRef.current = cytoscape({
      container: container,
      // 禁用一些可能触发异步渲染的特性
      hideEdgesOnViewport: false,
      textureOnViewport: false,
      motionBlur: false,
      pixelRatio: 'auto',
      style: [
        {
          selector: "node",
          style: {
            "background-color": "#3b82f6",
            label: "data(label)",
            color: "#1e293b",
            "text-valign": "center",
            "text-halign": "center",
            "font-size": "12px",
            width: 40,
            height: 40,
            "text-wrap": "wrap",
            "text-max-width": "80px",
          },
        },
        {
          selector: "node[type='Medicine']",
          style: {
            "background-color": "#10b981",
            width: 50,
            height: 50,
          },
        },
        {
          selector: "node[type='Pharmacopoeia']",
          style: {
            "background-color": "#dc2626",
            width: 80,
            height: 80,
            "font-size": "14px",
            "font-weight": "bold",
            "border-width": 3,
            "border-color": "#991b1b",
          },
        },
        {
          selector: "node[type='Volume']",
          style: {
            "background-color": "#8b5cf6",
          },
        },
        {
          selector: "node[type='Category']",
          style: {
            "background-color": "#f59e0b",
          },
        },
        // 旧的节点类型（保留兼容）
        {
          selector: "node[type='Person']",
          style: {
            "background-color": "#8b5cf6",
          },
        },
        {
          selector: "node[type='Drug']",
          style: {
            "background-color": "#10b981",
          },
        },
        {
          selector: "node[type='Disease']",
          style: {
            "background-color": "#ef4444",
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#94a3b8",
            "target-arrow-color": "#94a3b8",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(label)",
            "font-size": "10px",
            color: "#64748b",
            "text-rotation": "autorotate",
          },
        },
        {
          selector: "edge[type='BELONGS_TO']",
          style: {
            "line-color": "#dc2626",
            "target-arrow-color": "#dc2626",
            width: 3,
          },
        },
        {
          selector: "edge[type='REFER_TO']",
          style: {
            "line-color": "#2563eb",
            "target-arrow-color": "#2563eb",
            "line-style": "dashed",
          },
        },
        {
          selector: "edge[type='RELATED']",
          style: {
            "line-color": "#16a34a",
            "target-arrow-color": "#16a34a",
            "line-style": "dotted",
          },
        },
        {
          selector: ".highlighted",
          style: {
            "background-color": "#f59e0b",
            "line-color": "#f59e0b",
            "target-arrow-color": "#f59e0b",
            width: 4,
            "border-width": 3,
            "border-color": "#fbbf24",
          },
        },
        {
          selector: ".dimmed",
          style: {
            opacity: 0.3,
          },
        },
      ],
      layout: {
        name: "cose",
        animate: true,
        animationDuration: 500,
        nodeRepulsion: 8000,
        idealEdgeLength: 100,
      },
    });

    // 监听节点点击事件
    cyRef.current.on("tap", "node", (event: any) => {
      const node: NodeSingular = event.target;
      const nodeId = node.id();
      if (onNodeClick) {
        onNodeClick(nodeId);
      }
    });

    console.log('[GraphCanvas] Cytoscape 初始化完成');

    return () => {
      console.log('[GraphCanvas] 清理 Cytoscape 实例');
      isDestroyingRef.current = true; // 标记正在销毁
      
      if (cyRef.current) {
        const cyInstance = cyRef.current;
        cyRef.current = null; // 立即置空，防止其他地方使用
        
        try {
          // 检查实例是否已经被销毁
          if (cyInstance.destroyed && cyInstance.destroyed()) {
            console.log('[GraphCanvas] 实例已被销毁，跳过清理');
            return;
          }
          
          // 停止所有动画和布局（这会清除所有 requestAnimationFrame 回调）
          cyInstance.stop();
          
          // 强制清空所有待处理的渲染任务
          if (cyInstance._private && cyInstance._private.renderer) {
            try {
              cyInstance._private.renderer.haltRendering();
            } catch (e) {
              // 忽略，某些版本可能没有这个方法
            }
          }
          
          // 移除事件监听器
          cyInstance.removeAllListeners();
          
          // 然后销毁实例
          cyInstance.destroy();
          console.log('[GraphCanvas] 清理完成');
        } catch (error) {
          console.warn('[GraphCanvas] 清理时出错:', error);
        }
      }
    };
  }, [onNodeClick, isFullscreen]);

  // 更新图数据
  useEffect(() => {
    // 等待 Cytoscape 实例初始化完成
    if (!cyRef.current || isDestroyingRef.current) {
      console.log('[GraphCanvas] 等待 Cytoscape 初始化...');
      return;
    }
    
    if (!graph) {
      console.log('[GraphCanvas] 没有图数据');
      return;
    }

    console.log('[GraphCanvas] 更新图数据:', {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      nodeTypes: [...new Set(graph.nodes.map(n => n.type))],
      edgeTypes: [...new Set(graph.edges.map(e => e.type))],
      isFullscreen: isFullscreen,
    });
    
    if (graph.nodes.length > 0) {
      console.log('[GraphCanvas] 节点示例:', graph.nodes.slice(0, 3).map(n => ({
        id: n.id,
        label: n.label,
        type: n.type
      })));
    }
    
    if (graph.edges.length > 0) {
      console.log('[GraphCanvas] 边示例:', graph.edges.slice(0, 3).map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type
      })));
    }

    const cy = cyRef.current;
    let isCancelled = false;

    try {
      // 批量更新，减少重绘
      cy.startBatch();
      
      // 清空现有元素
      cy.elements().remove();

      // 转换为 Cytoscape 格式
      const elements = [
        ...graph.nodes.map((node) => ({
          data: {
            id: node.id,
            label: node.label,
            type: node.type,
            ...node.properties,
          },
        })),
        ...graph.edges.map((edge) => ({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: edge.type,
            ...edge.properties,
          },
        })),
      ];

      console.log('[GraphCanvas] Cytoscape elements:', elements.length);

      // 添加元素
      cy.add(elements);
      
      // 结束批量更新（这会触发渲染循环）
      cy.endBatch();
      
      // 立即停止所有正在运行的动画和布局
      cy.stop();

      // 使用 preset 布局手动计算位置，避免任何异步操作
      const nodes = cy.nodes();
      const nodeCount = nodes.length;
      const radius = Math.max(150, nodeCount * 15);
      const angleStep = (2 * Math.PI) / Math.max(nodeCount, 1);
      
      // 手动设置每个节点的位置（圆形布局）
      nodes.forEach((node: any, index: number) => {
        const angle = index * angleStep;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        node.position({ x, y });
      });

      console.log('[GraphCanvas] 布局已应用: manual-circle');

      // 立即适应视图，不使用任何异步操作
      try {
        if (!isCancelled && !isDestroyingRef.current && cyRef.current === cy && !cy.destroyed()) {
          cy.fit(undefined, 50);
          console.log('[GraphCanvas] 视图已适应');
        }
      } catch (fitError) {
        // 捕获 fit 时可能的错误（如果实例正在被销毁）
        console.warn('[GraphCanvas] 适应视图时出错:', fitError);
      }
    } catch (error) {
      console.error('[GraphCanvas] 更新图数据时出错:', error);
      // 即使出错也要结束批量更新
      try {
        cy.endBatch();
      } catch (e) {
        // 忽略
      }
    }

    return () => {
      isCancelled = true;
    };
  }, [graph, isFullscreen]);

  // 更新高亮
  useEffect(() => {
    if (!cyRef.current || isDestroyingRef.current) return;

    const cy = cyRef.current;

    try {
      // 检查实例是否有效
      if (cy.destroyed && cy.destroyed()) {
        return;
      }

      // 移除之前的高亮
      cy.elements().removeClass("highlighted dimmed");

      if (highlight && (highlight.nodeIds.length > 0 || highlight.edgeIds.length > 0)) {
        // 高亮指定的节点和边
        const highlightedElements = cy.collection();

        highlight.nodeIds.forEach((nodeId) => {
          const node = cy.getElementById(nodeId);
          if (node.length > 0) {
            highlightedElements.merge(node);
          }
        });

        highlight.edgeIds.forEach((edgeId) => {
          const edge = cy.getElementById(edgeId);
          if (edge.length > 0) {
            highlightedElements.merge(edge);
          }
        });

        if (highlightedElements.length > 0) {
          highlightedElements.addClass("highlighted");

          // 将其他元素变暗
          cy.elements().not(highlightedElements).addClass("dimmed");

          // 检查实例仍然有效才执行动画
          if (!isDestroyingRef.current && cyRef.current === cy && (!cy.destroyed || !cy.destroyed())) {
            // 聚焦到高亮元素
            cy.animate({
              fit: {
                eles: highlightedElements,
                padding: 100,
              },
              duration: 500,
            });
          }
        }
      }
    } catch (error) {
      console.warn('[GraphCanvas] 更新高亮时出错:', error);
    }
  }, [highlight]);

  // 切换全屏
  const toggleFullscreen = () => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);
    
    // 不需要延迟，因为 useEffect 会处理重新创建
    console.log('[GraphCanvas] 切换全屏:', newFullscreenState);
  };

  // 监听 ESC 键退出全屏
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    
    if (isFullscreen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isFullscreen]);

  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center">
              <Network className="mr-2 h-5 w-5" />
              知识图谱
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="h-8 w-8 p-0"
              title="全屏显示"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100%-5rem)]">
          {!graph || (graph.nodes.length === 0 && graph.edges.length === 0) ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Network className="mx-auto mb-2 h-12 w-12 opacity-20" />
                <p>暂无图数据</p>
                <p className="mt-1 text-sm">输入查询后将显示相关药品节点</p>
              </div>
            </div>
          ) : (
            <div
              ref={normalContainerRef}
              className="h-full w-full rounded-md border bg-slate-50"
            />
          )}
        </CardContent>
      </Card>

      {/* 全屏模态框 */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="flex h-full flex-col">
            {/* 全屏标题栏 */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center">
                <Network className="mr-2 h-6 w-6" />
                <h2 className="text-xl font-semibold">知识图谱 - 全屏视图</h2>
                {graph && (
                  <span className="ml-4 text-sm text-muted-foreground">
                    {graph.nodes.length} 个节点, {graph.edges.length} 条边
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="h-9 w-9 p-0"
                title="退出全屏 (ESC)"
              >
                <Minimize2 className="h-5 w-5" />
              </Button>
            </div>

            {/* 全屏画布 */}
            <div className="flex-1 p-6">
              {!graph || (graph.nodes.length === 0 && graph.edges.length === 0) ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Network className="mx-auto mb-4 h-24 w-24 opacity-20" />
                    <p className="text-xl">暂无图数据</p>
                    <p className="mt-2">输入查询后将显示相关药品节点</p>
                  </div>
                </div>
              ) : (
                <div
                  ref={fullscreenContainerRef}
                  className="h-full w-full rounded-md border bg-slate-50"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

