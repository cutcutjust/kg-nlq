/**
 * NLQ API Route
 * 处理自然语言查询请求
 */

import { NextRequest, NextResponse } from "next/server";
import { NLQRequest, NLQResponse } from "@/lib/types";
import { processNLQ } from "@/server/nlq/orchestrator";

/**
 * POST /api/nlq
 * 处理自然语言查询请求
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();

    // 验证请求格式
    if (!body.question || typeof body.question !== "string") {
      return NextResponse.json(
        { error: "缺少 question 字段或格式不正确" },
        { status: 400 }
      );
    }

    if (!body.mode || !["qa", "browse"].includes(body.mode)) {
      return NextResponse.json(
        { error: "mode 必须是 'qa' 或 'browse'" },
        { status: 400 }
      );
    }

    // 构建 NLQ 请求
    const nlqRequest: NLQRequest = {
      question: body.question.trim(),
      mode: body.mode,
      context: body.context || {},
    };

    // 简单的速率限制（可选，基于 IP）
    // TODO: 实现更完善的速率限制

    // 处理查询
    const response: NLQResponse = await processNLQ(nlqRequest);

    // 返回响应
    return NextResponse.json(response);
  } catch (error: any) {
    console.error("NLQ API 错误:", error);

    // 返回友好的错误信息
    return NextResponse.json(
      {
        error: "查询处理失败",
        message: error.message || "未知错误",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/nlq
 * 返回 API 信息
 */
export async function GET() {
  return NextResponse.json({
    name: "Neo4j Knowledge Graph NLQ API",
    version: "1.0.0",
    description: "自然语言查询知识图谱",
    endpoints: {
      POST: {
        description: "提交自然语言查询",
        body: {
          question: "string (必需)",
          mode: "'qa' | 'browse' (必需)",
          context: "object (可选)",
        },
      },
    },
  });
}

