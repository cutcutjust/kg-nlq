/**
 * 聊天面板组件
 * 用户输入问题、选择模式、查看历史
 */

"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Send, Trash2 } from "lucide-react";
import { QueryIntent, ChatHistoryItem } from "@/lib/types";
import { formatTimestamp, truncateText } from "@/lib/utils";

interface ChatPanelProps {
  onSubmit: (question: string, mode: QueryIntent) => void;
  isLoading: boolean;
  history: ChatHistoryItem[];
  onHistorySelect: (item: ChatHistoryItem) => void;
  onClearHistory?: () => void;
}

export function ChatPanel({
  onSubmit,
  isLoading,
  history,
  onHistorySelect,
  onClearHistory,
}: ChatPanelProps) {
  const [question, setQuestion] = useState("");
  // 固定为 browse 模式，因为现在都显示图谱
  const mode: QueryIntent = "browse";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && !isLoading) {
      onSubmit(question.trim(), mode);
      setQuestion("");
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* 输入区域 */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">提问</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 问题输入 */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                输入您的问题
              </label>
              <div className="flex space-x-2">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="例如：阿司匹林的含量测定方法和具体参数"
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button type="submit" disabled={isLoading || !question.trim()}>
                  {isLoading ? (
                    <span className="animate-pulse">处理中...</span>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      提交
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* 示例问题 */}
            <div>
              <p className="mb-2 text-xs text-muted-foreground">示例问题（药检员常用）：</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "阿司匹林的含量测定方法",
                  "阿司匹林的高效液相色谱条件",
                  "阿司匹林游离水杨酸检查的具体步骤",
                  "二甲双胍格列本脲片的鉴别方法",
                  "阿司匹林的检查项目有哪些",
                  "通则0512的具体内容",
                ].map((example, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setQuestion(example)}
                    disabled={isLoading}
                    className="text-xs"
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 历史记录 */}
      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">历史记录</CardTitle>
            {history.length > 0 && onClearHistory && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearHistory}
                className="h-8 text-xs text-muted-foreground hover:text-destructive"
                title="清空历史记录"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                清空
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              暂无历史记录
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onHistorySelect(item)}
                  className="w-full rounded-md border p-3 text-left transition-colors hover:bg-accent"
                >
                  <div className="mb-1">
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(item.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm font-medium">
                    {truncateText(item.question, 50)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {truncateText(item.response.answer, 60)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

