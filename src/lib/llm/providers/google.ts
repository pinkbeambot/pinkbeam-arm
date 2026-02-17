/**
 * Google Gemini Provider Implementation
 * Handles API calls to Google's Gemini models
 */

import {
  LLMProvider,
  LLMModel,
  LLMRequest,
  LLMResponse,
  LLMMessage,
  LLMFunction,
} from '../types';
import { BaseProvider, ProviderTool, LLMStreamChunk } from './base';

// Gemini model definitions
export const GEMINI_MODELS: LLMModel[] = [
  {
    id: 'gemini-1.5-pro',
    provider: 'google',
    displayName: 'Gemini 1.5 Pro',
    contextWindow: 2000000, // 2M tokens
    maxOutputTokens: 8192,
    supportsFunctions: true,
    supportsVision: true,
    costPer1KInput: 0.0035,
    costPer1KOutput: 0.0105,
    latencyProfile: 'balanced',
  },
  {
    id: 'gemini-1.5-flash',
    provider: 'google',
    displayName: 'Gemini 1.5 Flash',
    contextWindow: 1000000, // 1M tokens
    maxOutputTokens: 8192,
    supportsFunctions: true,
    supportsVision: true,
    costPer1KInput: 0.00035,
    costPer1KOutput: 0.00105,
    latencyProfile: 'fast',
  },
  {
    id: 'gemini-1.0-pro',
    provider: 'google',
    displayName: 'Gemini 1.0 Pro',
    contextWindow: 32768,
    maxOutputTokens: 2048,
    supportsFunctions: true,
    supportsVision: false,
    costPer1KInput: 0.0005,
    costPer1KOutput: 0.0015,
    latencyProfile: 'balanced',
  },
];

// Gemini API types
interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
  functionResponse?: {
    name: string;
    response: Record<string, unknown>;
  };
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface GeminiTool {
  functionDeclarations: GeminiFunctionDeclaration[];
}

interface GeminiResponse {
  candidates: {
    content: GeminiContent;
    finishReason: 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'OTHER';
    safetyRatings: {
      category: string;
      probability: string;
    }[];
  }[];
  promptFeedback?: {
    safetyRatings: {
      category: string;
      probability: string;
    }[];
  };
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export interface GoogleConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

export class GoogleProvider extends BaseProvider {
  readonly name: LLMProvider = 'google';
  readonly models = GEMINI_MODELS;
  
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: GoogleConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    this.defaultModel = config.defaultModel || 'gemini-1.5-pro';
  }

