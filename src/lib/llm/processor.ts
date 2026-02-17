/**
 * LLM Response Processor
 * Parses structured responses, handles tool calls, error recovery, and streaming
 */

import { z } from 'zod';
import {
  LLMResponse,
  LLMFunction,
  LLMError,
} from './types';

// ============================================================================
// Types
// ============================================================================

export interface ProcessedResponse<T = unknown> {
  success: boolean;
  data?: T;
  content: string;
  functionCall?: LLMResponse['functionCall'];
  error?: ResponseError;
  metadata: ResponseMetadata;
}

export interface ResponseMetadata {
  model: string;
  latencyMs: number;
  tokensUsed: number;
  costUsd: number;
  finishReason: string;
  parsedAt: string;
}

export interface ResponseError {
  code: string;
  message: string;
  recoverable: boolean;
  suggestion?: string;
}

export interface ToolCallResult {
  success: boolean;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export interface StreamingOptions {
  onChunk?: (chunk: string) => void;
  onFunctionCall?: (call: { name: string; arguments: string }) => void;
  onComplete?: (response: ProcessedResponse) => void;
  onError?: (error: ResponseError) => void;
}

// ============================================================================
// Response Schemas
// ============================================================================

const StructuredResponseSchema = z.object({
  reasoning: z.string().optional(),
  action: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  data: z.record(z.unknown()).optional(),
});

const DecisionResponseSchema = z.object({
  decision: z.string(),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
  alternatives: z.array(z.string()).optional(),
  risks: z.array(z.string()).optional(),
});

const TaskPlanSchema = z.object({
  steps: z.array(z.object({
    order: z.number(),
    description: z.string(),
    estimatedDuration: z.number().optional(),
    dependencies: z.array(z.number()).optional(),
  })),
  estimatedTotalDuration: z.number().optional(),
  requiredCapabilities: z.array(z.string()).optional(),
});

// ============================================================================
// Response Processor
// ============================================================================

export class ResponseProcessor {
  private retryAttempts: number;
  private retryDelayMs: number;

  constructor(options?: { retryAttempts?: number; retryDelayMs?: number }) {
    this.retryAttempts = options?.retryAttempts ?? 3;
    this.retryDelayMs = options?.retryDelayMs ?? 1000;
  }

  /**
   * Process a raw LLM response
   */
  process<T = unknown>(
    response: LLMResponse,
    schema?: z.ZodSchema<T>
  ): ProcessedResponse<T> {
    const metadata: ResponseMetadata = {
      model: response.model,
      latencyMs: response.latencyMs,
      tokensUsed: response.usage.totalTokens,
      costUsd: response.usage.costUsd,
      finishReason: response.finishReason,
      parsedAt: new Date().toISOString(),
    };

    try {
      // Check for function calls
      if (response.functionCall) {
        return {
          success: true,
          content: response.content,
          functionCall: response.functionCall,
          metadata,
        };
      }

      // Parse content
      let data: T | undefined;
      
      if (schema) {
        const parseResult = this.parseStructured<T>(response.content, schema);
        if (!parseResult.success) {
          return {
            success: false,
            content: response.content,
            error: parseResult.error,
            metadata,
          };
        }
        data = parseResult.data;
      }

      return {
        success: true,
        data,
        content: response.content,
        metadata,
      };
    } catch (error) {
      return {
        success: false,
        content: response.content,
        error: this.createError('PROCESS_ERROR', error),
        metadata,
      };
    }
  }

  /**
   * Parse JSON response with schema validation
   */
  parseStructured<T>(
    content: string,
    schema: z.ZodSchema<T>
  ): { success: true; data: T } | { success: false; error: ResponseError } {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonContent = this.extractJson(content);
      
      if (!jsonContent) {
        return {
          success: false,
          error: {
            code: 'NO_JSON_FOUND',
            message: 'No JSON content found in response',
            recoverable: true,
            suggestion: 'Request the model to respond with valid JSON',
          },
        };
      }

      // Parse JSON
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonContent);
      } catch (parseError) {
        // Try to fix common JSON issues
        const fixed = this.attemptJsonRepair(jsonContent);
        if (fixed) {
          parsed = JSON.parse(fixed);
        } else {
          throw parseError;
        }
      }

      // Validate with schema
      const validated = schema.parse(parsed);

