/**
 * 顶部导航栏组件
 */

"use client";

import React from "react";
import { Database, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Topbar() {
  const pathname = usePathname();
  const isAdminPage = pathname === "/admin";

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
          {/* 导航链接 */}
          <nav className="flex items-center space-x-2">
            <Link
              href="/"
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                !isAdminPage
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              自然语言查询
            </Link>
            <Link
              href="/admin"
              className={`flex items-center space-x-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isAdminPage
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>知识库管理</span>
            </Link>
          </nav>
          <div className="text-sm text-muted-foreground">
            Powered by Qwen & Neo4j
          </div>
        </div>
      </div>
    </div>
  );
}