  /**
   * Convert generic messages to Gemini format
   * Gemini uses alternating user/model roles
   */
  private convertMessages(messages: LLMMessage[]): { contents: GeminiContent[]; systemInstruction?: string } {
    const contents: GeminiContent[] = [];
    let systemInstruction: string | undefined;

    for (const msg of messages) {
      if (msg.role === 'system') {
        // Gemini handles system prompts differently
        systemInstruction = msg.content;
      } else if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === 'assistant') {
        contents.push({
          role: 'model',
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === 'function') {
        // Function results go as user messages with functionResponse
        contents.push({
          role: 'user',
          parts: [{
            functionResponse: {
              name: msg.name || 'unknown',
              response: { result: msg.content },
            },
          }],
        });
      }
    }

    return { contents, systemInstruction };
  }

  /**
   * Convert functions to Gemini tool format
   */
  protected convertTools(functions?: LLMFunction[]): GeminiTool[] | undefined {
    if (!functions || functions.length === 0) return undefined;

    return [{
      functionDeclarations: functions.map(fn => ({
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters,
      })),
    }];
  }

  /**
   * Send completion request to Gemini
   */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      const { contents, systemInstruction } = this.convertMessages(request.messages);
      const tools = this.convertTools(request.config?.functions);
      const model = request.config?.model || this.defaultModel;

      const requestBody: Record<string, unknown> = {
        contents,
        generationConfig: {
          maxOutputTokens: request.config?.maxTokens || 4096,
        },
      };

      if (systemInstruction) {
        requestBody.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      if (tools && tools.length > 0) {
        requestBody.tools = tools;
        if (request.config?.functionCall && request.config.functionCall !== 'auto' && request.config.functionCall !== 'none') {
          requestBody.toolConfig = {
            functionCallingConfig: {
              mode: 'ANY',
              allowedFunctionNames: [request.config.functionCall.name],
            },
          };
        }
      }

      if (request.config?.temperature !== undefined) {
        (requestBody.generationConfig as Record<string, unknown>).temperature = request.config.temperature;
      }

      if (request.config?.topP !== undefined) {
        (requestBody.generationConfig as Record<string, unknown>).topP = request.config.topP;
      }

      // Safety settings - allow most content for agent use
      requestBody.safetySettings = [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ];

      const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
        
        throw new Error(`GOOGLE_${response.status}: ${errorMessage}`);
      }

      const data: GeminiResponse = await response.json();
      const latencyMs = Date.now() - startTime;

      // Check for blocked content
      if (!data.candidates || data.candidates.length === 0) {
        const blockReason = data.promptFeedback?.safetyRatings?.[0]?.category || 'Unknown';
        throw new Error(`GOOGLE_CONTENT_BLOCKED: Content blocked by safety filters: ${blockReason}`);
      }

      const candidate = data.candidates[0];
      const content = candidate.content;

      // Extract text and function calls
      let textContent = '';
      let functionCall: LLMResponse['functionCall'] | undefined;

      for (const part of content.parts) {
        if (part.text) {
          textContent += part.text;
        }
        if (part.functionCall) {
          functionCall = {
            name: part.functionCall.name,
            arguments: part.functionCall.args,
          };
        }
      }

      // Get token usage (may not always be present)
      const usage = data.usageMetadata;
      const inputTokens = usage?.promptTokenCount || this.estimateTokens(
        request.messages.map(m => m.content).join(' ')
      );
      const outputTokens = usage?.candidatesTokenCount || this.estimateTokens(textContent);

      // Calculate cost
      const costUsd = this.calculateCost(model, inputTokens, outputTokens);

      return {
        content: textContent,
        functionCall,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: usage?.totalTokenCount || inputTokens + outputTokens,
          costUsd,
        },
        model,
        latencyMs,
        finishReason: candidate.finishReason === 'STOP' ? 'stop' :
                     candidate.finishReason === 'MAX_TOKENS' ? 'length' :
                     functionCall ? 'function_call' : 'error',
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Stream completion from Gemini
   */
  async *stream(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    const { contents, systemInstruction } = this.convertMessages(request.messages);
    const tools = this.convertTools(request.config?.functions);
    const model = request.config?.model || this.defaultModel;

    const requestBody: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: request.config?.maxTokens || 4096,
      },
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    if (tools && tools.length > 0) {
      requestBody.tools = tools;
    }

    const url = `${this.baseUrl}/models/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`GOOGLE_STREAM_ERROR: Stream failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('STREAM_ERROR: No response body');
    }

    let buffer = '';
    let functionName = '';
    let functionArgs: Record<string, unknown> = {};

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += new TextDecoder().decode(value);
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield {
                content: '',
                isComplete: true,
              };
              return;
            }

            try {
              const chunk: GeminiResponse = JSON.parse(data);
              const candidate = chunk.candidates?.[0];
              
              if (candidate?.content?.parts) {
                for (const part of candidate.content.parts) {
                  if (part.text) {
                    yield {
                      content: part.text,
                      isComplete: false,
                    };
                  }
                  if (part.functionCall) {
                    functionName = part.functionCall.name;
                    functionArgs = part.functionCall.args;
                  }
                }
              }

              if (candidate?.finishReason) {
                yield {
                  content: '',
                  functionCall: functionName ? {
                    name: functionName,
                    arguments: JSON.stringify(functionArgs),
                  } : undefined,
                  isComplete: true,
                };
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Check if provider is healthy
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const startTime = Date.now();
    
    try {
      // List models as health check
      const url = `${this.baseUrl}/models?key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'GET',
      });

      return {
        healthy: response.ok,
        latency: Date.now() - startTime,
      };
    } catch {
      return {
        healthy: false,
        latency: Date.now() - startTime,
      };
    }
  }
}

/**
 * Factory function to create Google provider
 */
export function createGoogleProvider(config?: Partial<GoogleConfig>): GoogleProvider {
  const apiKey = config?.apiKey || process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    throw new Error('CONFIG_MISSING: GOOGLE_API_KEY environment variable is required');
  }

  return new GoogleProvider({
    apiKey,
    baseUrl: config?.baseUrl,
    defaultModel: config?.defaultModel || 'gemini-1.5-pro',
  });
}
