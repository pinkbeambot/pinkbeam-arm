/**
 * Cost Optimization and Token Usage Tracking
<<<<<<< HEAD
 * Implements usage tracking, cost-aware model selection, and usage alerts
=======
>>>>>>> eng-ai/llm-improvements
 */

import type { LLMProvider, LLMModel } from './types';

<<<<<<< HEAD
// ============================================================================
// Token Usage Tracking
// ============================================================================

=======
>>>>>>> eng-ai/llm-improvements
export interface TokenUsageEntry {
  id: string;
  tenantId: string;
  agentId?: string;
  taskId?: string;
  userId?: string;
  provider: LLMProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  timestamp: Date;
  requestType?: string;
<<<<<<< HEAD
  metadata?: Record<string, unknown>;
}

export interface UsageAggregate {
  tenantId: string;
  period: 'hour' | 'day' | 'week' | 'month';
  startTime: Date;
  endTime: Date;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  byProvider: Record<LLMProvider, {
    requests: number;
    tokens: number;
    costUsd: number;
  }>;
  byModel: Record<string, {
    requests: number;
    tokens: number;
    costUsd: number;
  }>;
  byAgent: Record<string, {
    requests: number;
    tokens: number;
    costUsd: number;
  }>;
=======
>>>>>>> eng-ai/llm-improvements
}

export interface UsageLimit {
  id: string;
  tenantId: string;
<<<<<<< HEAD
  limitType: 'monthly_spend' | 'daily_spend' | 'monthly_tokens' | 'daily_tokens' | 'concurrent_requests';
=======
  limitType: 'monthly_spend' | 'daily_spend' | 'monthly_tokens' | 'daily_tokens';
>>>>>>> eng-ai/llm-improvements
  limitValue: number;
  currentValue: number;
  periodStart: Date;
  periodEnd: Date;
<<<<<<< HEAD
  warningThreshold: number; // Percentage (0-100)
=======
  warningThreshold: number;
>>>>>>> eng-ai/llm-improvements
  hardLimit: boolean;
  alertsEnabled: boolean;
}

<<<<<<< HEAD
// ============================================================================
// In-Memory Buffer for Real-time Tracking
// ============================================================================

class TokenUsageBuffer {
  private entries: TokenUsageEntry[] = [];
  private flushCallbacks: ((entries: TokenUsageEntry[]) => Promise<void>)[] = [];
  private flushIntervalMs: number;
  private maxBufferSize: number;
  private flushTimer?: NodeJS.Timeout;

  constructor(options: {
    flushIntervalMs?: number;
    maxBufferSize?: number;
  } = {}) {
    this.flushIntervalMs = options.flushIntervalMs || 5000; // 5 seconds
    this.maxBufferSize = options.maxBufferSize || 100;
    this.startFlushTimer();
  }

