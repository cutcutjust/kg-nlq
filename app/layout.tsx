/**
 * Root Layout
 * 全局布局和元数据
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "知识图谱自然语言查询系统",
  description: "基于 Neo4j 和 LLM 的知识图谱自然语言查询与可视化系统",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>{children}</body>
    </html>
  );
}

