/**
 * LLM Provider Adapters
 * Unified interface for OpenAI, Anthropic, and Google providers
 */

// Base types and interfaces
export {
  BaseProvider,
  ILLMProvider,
  type ProviderMessage,
  type ProviderContentBlock,
  type ProviderTool,
  type LLMStreamChunk,
} from './base';

// Anthropic Claude
export {
  AnthropicProvider,
  createAnthropicProvider,
  CLAUDE_MODELS,
  // Backward compatibility
  AnthropicProvider as ClaudeProvider,
  createAnthropicProvider as createClaudeProvider,
} from './anthropic';
export type { AnthropicConfig } from './anthropic';

// OpenAI
export {
  OpenAIProvider,
  createOpenAIProvider,
  OPENAI_MODELS,
} from './openai';
export type { OpenAIConfig } from './openai';

// Google Gemini
export {
  GoogleProvider,
  createGoogleProvider,
  GEMINI_MODELS,
} from './google';
export type { GoogleConfig } from './google';

// All models combined
import { CLAUDE_MODELS } from './anthropic';
import { OPENAI_MODELS } from './openai';
import { GEMINI_MODELS } from './google';
import type { LLMModel, LLMProvider } from '../types';

export const ALL_MODELS: LLMModel[] = [
  ...CLAUDE_MODELS,
  ...OPENAI_MODELS,
  ...GEMINI_MODELS,
];

// Provider factory map
import type { ILLMProvider } from './base';
import { createAnthropicProvider } from './anthropic';
import { createOpenAIProvider } from './openai';
import { createGoogleProvider } from './google';

export const PROVIDER_FACTORIES: Record<LLMProvider, (config?: Record<string, unknown>) => ILLMProvider> = {
  anthropic: createAnthropicProvider as (config?: Record<string, unknown>) => ILLMProvider,
  openai: createOpenAIProvider as (config?: Record<string, unknown>) => ILLMProvider,
  google: createGoogleProvider as (config?: Record<string, unknown>) => ILLMProvider,
  local: () => {
    throw new Error('Local provider not yet implemented');
  },
};

/**
 * Create a provider instance by name
 */
export function createProvider(
  provider: LLMProvider,
  config?: Record<string, unknown>
): ILLMProvider {
  const factory = PROVIDER_FACTORIES[provider];
  if (!factory) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  return factory(config);
}

/**
 * Get all available models for a provider
 */
export function getModelsForProvider(provider: LLMProvider): LLMModel[] {
  switch (provider) {
    case 'anthropic':
      return CLAUDE_MODELS;
    case 'openai':
      return OPENAI_MODELS;
    case 'google':
      return GEMINI_MODELS;
    default:
      return [];
  }
}