  add(entry: TokenUsageEntry): void {
    this.entries.push(entry);
    
    // Flush if buffer is full
    if (this.entries.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  onFlush(callback: (entries: TokenUsageEntry[]) => Promise<void>): void {
    this.flushCallbacks.push(callback);
  }

  private async flush(): Promise<void> {
    if (this.entries.length === 0) return;
    
    const entriesToFlush = [...this.entries];
    this.entries = [];
    
    for (const callback of this.flushCallbacks) {
      try {
        await callback(entriesToFlush);
      } catch (error) {
        console.error('[TokenUsageBuffer] Flush failed:', error);
      }
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => this.flush(), this.flushIntervalMs);
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Global usage buffer
export const globalUsageBuffer = new TokenUsageBuffer();

// ============================================================================
// Cost Tracking Service
// ============================================================================

export interface CostTrackingConfig {
  enableBuffering: boolean;
  defaultWarningThreshold: number;
  alertCooldownMs: number;
}

export const DEFAULT_COST_TRACKING_CONFIG: CostTrackingConfig = {
  enableBuffering: true,
  defaultWarningThreshold: 80,
  alertCooldownMs: 300000, // 5 minutes
};

export class CostTrackingService {
  private config: CostTrackingConfig;
  private usageLimits = new Map<string, UsageLimit>();
  private alertHistory = new Map<string, number>(); // limitId -> lastAlertTime
  private alertCallbacks: ((alert: UsageAlert) => void)[] = [];

  constructor(config: Partial<CostTrackingConfig> = {}) {
    this.config = { ...DEFAULT_COST_TRACKING_CONFIG, ...config };
    
    // Set up buffer flush handler
    if (this.config.enableBuffering) {
      globalUsageBuffer.onFlush(async (entries) => {
        await this.persistUsageEntries(entries);
      });
    }
  }

  /**
   * Track a new usage entry
   */
  track(entry: Omit<TokenUsageEntry, 'id' | 'timestamp'>): TokenUsageEntry {
    const fullEntry: TokenUsageEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    if (this.config.enableBuffering) {
      globalUsageBuffer.add(fullEntry);
    } else {
      this.persistUsageEntries([fullEntry]).catch(console.error);
    }

    // Check limits
    this.checkLimits(fullEntry).catch(console.error);

    return fullEntry;
  }

  /**
   * Persist usage entries to database
   */
  private async persistUsageEntries(entries: TokenUsageEntry[]): Promise<void> {
    // In a real implementation, this would batch insert to the database
    // For now, we just log
    console.log(`[CostTracking] Persisting ${entries.length} usage entries`);
    
    // Example: Insert into llm_usage_log table
    // await supabase.from('llm_usage_log').insert(entries);
  }

  /**
   * Check usage against limits
   */
  private async checkLimits(entry: TokenUsageEntry): Promise<void> {
    // Check all applicable limits for this tenant
    const limits = Array.from(this.usageLimits.values())
      .filter(l => l.tenantId === entry.tenantId);

    for (const limit of limits) {
      // Update current value based on limit type
      this.updateLimitValue(limit, entry);

      // Check if warning threshold is exceeded
      const usagePercent = (limit.currentValue / limit.limitValue) * 100;
      
      if (usagePercent >= limit.warningThreshold) {
        const lastAlert = this.alertHistory.get(limit.id) || 0;
        const now = Date.now();
        
        // Check cooldown
        if (now - lastAlert >= this.config.alertCooldownMs) {
          this.sendAlert({
            limitId: limit.id,
            tenantId: limit.tenantId,
            limitType: limit.limitType,
            currentValue: limit.currentValue,
            limitValue: limit.limitValue,
            usagePercent,
            severity: usagePercent >= 100 ? 'critical' : usagePercent >= 90 ? 'warning' : 'info',
            timestamp: new Date(),
          });
          this.alertHistory.set(limit.id, now);
        }
      }

      // Check if hard limit is exceeded
      if (limit.hardLimit && limit.currentValue >= limit.limitValue) {
        throw new CostLimitExceededError(
          `Cost limit exceeded: ${limit.limitType} = ${limit.currentValue}/${limit.limitValue}`,
          limit
        );
      }
    }
  }

  /**
   * Update limit current value based on entry
   */
  private updateLimitValue(limit: UsageLimit, entry: TokenUsageEntry): void {
    // Reset period if needed
    const now = new Date();
    if (now > limit.periodEnd) {
      limit.currentValue = 0;
      this.setPeriodDates(limit, now);
    }

    // Update value based on limit type
    switch (limit.limitType) {
      case 'monthly_spend':
      case 'daily_spend':
        limit.currentValue += entry.costUsd;
        break;
      case 'monthly_tokens':
      case 'daily_tokens':
        limit.currentValue += entry.totalTokens;
        break;
      case 'concurrent_requests':
        // Handled separately
        break;
    }
  }

  /**
   * Set period dates based on limit type
   */
  private setPeriodDates(limit: UsageLimit, fromDate: Date): void {
    const year = fromDate.getFullYear();
    const month = fromDate.getMonth();
    const date = fromDate.getDate();

    switch (limit.limitType) {
      case 'monthly_spend':
      case 'monthly_tokens':
        limit.periodStart = new Date(year, month, 1);
        limit.periodEnd = new Date(year, month + 1, 0, 23, 59, 59);
        break;
      case 'daily_spend':
      case 'daily_tokens':
        limit.periodStart = new Date(year, month, date);
        limit.periodEnd = new Date(year, month, date, 23, 59, 59);
        break;
    }
  }

  /**
   * Set up a usage limit for a tenant
   */
  setLimit(limit: Omit<UsageLimit, 'currentValue' | 'periodStart' | 'periodEnd'>): UsageLimit {
    const fullLimit: UsageLimit = {
      ...limit,
      currentValue: 0,
      periodStart: new Date(),
      periodEnd: new Date(),
    };
    
    this.setPeriodDates(fullLimit, new Date());
    this.usageLimits.set(limit.id, fullLimit);
    
    return fullLimit;
  }

  /**
   * Remove a limit
   */
  removeLimit(limitId: string): void {
    this.usageLimits.delete(limitId);
  }

  /**
   * Get limits for a tenant
   */
  getLimits(tenantId: string): UsageLimit[] {
    return Array.from(this.usageLimits.values())
      .filter(l => l.tenantId === tenantId);
  }

  /**
   * Subscribe to alerts
   */
  onAlert(callback: (alert: UsageAlert) => void): () => void {
    this.alertCallbacks.push(callback);
    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Send alert to all subscribers
   */
  private sendAlert(alert: UsageAlert): void {
    for (const callback of this.alertCallbacks) {
      try {
        callback(alert);
      } catch (error) {
        console.error('[CostTracking] Alert callback failed:', error);
      }
    }
  }

  /**
   * Get current usage for a tenant
   */
  async getCurrentUsage(
    tenantId: string,
    period: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<UsageAggregate | null> {
    // This would query the database for aggregated usage
    // For now, return a placeholder
    return null;
  }
}

=======
>>>>>>> eng-ai/llm-improvements
export interface UsageAlert {
  limitId: string;
  tenantId: string;
  limitType: UsageLimit['limitType'];
  currentValue: number;
  limitValue: number;
  usagePercent: number;
  severity: 'info' | 'warning' | 'critical';
  timestamp: Date;
}

export class CostLimitExceededError extends Error {
<<<<<<< HEAD
  constructor(
    message: string,
    public limit: UsageLimit
  ) {
=======
  constructor(message: string, public limit: UsageLimit) {
>>>>>>> eng-ai/llm-improvements
    super(message);
    this.name = 'CostLimitExceededError';
  }
}

<<<<<<< HEAD
// Global cost tracking service
export const globalCostTrackingService = new CostTrackingService();

// ============================================================================
// Cost-Aware Model Selection
// ============================================================================
=======
export class CostTrackingService {
  private usageLimits = new Map<string, UsageLimit>();
  private alertCallbacks: ((alert: UsageAlert) => void)[] = [];

  track(entry: Omit<TokenUsageEntry, 'id' | 'timestamp'>): TokenUsageEntry {
    const fullEntry: TokenUsageEntry = { ...entry, id: crypto.randomUUID(), timestamp: new Date() };
    this.checkLimits(fullEntry);
    return fullEntry;
  }

  private checkLimits(entry: TokenUsageEntry): void {
    const limits = Array.from(this.usageLimits.values()).filter(l => l.tenantId === entry.tenantId);
    for (const limit of limits) {
      this.updateLimitValue(limit, entry);
      const usagePercent = (limit.currentValue / limit.limitValue) * 100;
      if (usagePercent >= limit.warningThreshold && limit.alertsEnabled) {
        this.sendAlert({ limitId: limit.id, tenantId: limit.tenantId, limitType: limit.limitType, currentValue: limit.currentValue, limitValue: limit.limitValue, usagePercent, severity: usagePercent >= 100 ? 'critical' : 'warning', timestamp: new Date() });
      }
      if (limit.hardLimit && limit.currentValue >= limit.limitValue) {
        throw new CostLimitExceededError(`Cost limit exceeded: ${limit.limitType}`, limit);
      }
    }
  }

  private updateLimitValue(limit: UsageLimit, entry: TokenUsageEntry): void {
    const now = new Date();
    if (now > limit.periodEnd) {
      limit.currentValue = 0;
      this.setPeriodDates(limit, now);
    }
    if (limit.limitType.includes('spend')) limit.currentValue += entry.costUsd;
    else limit.currentValue += entry.totalTokens;
  }

  private setPeriodDates(limit: UsageLimit, fromDate: Date): void {
    const year = fromDate.getFullYear(), month = fromDate.getMonth(), date = fromDate.getDate();
    if (limit.limitType.startsWith('monthly')) {
      limit.periodStart = new Date(year, month, 1);
      limit.periodEnd = new Date(year, month + 1, 0, 23, 59, 59);
    } else {
      limit.periodStart = new Date(year, month, date);
      limit.periodEnd = new Date(year, month, date, 23, 59, 59);
    }
  }

  setLimit(limit: Omit<UsageLimit, 'currentValue'>): UsageLimit {
    const fullLimit: UsageLimit = { ...limit, currentValue: 0 };
    this.setPeriodDates(fullLimit, new Date());
    this.usageLimits.set(limit.id, fullLimit);
    return fullLimit;
  }

  getLimits(tenantId: string): UsageLimit[] {
    return Array.from(this.usageLimits.values()).filter(l => l.tenantId === tenantId);
  }

  onAlert(callback: (alert: UsageAlert) => void): () => void {
    this.alertCallbacks.push(callback);
    return () => { const i = this.alertCallbacks.indexOf(callback); if (i > -1) this.alertCallbacks.splice(i, 1); };
  }

  private sendAlert(alert: UsageAlert): void {
    this.alertCallbacks.forEach(cb => { try { cb(alert); } catch (e) { console.error(e); } });
  }
}

export const globalCostTrackingService = new CostTrackingService();
>>>>>>> eng-ai/llm-improvements

export interface ModelSelectionConfig {
  budgetPriority: 'cost' | 'quality' | 'speed' | 'balanced';
  maxCostPerRequest?: number;
<<<<<<< HEAD
  maxLatencyMs?: number;
=======
>>>>>>> eng-ai/llm-improvements
  preferredProviders?: LLMProvider[];
  blockedModels?: string[];
}

<<<<<<< HEAD
export interface ModelScore {
  model: LLMModel;
  score: number;
  costEstimate: number;
  latencyEstimate: number;
  reason: string;
}

/**
 * Cost-aware model selector
 */
export function selectModelWithCostOptimization(
  models: LLMModel[],
  estimatedInputTokens: number,
  estimatedOutputTokens: number,
  config: ModelSelectionConfig
): ModelScore | null {
  if (models.length === 0) return null;

  // Filter out blocked models
  let candidates = models.filter(m => !config.blockedModels?.includes(m.id));

  // Filter by provider preference
  if (config.preferredProviders && config.preferredProviders.length > 0) {
    candidates = candidates.filter(m => config.preferredProviders!.includes(m.provider));
  }

  // Calculate scores for each model
  const scoredModels: ModelScore[] = candidates.map(model => {
    const costEstimate = calculateEstimatedCost(model, estimatedInputTokens, estimatedOutputTokens);
    const latencyEstimate = estimateLatency(model);

    let score = 0;
    let reason = '';

    switch (config.budgetPriority) {
      case 'cost':
        // Lower cost = higher score
        score = 1 / (costEstimate + 0.001);
        reason = `Selected for lowest cost: $${costEstimate.toFixed(4)}`;
        break;
      
      case 'quality':
        // Higher capability (context window) = higher score, but consider cost
        score = (model.contextWindow / 100000) - (costEstimate * 10);
        reason = `Selected for quality: ${model.displayName}`;
        break;
      
      case 'speed':
        // Faster latency = higher score
        const latencyWeight: Record<LLMModel['latencyProfile'], number> = {
          fast: 3,
          balanced: 2,
          slow: 1,
        };
        score = latencyWeight[model.latencyProfile];
        reason = `Selected for speed: ${model.latencyProfile} profile`;
        break;
      
      case 'balanced':
      default:
        // Balanced: cost efficiency with minimum quality threshold
        const qualityScore = model.contextWindow / 200000;
        const costScore = 1 / (costEstimate * 100 + 1);
        const speedScore = model.latencyProfile === 'fast' ? 1.5 : 
                          model.latencyProfile === 'balanced' ? 1 : 0.5;
        score = (qualityScore * 0.4) + (costScore * 0.4) + (speedScore * 0.2);
        reason = `Balanced selection: quality=${qualityScore.toFixed(2)}, cost=$${costEstimate.toFixed(4)}`;
        break;
    }

    return {
      model,
      score,
      costEstimate,
      latencyEstimate,
      reason,
    };
  });

  // Filter by hard constraints
  let validModels = scoredModels;
  
  if (config.maxCostPerRequest) {
    validModels = validModels.filter(m => m.costEstimate <= config.maxCostPerRequest!);
  }
  
  if (config.maxLatencyMs) {
    validModels = validModels.filter(m => m.latencyEstimate <= config.maxLatencyMs!);
  }

  if (validModels.length === 0) {
    // No models meet constraints, return best effort
    validModels = scoredModels;
  }

  // Sort by score descending and return best
  validModels.sort((a, b) => b.score - a.score);
  return validModels[0];
}

/**
 * Calculate estimated cost for a request
 */
export function calculateEstimatedCost(
  model: LLMModel,
  inputTokens: number,
  outputTokens: number
): number {
  const inputCost = (inputTokens / 1000) * model.costPer1KInput;
  const outputCost = (outputTokens / 1000) * model.costPer1KOutput;
  return inputCost + outputCost;
}

/**
 * Estimate latency based on model profile
 */
export function estimateLatency(model: LLMModel): number {
  const baseLatency: Record<LLMModel['latencyProfile'], number> = {
    fast: 500,
    balanced: 1500,
    slow: 3000,
  };
  return baseLatency[model.latencyProfile];
}

// ============================================================================
// Token Estimation Utilities
// ============================================================================

/**
 * Estimate token count for text
 * Uses rough approximation: ~4 characters per token for English text
 * For more accurate counts, use the provider's tokenizer
 */
export function estimateTokenCount(text: string): number {
  // Rough approximation
  return Math.ceil(text.length / 4);
}

/**
 * Estimate tokens for messages
 */
export function estimateMessageTokens(
  messages: Array<{ role: string; content: string }>
): number {
  let total = 0;
  
  for (const msg of messages) {
    // Base tokens per message (formatting overhead)
    total += 4;
    
    // Content tokens
    total += estimateTokenCount(msg.content);
    
    // Role tokens
    total += estimateTokenCount(msg.role);
  }
  
  // Add completion tokens estimate
  total += 4;
  
  return total;
}

/**
 * Format cost for display
 */
export function formatCost(costUsd: number): string {
  if (costUsd < 0.01) {
    return `$${(costUsd * 100).toFixed(2)}¢`;
  }
  return `$${costUsd.toFixed(4)}`;
}

/**
 * Format token count for display
 */
export function formatTokenCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return count.toString();
=======
export function selectModelWithCostOptimization(models: LLMModel[], inputTokens: number, outputTokens: number, config: ModelSelectionConfig) {
  let candidates = models.filter(m => !config.blockedModels?.includes(m.id));
  if (config.preferredProviders?.length) candidates = candidates.filter(m => config.preferredProviders!.includes(m.provider));
  if (candidates.length === 0) candidates = models;
  
  const scored = candidates.map(model => {
    const cost = calculateEstimatedCost(model, inputTokens, outputTokens);
    let score = 0;
    switch (config.budgetPriority) {
      case 'cost': score = 1 / (cost + 0.001); break;
      case 'quality': score = model.contextWindow / 100000 - cost * 10; break;
      case 'speed': score = { fast: 3, balanced: 2, slow: 1 }[model.latencyProfile]; break;
      default: score = (model.contextWindow / 200000 * 0.4) + (1 / (cost * 100 + 1) * 0.4);
    }
    return { model, score, costEstimate: cost, reason: `Selected with priority: ${config.budgetPriority}` };
  });
  
  scored.sort((a, b) => b.score - a.score);
  return scored[0] || null;
}

export function calculateEstimatedCost(model: LLMModel, inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1000) * model.costPer1KInput + (outputTokens / 1000) * model.costPer1KOutput;
}

export function estimateLatency(model: LLMModel): number {
  return { fast: 500, balanced: 1500, slow: 3000 }[model.latencyProfile];
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function formatCost(costUsd: number): string {
  return costUsd < 0.01 ? `$${(costUsd * 100).toFixed(2)}¢` : `$${costUsd.toFixed(4)}`;
}

export function formatTokenCount(count: number): string {
  return count >= 1_000_000 ? `${(count / 1_000_000).toFixed(1)}M` : count >= 1_000 ? `${(count / 1_000).toFixed(1)}K` : count.toString();
>>>>>>> eng-ai/llm-improvements
}
