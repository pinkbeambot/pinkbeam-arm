/**
 * Cost Optimization and Token Usage Tracking
 */

import type { LLMProvider, LLMModel } from './types';

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
}

export interface UsageLimit {
  id: string;
  tenantId: string;
  limitType: 'monthly_spend' | 'daily_spend' | 'monthly_tokens' | 'daily_tokens';
  limitValue: number;
  currentValue: number;
  periodStart: Date;
  periodEnd: Date;
  warningThreshold: number;
  hardLimit: boolean;
  alertsEnabled: boolean;
}

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
  constructor(message: string, public limit: UsageLimit) {
    super(message);
    this.name = 'CostLimitExceededError';
  }
}

export interface CostTrackingOptions {
  enableBuffering?: boolean;
}

export class CostTrackingService {
  private usageLimits = new Map<string, UsageLimit>();
  private alertCallbacks: ((alert: UsageAlert) => void)[] = [];
  private options: CostTrackingOptions;

  constructor(options: CostTrackingOptions = {}) {
    this.options = options;
  }

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

  setLimit(limit: Omit<UsageLimit, 'currentValue'> & { currentValue?: number }): UsageLimit {
    const fullLimit: UsageLimit = { ...limit, currentValue: limit.currentValue ?? 0 };
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

export interface ModelSelectionConfig {
  budgetPriority: 'cost' | 'quality' | 'speed' | 'balanced';
  maxCostPerRequest?: number;
  preferredProviders?: LLMProvider[];
  blockedModels?: string[];
}

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

export function estimateMessageTokens(messages: Array<{ role: string; content: string }>): number {
  // Base overhead per message (4 tokens) + content tokens + completion tokens estimate (3)
  return messages.reduce((total, msg) => total + 4 + Math.ceil(msg.content.length / 4), 0) + 3;
}

export function formatCost(costUsd: number): string {
  return costUsd < 0.01 ? `$${(costUsd * 100).toFixed(2)}¢` : `$${costUsd.toFixed(4)}`;
}

export function formatTokenCount(count: number): string {
  return count >= 1_000_000 ? `${(count / 1_000_000).toFixed(1)}M` : count >= 1_000 ? `${(count / 1_000).toFixed(1)}K` : count.toString();
}
