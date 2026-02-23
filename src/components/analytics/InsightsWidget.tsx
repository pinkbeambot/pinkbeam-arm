'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  Lightbulb, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Zap,
  X,
  ChevronRight,
  Bot,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import type { AutomatedInsight, SmartAlert } from '@/types/advanced-analytics';

interface InsightsWidgetProps {
  insights?: AutomatedInsight[];
  alerts?: SmartAlert[];
  isLoading?: boolean;
  className?: string;
  onAcknowledgeAlert?: (alertId: string) => void;
}

export function InsightsWidget({
  insights,
  alerts,
  isLoading,
  className,
  onAcknowledgeAlert,
}: InsightsWidgetProps) {
  const [activeTab, setActiveTab] = useState<'insights' | 'alerts'>('insights');
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  if (isLoading) {
    return <InsightsSkeleton className={className} />;
  }

  const activeAlerts = alerts?.filter(a => !dismissedAlerts.has(a.id)) || [];
  const hasAlerts = activeAlerts.length > 0;
  const hasInsights = insights && insights.length > 0;

  const handleDismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
    onAcknowledgeAlert?.(alertId);
  };

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Lightbulb className="h-4 w-4 text-primary" />
              AI Insights
            </CardTitle>
            <CardDescription>
              Automated analysis and recommendations
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('insights')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                activeTab === 'insights' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              Insights
              {hasInsights && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-primary-foreground/20 rounded-full text-xs">
                  {insights?.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors relative',
                activeTab === 'alerts' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
                hasAlerts && activeTab !== 'alerts' && 'ring-2 ring-red-500'
              )}
            >
              Alerts
              {hasAlerts && (
                <span className={cn(
                  'ml-1.5 px-1.5 py-0.5 rounded-full text-xs',
                  activeTab === 'alerts' ? 'bg-primary-foreground/20' : 'bg-red-500 text-white'
                )}>
                  {activeAlerts.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {activeTab === 'insights' ? (
          hasInsights ? (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3 pr-4">
                {insights?.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    isExpanded={expandedInsight === insight.id}
                    onToggle={() => setExpandedInsight(
                      expandedInsight === insight.id ? null : insight.id
                    )}
                  />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <EmptyState 
              icon={<Lightbulb className="h-8 w-8" />}
              title="No insights yet"
              description="Insights will appear as patterns emerge in your data."
            />
          )
        ) : (
          hasAlerts ? (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3 pr-4">
                {activeAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onDismiss={() => handleDismissAlert(alert.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <EmptyState 
              icon={<CheckCircle2 className="h-8 w-8 text-green-500" />}
              title="All clear!"
              description="No active alerts at this time."
            />
          )
        )}
      </CardContent>
    </Card>
  );
}

function InsightCard({ 
  insight, 
  isExpanded, 
  onToggle 
}: { 
  insight: AutomatedInsight; 
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const categoryIcons = {
    performance: <Zap className="h-4 w-4" />,
    cost: <DollarSign className="h-4 w-4" />,
    bottleneck: <AlertTriangle className="h-4 w-4" />,
    opportunity: <TrendingUp className="h-4 w-4" />,
    risk: <AlertCircle className="h-4 w-4" />,
  };

  const categoryColors = {
    performance: 'bg-blue-500/10 text-blue-600',
    cost: 'bg-green-500/10 text-green-600',
    bottleneck: 'bg-amber-500/10 text-amber-600',
    opportunity: 'bg-purple-500/10 text-purple-600',
    risk: 'bg-red-500/10 text-red-600',
  };

  const priorityColors = {
    low: 'bg-gray-500',
    medium: 'bg-blue-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  };

  return (
    <div 
      className="rounded-lg border p-3 cursor-pointer transition-colors hover:bg-muted/50"
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          categoryColors[insight.category]
        )}>
          {categoryIcons[insight.category]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm truncate">{insight.title}</h4>
            <div className={cn('h-2 w-2 rounded-full', priorityColors[insight.priority])} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
          
          {isExpanded && (
            <div className="mt-3 space-y-3">
              {insight.metrics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {insight.metrics.map((metric, i) => (
                    <div key={i} className="bg-muted rounded-md px-2 py-1">
                      <span className="text-xs text-muted-foreground">{metric.label}: </span>
                      <span className="text-xs font-medium">{metric.value}</span>
                      {metric.change && (
                        <span className={cn(
                          'text-xs ml-1',
                          metric.change.startsWith('+') ? 'text-red-600' : 'text-green-600'
                        )}>
                          {metric.change}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Context:</span> {insight.context}
                </p>
                <div className="flex items-start gap-1.5">
                  <span className="text-lg">💡</span>
                  <p className="text-xs">{insight.recommendation}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        <ChevronRight className={cn(
          'h-4 w-4 text-muted-foreground transition-transform',
          isExpanded && 'rotate-90'
        )} />
      </div>
    </div>
  );
}

function AlertCard({ alert, onDismiss }: { alert: SmartAlert; onDismiss: () => void }) {
  const severityColors = {
    info: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    critical: 'bg-red-500/10 text-red-600 border-red-500/20',
  };

  const typeIcons = {
    cost: <DollarSign className="h-4 w-4" />,
    performance: <Zap className="h-4 w-4" />,
    system: <AlertTriangle className="h-4 w-4" />,
    security: <AlertCircle className="h-4 w-4" />,
  };

  return (
    <div className={cn(
      'rounded-lg border p-3',
      severityColors[alert.severity]
    )}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          {typeIcons[alert.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">{alert.title}</h4>
            <button 
              onClick={(e) => { e.stopPropagation(); onDismiss(); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-xs opacity-90 mt-1">{alert.message}</p>
          <p className="text-xs opacity-75 mt-1">
            Triggered {new Date(alert.triggeredAt).toLocaleTimeString()}
          </p>
          {alert.actions.length > 0 && (
            <div className="flex gap-2 mt-2">
              {alert.actions.map((action, i) => (
                <Button 
                  key={i}
                  variant="outline" 
                  size="sm"
                  className="h-7 text-xs"
                  asChild
                >
                  <a href={action.action.startsWith('/') ? action.action : '#'}>
                    {action.label}
                  </a>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex h-[200px] flex-col items-center justify-center text-center text-muted-foreground">
      <div className="mb-3 opacity-50">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs mt-1 max-w-[200px]">{description}</p>
    </div>
  );
}

function InsightsSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
