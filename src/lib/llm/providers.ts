/**
 * Multi-Model Support
 */

import { LLMProvider, LLMModel, LLMRequest, LLMResponse, LLMMessage, LLMError } from './types';

export const CLAUDE_MODELS: LLMModel[] = [
  { id: 'claude-3-5-sonnet-20241022', provider: 'anthropic', displayName: 'Claude 3.5 Sonnet', contextWindow: 200000, maxOutputTokens: 8192, supportsFunctions: true, supportsVision: true, costPer1KInput: 0.003, costPer1KOutput: 0.015, latencyProfile: 'balanced' },
  { id: 'claude-3-opus-20240229', provider: 'anthropic', displayName: 'Claude 3 Opus', contextWindow: 200000, maxOutputTokens: 4096, supportsFunctions: true, supportsVision: true, costPer1KInput: 0.015, costPer1KOutput: 0.075, latencyProfile: 'slow' },
  { id: 'claude-3-haiku-20240307', provider: 'anthropic', displayName: 'Claude 3 Haiku', contextWindow: 200000, maxOutputTokens: 4096, supportsFunctions: true, supportsVision: true, costPer1KInput: 0.00025, costPer1KOutput: 0.00125, latencyProfile: 'fast' },
];

export const OPENAI_MODELS: LLMModel[] = [
  { id: 'gpt-4-turbo-2024-04-09', provider: 'openai', displayName: 'GPT-4 Turbo', contextWindow: 128000, maxOutputTokens: 4096, supportsFunctions: true, supportsVision: true, costPer1KInput: 0.01, costPer1KOutput: 0.03, latencyProfile: 'balanced' },
  { id: 'gpt-4o-2024-08-06', provider: 'openai', displayName: 'GPT-4o', contextWindow: 128000, maxOutputTokens: 16384, supportsFunctions: true, supportsVision: true, costPer1KInput: 0.0025, costPer1KOutput: 0.01, latencyProfile: 'balanced' },
  { id: 'gpt-4o-mini-2024-07-18', provider: 'openai', displayName: 'GPT-4o Mini', contextWindow: 128000, maxOutputTokens: 16384, supportsFunctions: true, supportsVision: true, costPer1KInput: 0.00015, costPer1KOutput: 0.0006, latencyProfile: 'fast' },
  { id: 'gpt-3.5-turbo-0125', provider: 'openai', displayName: 'GPT-3.5 Turbo', contextWindow: 16385, maxOutputTokens: 4096, supportsFunctions: true, supportsVision: false, costPer1KInput: 0.0005, costPer1KOutput: 0.0015, latencyProfile: 'fast' },
];

export const GOOGLE_MODELS: LLMModel[] = [
  { id: 'gemini-1.5-pro-002', provider: 'google', displayName: 'Gemini 1.5 Pro', contextWindow: 2000000, maxOutputTokens: 8192, supportsFunctions: true, supportsVision: true, costPer1KInput: 0.00125, costPer1KOutput: 0.005, latencyProfile: 'balanced' },
  { id: 'gemini-1.5-flash-002', provider: 'google', displayName: 'Gemini 1.5 Flash', contextWindow: 1000000, maxOutputTokens: 8192, supportsFunctions: true, supportsVision: true, costPer1KInput: 0.000075, costPer1KOutput: 0.0003, latencyProfile: 'fast' },
];

export const OLLAMA_MODELS: LLMModel[] = [
  { id: 'llama3.2', provider: 'local', displayName: 'Llama 3.2', contextWindow: 128000, maxOutputTokens: 4096, supportsFunctions: false, supportsVision: false, costPer1KInput: 0, costPer1KOutput: 0, latencyProfile: 'balanced' },
  { id: 'mistral', provider: 'local', displayName: 'Mistral', contextWindow: 32768, maxOutputTokens: 4096, supportsFunctions: false, supportsVision: false, costPer1KInput: 0, costPer1KOutput: 0, latencyProfile: 'balanced' },
  { id: 'codellama', provider: 'local', displayName: 'CodeLlama', contextWindow: 16384, maxOutputTokens: 4096, supportsFunctions: false, supportsVision: false, costPer1KInput: 0, costPer1KOutput: 0, latencyProfile: 'balanced' },
];

