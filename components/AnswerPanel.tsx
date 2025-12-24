/**
 * 答案显示面板
 * 展示自然语言答案、警告、调试信息
 */

"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { AlertCircle, Code, CheckCircle, Loader2 } from "lucide-react";
import { NLQResponse } from "@/lib/types";

interface AnswerPanelProps {
  response: NLQResponse | null;
  isLoadingAnswer?: boolean; // 新增：智能答案加载状态
}

export function AnswerPanel({ response, isLoadingAnswer }: AnswerPanelProps) {
  // 如果正在加载且还没有任何响应，显示等待状态
  if (!response && !isLoadingAnswer) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">
            请在左侧输入问题并提交查询
          </p>
        </CardContent>
      </Card>
    );
  }

  // 如果正在加载答案但还没有 response，显示简化版本
  if (!response && isLoadingAnswer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
            智能回答
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="font-semibold">AI 分析</h3>
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                qwen-plus
              </span>
            </div>
            <div className="rounded-md bg-gradient-to-br from-purple-50 to-blue-50 p-8 border border-purple-100">
              <div className="flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                <p className="text-sm text-purple-700 font-medium">
                  正在使用 qwen-plus 生成智能回答...
                </p>
                <p className="text-xs text-muted-foreground">
                  这可能需要几秒钟时间
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!response) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">
            请在左侧输入问题并提交查询
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
          智能回答
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 警告信息 */}
        {response.warnings && response.warnings.length > 0 && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
            <div className="flex items-start">
              <AlertCircle className="mr-2 h-5 w-5 text-yellow-600" />
              <div className="flex-1">
                <h4 className="font-medium text-yellow-900">注意事项</h4>
                <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-yellow-800">
                  {response.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 答案 */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <h3 className="font-semibold">AI 分析</h3>
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
              qwen-plus
            </span>
          </div>
          
          {isLoadingAnswer ? (
            // 加载中状态
            <div className="rounded-md bg-gradient-to-br from-purple-50 to-blue-50 p-8 border border-purple-100">
              <div className="flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                <p className="text-sm text-purple-700 font-medium">
                  正在使用 qwen-plus 生成智能回答...
                </p>
                <p className="text-xs text-muted-foreground">
                  这可能需要几秒钟时间
                </p>
              </div>
            </div>
          ) : response.answer ? (
            // 答案已生成
            <div className="rounded-md bg-gradient-to-br from-purple-50 to-blue-50 p-4 border border-purple-100">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                {response.answer}
              </p>
            </div>
          ) : (
            // 没有答案
            <div className="rounded-md bg-muted p-4 border border-dashed">
              <p className="text-sm text-muted-foreground text-center">
                等待生成智能回答...
              </p>
            </div>
          )}
        </div>

        {/* 调试面板（折叠） */}
        <Accordion type="single" collapsible>
          <AccordionItem value="debug">
            <AccordionTrigger className="text-sm">
              <div className="flex items-center">
                <Code className="mr-2 h-4 w-4" />
                <span>调试信息</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                {/* 查询计划 */}
                <div>
                  <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
                    查询计划
                  </h4>
                  <div className="rounded-md bg-slate-950 p-3">
                    <pre className="text-xs text-slate-50 overflow-x-auto">
                      {JSON.stringify(response.plan, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* GraphQL 查询 */}
                <div>
                  <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
                    GraphQL 查询
                  </h4>
                  <div className="rounded-md bg-slate-950 p-3">
                    <pre className="text-xs text-slate-50 overflow-x-auto">
                      {response.plan.query}
                    </pre>
                  </div>
                </div>

                {/* 变量 */}
                <div>
                  <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
                    查询变量
                  </h4>
                  <div className="rounded-md bg-slate-950 p-3">
                    <pre className="text-xs text-slate-50 overflow-x-auto">
                      {JSON.stringify(response.plan.variables, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* 图统计 */}
                {response.graph && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
                      子图统计
                    </h4>
                    <div className="flex space-x-4 text-sm">
                      <span>节点: {response.graph.nodes.length}</span>
                      <span>边: {response.graph.edges.length}</span>
                    </div>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