      return {
        success: true,
        data: validated,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Schema validation failed: ${error.errors.map(e => e.message).join(', ')}`,
            recoverable: true,
            suggestion: 'Check response format matches expected schema',
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to parse response',
          recoverable: true,
          suggestion: 'Request the model to respond with valid JSON',
        },
      };
    }
  }

  /**
   * Parse a decision response
   */
  parseDecision(content: string): ProcessedResponse<z.infer<typeof DecisionResponseSchema>> {
    return this.process(
      { content, usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, costUsd: 0 }, model: '', latencyMs: 0, finishReason: 'stop' },
      DecisionResponseSchema
    );
  }

  /**
   * Parse a task plan response
   */
  parseTaskPlan(content: string): ProcessedResponse<z.infer<typeof TaskPlanSchema>> {
    return this.process(
      { content, usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, costUsd: 0 }, model: '', latencyMs: 0, finishReason: 'stop' },
      TaskPlanSchema
    );
  }

  /**
   * Execute a tool call from response
   */
  async executeToolCall(
    functionCall: NonNullable<LLMResponse['functionCall']>,
    tools: Map<string, (args: Record<string, unknown>) => Promise<unknown> | unknown>
  ): Promise<ToolCallResult> {
    const { name, arguments: args } = functionCall;
    
    const tool = tools.get(name);
    if (!tool) {
      return {
        success: false,
        name,
        arguments: args,
        error: `Tool '${name}' not found`,
      };
    }

    try {
      const result = await tool(args);
      return {
        success: true,
        name,
        arguments: args,
        result,
      };
    } catch (error) {
      return {
        success: false,
        name,
        arguments: args,
        error: error instanceof Error ? error.message : 'Tool execution failed',
      };
    }
  }

  /**
   * Handle streaming response
   */
  async *stream(
    generator: AsyncGenerator<{ content: string; isComplete: boolean; functionCall?: Partial<{ name: string; arguments: string }> }>,
    options?: StreamingOptions
  ): AsyncGenerator<string> {
    let fullContent = '';
    let functionName = '';
    let functionArgs = '';

    try {
      for await (const chunk of generator) {
        if (chunk.content) {
          fullContent += chunk.content;
          options?.onChunk?.(chunk.content);
          yield chunk.content;
        }

        if (chunk.functionCall?.name) {
          functionName += chunk.functionCall.name;
        }
        if (chunk.functionCall?.arguments) {
          functionArgs += chunk.functionCall.arguments;
        }

        if (chunk.isComplete) {
          const response: ProcessedResponse = {
            success: true,
            content: fullContent,
            metadata: {
              model: '',
              latencyMs: 0,
              tokensUsed: 0,
              costUsd: 0,
              finishReason: functionName ? 'function_call' : 'stop',
              parsedAt: new Date().toISOString(),
            },
          };

          if (functionName) {
            response.functionCall = {
              name: functionName,
              arguments: this.safeParseArgs(functionArgs),
            };
            options?.onFunctionCall?.({ name: functionName, arguments: functionArgs });
          }

          options?.onComplete?.(response);
        }
      }
    } catch (error) {
      const responseError = this.createError('STREAM_ERROR', error);
      options?.onError?.(responseError);
      throw new LLMError(responseError.code, responseError.message, responseError.recoverable);
    }
  }

  /**
   * Retry a failed operation with exponential backoff
   */
  async retry<T>(
    operation: () => Promise<T>,
    shouldRetry?: (error: Error) => boolean
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (shouldRetry && !shouldRetry(lastError)) {
          throw lastError;
        }

        if (attempt < this.retryAttempts - 1) {
          const delay = this.retryDelayMs * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Extract JSON from markdown code blocks or plain text
   */
  private extractJson(content: string): string | null {
    // Try code block first
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // Try to find JSON object/array in plain text
    const jsonMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }

    // If content looks like JSON, return as-is
    const trimmed = content.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      return trimmed;
    }

    return null;
  }

  /**
   * Attempt to repair common JSON issues
   */
  private attemptJsonRepair(content: string): string | null {
    try {
      // Remove trailing commas
      let fixed = content.replace(/,\s*([}\]])/g, '$1');
      
      // Fix single quotes to double quotes
      fixed = fixed.replace(/'/g, '"');
      
      // Fix unquoted keys
      fixed = fixed.replace(/(\{|,\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
      
      // Try parsing
      JSON.parse(fixed);
      return fixed;
    } catch {
      return null;
    }
  }

  /**
   * Safely parse function arguments
   */
  private safeParseArgs(argsString: string): Record<string, unknown> {
    try {
      return JSON.parse(argsString);
    } catch {
      return { raw: argsString };
    }
  }

  /**
   * Create a response error
   */
  private createError(code: string, error: unknown): ResponseError {
    const message = error instanceof Error ? error.message : String(error);
    
    return {
      code,
      message,
      recoverable: this.isRecoverableError(code, message),
      suggestion: this.getSuggestion(code),
    };
  }

  /**
   * Determine if an error is recoverable
   */
  private isRecoverableError(code: string, message: string): boolean {
    const recoverableCodes = ['PARSE_ERROR', 'VALIDATION_ERROR', 'NO_JSON_FOUND', 'STREAM_ERROR'];
    const unrecoverablePatterns = [/API key/i, /authentication/i, /unauthorized/i];
    
    if (!recoverableCodes.includes(code)) {
      return false;
    }
    
    return !unrecoverablePatterns.some(pattern => pattern.test(message));
  }

  /**
   * Get suggestion for error recovery
   */
  private getSuggestion(code: string): string | undefined {
    const suggestions: Record<string, string> = {
      'PARSE_ERROR': 'Request the model to respond with valid JSON',
      'VALIDATION_ERROR': 'Check response format matches expected schema',
      'NO_JSON_FOUND': 'Request the model to wrap response in markdown code block',
      'STREAM_ERROR': 'Check network connection and retry',
    };
    
    return suggestions[code];
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a processor instance
 */
export function createProcessor(options?: { retryAttempts?: number; retryDelayMs?: number }): ResponseProcessor {
  return new ResponseProcessor(options);
}

/**
 * Quick parse function
 */
export function parseResponse<T>(
  response: LLMResponse,
  schema?: z.ZodSchema<T>
): ProcessedResponse<T> {
  const processor = new ResponseProcessor();
  return processor.process(response, schema);
}

/**
 * Extract JSON from text
 */
export function extractJson(content: string): string | null {
  const processor = new ResponseProcessor();
  return (processor as unknown as { extractJson(content: string): string | null }).extractJson(content);
}

// Export schemas for use in other modules
export {
  StructuredResponseSchema,
  DecisionResponseSchema,
  TaskPlanSchema,
};
