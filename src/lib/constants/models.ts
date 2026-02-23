/**
 * Model configuration constants
 * Centralized location for AI model definitions used across the application
 */

export interface ModelConfig {
  value: string;
  label: string;
  provider?: string;
}

/**
 * Supported AI models for agent creation
 * @constant
 */
export const SUPPORTED_MODELS: ModelConfig[] = [
  { value: 'claude-3-opus', label: 'Claude 3 Opus (Most capable)', provider: 'anthropic' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet (Balanced)', provider: 'anthropic' },
  { value: 'claude-3-haiku', label: 'Claude 3 Haiku (Fastest)', provider: 'anthropic' },
  { value: 'gpt-4', label: 'GPT-4', provider: 'openai' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', provider: 'openai' },
];

/**
 * Get model label by value
 * @param value - The model value/ID
 * @returns The model label or the value if not found
 */
export function getModelLabel(value: string): string {
  const model = SUPPORTED_MODELS.find(m => m.value === value);
  return model?.label || value;
}