export const ALL_MODELS: LLMModel[] = [...CLAUDE_MODELS, ...OPENAI_MODELS, ...GOOGLE_MODELS, ...OLLAMA_MODELS];

export interface OpenAIConfig { apiKey: string; baseUrl?: string; organization?: string; defaultModel: string; }
interface OpenAIResponse { id: string; choices: Array<{ message: { role: string; content: string; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> }; finish_reason: string }>; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }; model: string; }

export class OpenAIProvider {
  private apiKey: string; private baseUrl: string; private organization?: string; private defaultModel: string;
  constructor(config: OpenAIConfig) { this.apiKey = config.apiKey; this.baseUrl = config.baseUrl || 'https://api.openai.com/v1'; this.organization = config.organization; this.defaultModel = config.defaultModel || 'gpt-4-turbo-2024-04-09'; }
  getModels(): LLMModel[] { return OPENAI_MODELS; }
  getDefaultModel(): string { return this.defaultModel; }
  estimateTokens(text: string): number { return Math.ceil(text.length / 4); }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    try {
      const model = request.config?.model || this.defaultModel;
      const requestBody: Record<string, unknown> = { model, messages: request.messages.map(m => ({ role: m.role === 'function' ? 'tool' : m.role, content: m.content, name: m.name })), max_tokens: request.config?.maxTokens || 4096 };
      if (request.config?.functions?.length) { requestBody.tools = request.config.functions.map(f => ({ type: 'function', function: { name: f.name, description: f.description, parameters: f.parameters } })); requestBody.tool_choice = request.config.functionCall === 'auto' ? 'auto' : 'none'; }
      if (request.config?.temperature !== undefined) requestBody.temperature = request.config.temperature;
      const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` };
      if (this.organization) headers['OpenAI-Organization'] = this.organization;
      const response = await fetch(`${this.baseUrl}/chat/completions`, { method: 'POST', headers, body: JSON.stringify(requestBody) });
      if (!response.ok) { const error = await response.json().catch(() => ({})); throw new LLMError(`OPENAI_${response.status}`, error.error?.message || `HTTP ${response.status}`, response.status >= 500 || response.status === 429, 'openai'); }
      const data: OpenAIResponse = await response.json();
      const choice = data.choices[0];
      const inputTokens = data.usage.prompt_tokens, outputTokens = data.usage.completion_tokens;
      const modelInfo = OPENAI_MODELS.find(m => m.id === model);
      const costUsd = modelInfo ? (inputTokens / 1000) * modelInfo.costPer1KInput + (outputTokens / 1000) * modelInfo.costPer1KOutput : 0;
      return { content: choice.message.content || '', functionCall: choice.message.tool_calls?.length ? { name: choice.message.tool_calls[0].function.name, arguments: JSON.parse(choice.message.tool_calls[0].function.arguments) } : undefined, usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, costUsd }, model: data.model, latencyMs: Date.now() - startTime, finishReason: choice.finish_reason === 'tool_calls' ? 'function_call' : choice.finish_reason === 'length' ? 'length' : 'stop' };
    } catch (error) { if (error instanceof LLMError) throw error; throw new LLMError('OPENAI_ERROR', error instanceof Error ? error.message : 'Unknown error', true, 'openai'); }
  }

  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();
    try { const response = await fetch(`${this.baseUrl}/models`, { headers: { 'Authorization': `Bearer ${this.apiKey}` } }); return { healthy: response.ok, latency: Date.now() - start }; }
    catch { return { healthy: false, latency: Date.now() - start }; }
  }
}

export function createOpenAIProvider(config?: Partial<OpenAIConfig>): OpenAIProvider {
  const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new LLMError('CONFIG_MISSING', 'OPENAI_API_KEY environment variable is required', false, 'openai');
  return new OpenAIProvider({ apiKey, baseUrl: config?.baseUrl, organization: config?.organization, defaultModel: config?.defaultModel || 'gpt-4-turbo-2024-04-09' });
}

export interface OllamaConfig { baseUrl: string; defaultModel: string; }
interface OllamaResponse { model: string; message: { role: string; content: string }; done: boolean; prompt_eval_count?: number; eval_count?: number; }

export class OllamaProvider {
  private baseUrl: string; private defaultModel: string;
  constructor(config: OllamaConfig) { this.baseUrl = config.baseUrl.replace(/\/$/, ''); this.defaultModel = config.defaultModel || 'llama3.2'; }
  getModels(): LLMModel[] { return OLLAMA_MODELS; }
  getDefaultModel(): string { return this.defaultModel; }
  estimateTokens(text: string): number { return Math.ceil(text.length / 4); }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    try {
      const model = request.config?.model || this.defaultModel;
      let systemPrompt: string | undefined;
      const messages: Array<{ role: string; content: string }> = [];
      for (const msg of request.messages) { if (msg.role === 'system') systemPrompt = msg.content; else if (msg.role === 'user' || msg.role === 'assistant') messages.push({ role: msg.role, content: msg.content }); }
      const requestBody: Record<string, unknown> = { model, messages, stream: false };
      if (systemPrompt) requestBody.system = systemPrompt;
      if (request.config?.temperature !== undefined) requestBody.options = { temperature: request.config.temperature };
      const response = await fetch(`${this.baseUrl}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
      if (!response.ok) { const error = await response.json().catch(() => ({})); throw new LLMError(`OLLAMA_${response.status}`, error.error || `HTTP ${response.status}`, response.status >= 500, 'local'); }
      const data: OllamaResponse = await response.json();
      const inputTokens = data.prompt_eval_count || this.estimateTokens(request.messages.map(m => m.content).join(' '));
      const outputTokens = data.eval_count || this.estimateTokens(data.message.content);
      return { content: data.message.content, usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, costUsd: 0 }, model: data.model, latencyMs: Date.now() - startTime, finishReason: 'stop' };
    } catch (error) { if (error instanceof LLMError) throw error; throw new LLMError('OLLAMA_ERROR', error instanceof Error ? error.message : 'Unknown error', true, 'local'); }
  }

  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();
    try { const response = await fetch(`${this.baseUrl}/api/tags`); return { healthy: response.ok, latency: Date.now() - start }; }
    catch { return { healthy: false, latency: Date.now() - start }; }
  }

  async listModels(): Promise<Array<{ name: string; size: number }>> {
    try { const response = await fetch(`${this.baseUrl}/api/tags`); if (!response.ok) return []; const data = await response.json(); return data.models || []; } catch { return []; }
  }
}

export function createOllamaProvider(config?: Partial<OllamaConfig>): OllamaProvider {
  return new OllamaProvider({ baseUrl: config?.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434', defaultModel: config?.defaultModel || 'llama3.2' });
}

export type ProviderInstance = OpenAIProvider | OllamaProvider | import('./claude').ClaudeProvider;

export interface ProviderConfig {
  anthropic?: { apiKey?: string; baseUrl?: string; defaultModel?: string };
  openai?: { apiKey?: string; baseUrl?: string; organization?: string; defaultModel?: string };
  google?: { apiKey?: string; defaultModel?: string };
  ollama?: { baseUrl?: string; defaultModel?: string };
}

export async function createProvider(provider: LLMProvider, config?: ProviderConfig): Promise<ProviderInstance> {
  switch (provider) {
    case 'anthropic': return (await import('./claude')).createClaudeProvider(config?.anthropic);
    case 'openai': return createOpenAIProvider(config?.openai);
    case 'local': return createOllamaProvider(config?.ollama);
    default: throw new LLMError('UNSUPPORTED_PROVIDER', `Provider ${provider} is not supported`, false);
  }
}
