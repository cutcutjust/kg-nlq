/**
 * 知识库管理页面
 * 提供Neo4j节点和关系的增删改查功能
 */

"use client";

import React, { useState } from "react";
import { Topbar } from "@/components/Topbar";
import { NodeManager } from "@/components/admin/NodeManager";
import { RelationshipManager } from "@/components/admin/RelationshipManager";
import { Database, Network } from "lucide-react";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"nodes" | "relationships">("nodes");

  return (
    <div className="flex h-screen flex-col">
      {/* 顶部导航栏 */}
      <Topbar />

      {/* 主内容区域 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 标签页导航 */}
        <div className="border-b bg-background">
          <div className="flex space-x-1 px-6 pt-4">
            <button
              className={`flex items-center space-x-2 rounded-t-lg px-4 py-2 ${
                activeTab === "nodes"
                  ? "border-b-2 border-primary bg-background font-semibold text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => setActiveTab("nodes")}
            >
              <Database className="h-4 w-4" />
              <span>节点管理</span>
            </button>
            <button
              className={`flex items-center space-x-2 rounded-t-lg px-4 py-2 ${
                activeTab === "relationships"
                  ? "border-b-2 border-primary bg-background font-semibold text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => setActiveTab("relationships")}
            >
              <Network className="h-4 w-4" />
              <span>关系管理</span>
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-6xl">
            {activeTab === "nodes" ? (
              <div>
                <div className="mb-4">
                  <h2 className="text-2xl font-bold">节点管理</h2>
                  <p className="text-muted-foreground">
                    查看、创建、编辑和删除Neo4j图数据库中的节点
                  </p>
                </div>
                <NodeManager />
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <h2 className="text-2xl font-bold">关系管理</h2>
                  <p className="text-muted-foreground">
                    查看、创建、编辑和删除Neo4j图数据库中的关系
                  </p>
                </div>
                <RelationshipManager />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

