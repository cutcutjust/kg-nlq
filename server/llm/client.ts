/**
 * LLM 客户端抽象
 * 兼容 OpenAI 风格的 Chat Completions API
 * 支持通义千问等兼容接口
 */

import { ChatMessage, LLMResponse } from "@/lib/types";
import { getConfig } from "@/lib/config";

export interface LLMClientOptions {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

/**
 * LLM 客户端类
 */
export class LLMClient {
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private timeout: number;

  constructor(options?: LLMClientOptions) {
    const config = getConfig();
    
    this.baseUrl = options?.baseUrl || config.llm.baseUrl;
    this.apiKey = options?.apiKey || config.llm.apiKey;
    this.model = options?.model || config.llm.model;
    this.temperature = options?.temperature ?? 0.7;
    this.maxTokens = options?.maxTokens ?? 4000;
    this.timeout = options?.timeout ?? 60000;
  }

  /**
   * 调用 Chat Completions API
   */
  async chat(messages: ChatMessage[]): Promise<LLMResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `LLM API 调用失败 (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error("LLM API 返回的响应中没有 choices");
      }

      const content = data.choices[0].message?.content || "";
      const usage = data.usage || undefined;

      return {
        content,
        usage: usage
          ? {
              prompt_tokens: usage.prompt_tokens,
              completion_tokens: usage.completion_tokens,
              total_tokens: usage.total_tokens,
            }
          : undefined,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === "AbortError") {
        throw new Error(`LLM API 调用超时 (${this.timeout}ms)`);
      }
      
      throw error;
    }
  }

  /**
   * 简化的单次对话接口
   */
  async generate(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    const messages: ChatMessage[] = [];
    
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    
    messages.push({ role: "user", content: prompt });
    
    return this.chat(messages);
  }

  /**
   * 带重试的生成
   */
  async generateWithRetry(
    prompt: string,
    systemPrompt?: string,
    maxRetries: number = 2
  ): Promise<LLMResponse> {
    let lastError: Error | null = null;
    
    console.log('\n' + '='.repeat(80));
    console.log('📤 LLM 请求详情');
    console.log('='.repeat(80));
    console.log('[LLM] 模型:', this.model);
    console.log('[LLM] Temperature:', this.temperature);
    console.log('[LLM] Max Tokens:', this.maxTokens);
    console.log('[LLM] System Prompt 长度:', systemPrompt?.length || 0, '字符');
    console.log('[LLM] User Prompt 长度:', prompt.length, '字符');
    console.log('-'.repeat(80));
    
    if (systemPrompt) {
      console.log('📋 System Prompt (前500字符):');
      console.log(systemPrompt.substring(0, 500));
      if (systemPrompt.length > 500) {
        console.log('... (还有', systemPrompt.length - 500, '字符)');
      }
      console.log('-'.repeat(80));
    }
    
    console.log('📝 User Prompt (前1000字符):');
    console.log(prompt.substring(0, 1000));
    if (prompt.length > 1000) {
      console.log('... (还有', prompt.length - 1000, '字符)');
    }
    console.log('='.repeat(80) + '\n');
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const response = await this.generate(prompt, systemPrompt);
        
        console.log('\n' + '='.repeat(80));
        console.log('📥 LLM 响应详情');
        console.log('='.repeat(80));
        console.log('[LLM] 响应长度:', response.content.length, '字符');
        if (response.usage) {
          console.log('[LLM] Token 使用:');
          console.log('  - Prompt Tokens:', response.usage.prompt_tokens);
          console.log('  - Completion Tokens:', response.usage.completion_tokens);
          console.log('  - Total Tokens:', response.usage.total_tokens);
        }
        console.log('-'.repeat(80));
        console.log('💬 响应内容 (前1000字符):');
        console.log(response.content.substring(0, 1000));
        if (response.content.length > 1000) {
          console.log('... (还有', response.content.length - 1000, '字符)');
        }
        console.log('='.repeat(80) + '\n');
        
        return response;
      } catch (error: any) {
        lastError = error;
        console.warn(`❌ LLM 调用失败 (尝试 ${i + 1}/${maxRetries + 1}):`, error.message);
        
        if (i < maxRetries) {
          // 等待后重试
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    
    throw lastError || new Error("LLM 调用失败");
  }
}

/**
 * 创建默认 LLM 客户端实例
 */
let defaultClient: LLMClient | null = null;

export function getDefaultLLMClient(): LLMClient {
  if (!defaultClient) {
    defaultClient = new LLMClient();
  }
  return defaultClient;
}

/**
 * 创建新的 LLM 客户端实例
 */
export function createLLMClient(options?: LLMClientOptions): LLMClient {
  return new LLMClient(options);
}

