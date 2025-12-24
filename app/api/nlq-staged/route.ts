/**
 * NLQ Staged API Route
 * 支持分阶段处理：先返回查询结果，后返回智能答案
 */

import { NextRequest, NextResponse } from "next/server";
import { NLQRequest, QueryPlan } from "@/lib/types";
import { processNLQStage1, processNLQStage2 } from "@/server/nlq/orchestrator";

/**
 * POST /api/nlq-staged?stage=1
 * 阶段 1: 快速返回查询结果
 */
/**
 * POST /api/nlq-staged?stage=2
 * 阶段 2: 生成智能答案
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const stage = searchParams.get("stage");

    if (stage === "1") {
      // ========== 阶段 1: 快速返回查询结果 ==========
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

      // 处理阶段 1
      const stage1Response = await processNLQStage1(nlqRequest);

      // 返回阶段 1 响应
      return NextResponse.json({
        stage: 1,
        ...stage1Response,
      });
    } else if (stage === "2") {
      // ========== 阶段 2: 生成智能答案 ==========
      const body = await request.json();

      // 验证请求格式
      if (!body.question || !body.plan || !body.queryResult) {
        return NextResponse.json(
          { error: "阶段 2 需要 question, plan, queryResult 字段" },
          { status: 400 }
        );
      }

      // 处理阶段 2
      const stage2Response = await processNLQStage2(
        body.question,
        body.plan as QueryPlan,
        body.queryResult
      );

      // 返回阶段 2 响应
      return NextResponse.json({
        stage: 2,
        ...stage2Response,
      });
    } else {
      return NextResponse.json(
        { error: "stage 参数必须是 '1' 或 '2'" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("NLQ Staged API 错误:", error);

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
 * GET /api/nlq-staged
 * 返回 API 信息
 */
export async function GET() {
  return NextResponse.json({
    name: "Neo4j Knowledge Graph NLQ Staged API",
    version: "1.0.0",
    description: "分阶段处理自然语言查询",
    stages: {
      stage1: {
        description: "快速返回数据库查询结果（使用 qwen-flash）",
        endpoint: "POST /api/nlq-staged?stage=1",
        body: {
          question: "string (必需)",
          mode: "'qa' | 'browse' (必需)",
          context: "object (可选)",
        },
        response: {
          stage: 1,
          plan: "QueryPlan",
          queryResult: "any",
          graph: "GraphData",
          evidence: "EvidenceItem[]",
          warnings: "string[]",
        },
      },
      stage2: {
        description: "生成智能答案（使用 qwen-plus）",
        endpoint: "POST /api/nlq-staged?stage=2",
        body: {
          question: "string (必需)",
          plan: "QueryPlan (来自阶段 1)",
          queryResult: "any (来自阶段 1)",
        },
        response: {
          stage: 2,
          answer: "string",
          evidence: "EvidenceItem[]",
        },
      },
    },
  });
}

