'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Send, Sparkles, BarChart3, Table, Activity, Lightbulb } from 'lucide-react';
import type { NLQueryResult } from '@/types/advanced-analytics';

interface NaturalLanguageQueryProps {
  onQuery?: (query: string) => Promise<NLQueryResult>;
  isLoading?: boolean;
  className?: string;
}

const EXAMPLE_QUERIES = [
  'Show me agents with declining performance',
  'What are my top performing agents?',
  'How much did I spend last week?',
  'Which tasks are taking the longest?',
  'Compare this month vs last month',
  'Show me cost breakdown by agent',
  'What bottlenecks are slowing us down?',
  'Which agents have the highest success rate?',
];

export function NaturalLanguageQuery({
  onQuery,
  isLoading: externalLoading,
  className,
}: NaturalLanguageQueryProps) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<NLQueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setShowExamples(false);

    try {
      if (onQuery) {
        const response = await onQuery(query);
        setResult(response);
      } else {
        // Simulate API call for demo
        await new Promise(resolve => setTimeout(resolve, 1500));
        setResult(generateMockResponse(query));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process query');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    inputRef.current?.focus();
  };

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Ask AI Analytics
            </CardTitle>
            <CardDescription>
              Ask questions about your data in natural language
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about your agents, tasks, costs..."
              className="pr-10"
              disabled={isLoading}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            )}
          </div>
          <Button type="submit" disabled={isLoading || !query.trim()}>
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        {showExamples && !result && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_QUERIES.slice(0, 4).map((example) => (
                <button
                  key={example}
                  onClick={() => handleExampleClick(example)}
                  className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 transition-colors text-left"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex-1 space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {result && !isLoading && (
          <ScrollArea className="flex-1">
            <div className="space-y-4 pr-4">
              {/* Intent Badge */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs capitalize">
                  {result.intent.replace('_', ' ')}
                </Badge>
              </div>

              {/* Summary */}
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm">{result.summary}</p>
              </div>

              {/* Visualizations */}
              {result.visualizations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Visualizations
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {result.visualizations.map((viz, i) => (
                      <div 
                        key={i}
                        className="rounded-lg border p-2 hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {viz.type === 'chart' && <BarChart3 className="h-3 w-3 text-primary" />}
                          {viz.type === 'table' && <Table className="h-3 w-3 text-primary" />}
                          {viz.type === 'metric' && <Activity className="h-3 w-3 text-primary" />}
                          {viz.type === 'heatmap' && <div className="h-3 w-3 rounded bg-indigo-500" />}
                          <span className="text-xs font-medium truncate">{viz.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {viz.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Recommendations
                  </h4>
                  <ul className="space-y-1.5">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-amber-500 shrink-0">💡</span>
                        <span className="text-muted-foreground">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Raw Results Preview */}
              <div className="pt-2 border-t">
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    View raw data
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded-md overflow-auto max-h-[200px]">
                    {JSON.stringify(result.results, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// Mock response generator for demo
function generateMockResponse(query: string): NLQueryResult {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('agent') && lowerQuery.includes('declining')) {
    return {
      query,
      intent: 'agent_performance',
      filters: { trend: 'declining' },
      results: [
        { name: 'Research Agent', successRate: 0.45, tasksCompleted: 12, trend: -15 },
        { name: 'Writer Bot', successRate: 0.52, tasksCompleted: 18, trend: -8 },
      ],
      summary: 'Found 2 agents with declining performance over the last 30 days. Research Agent shows the most significant decline.',
      recommendations: [
        'Review Research Agent configuration for recent changes',
        'Check if task complexity has increased',
        'Consider retraining or updating prompts',
      ],
      visualizations: [
        { type: 'chart', title: 'Performance Trends', description: 'Success rate over time', config: {} },
        { type: 'table', title: 'Agent Details', description: 'Detailed metrics', config: {} },
      ],
    };
  }

  if (lowerQuery.includes('cost') || lowerQuery.includes('spend')) {
    return {
      query,
      intent: 'cost_analysis',
      filters: {},
      results: {
        total: 156.42,
        breakdown: {
          llm: 109.49,
          escalations: 31.28,
          other: 15.65,
        },
      },
      summary: 'Total spend of $156.42 over the last 30 days, averaging $5.21 per day.',
      recommendations: [
        'LLM usage accounts for 70% of costs - consider optimizing prompts',
        'Escalations are 20% of costs - review escalation triggers',
      ],
      visualizations: [
        { type: 'chart', title: 'Cost Trend', description: 'Daily spending', config: {} },
        { type: 'chart', title: 'Cost Breakdown', description: 'By category', config: {} },
      ],
    };
  }

  return {
    query,
    intent: 'general',
    filters: {},
    results: { overview: 'general data' },
    summary: 'Here is a general overview of your AI workforce activity.',
    recommendations: ['Explore specific sections for detailed metrics'],
    visualizations: [
      { type: 'metric', title: 'Key Metrics', description: 'Summary KPIs', config: {} },
    ],
  };
}
