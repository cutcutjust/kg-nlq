/**
 * 顶部导航栏组件
 */

"use client";

import React from "react";
import { Database } from "lucide-react";

export function Topbar() {
  return (
    <div className="border-b bg-background">
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center space-x-3">
          <Database className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">知识图谱自然语言查询系统</h1>
            <p className="text-xs text-muted-foreground">
              Neo4j Knowledge Graph NLQ Browser
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            Powered by Qwen & Neo4j
          </div>
        </div>
      </div>
    </div>
  );
}

