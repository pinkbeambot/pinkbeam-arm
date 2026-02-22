'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn, formatCurrency } from '@/lib/utils';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Clock, 
  DollarSign,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react';
import type { 
  TaskCompletionPrediction, 
  AgentWorkloadForecast, 
  CostProjection, 
  Anomaly 
} from '@/types/advanced-analytics';

interface PredictiveAnalyticsWidgetProps {
  taskPredictions?: TaskCompletionPrediction[];
  workloadForecasts?: AgentWorkloadForecast[];
  costProjection?: CostProjection;
  anomalies?: Anomaly[];
  isLoading?: boolean;
  className?: string;
}

export function PredictiveAnalyticsWidget({
  taskPredictions,
  workloadForecasts,
  costProjection,
  anomalies,
  isLoading,
  className,
}: PredictiveAnalyticsWidgetProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('workload');

  if (isLoading) {
    return <PredictiveAnalyticsSkeleton className={className} />;
  }

  const hasAnomalies = anomalies && anomalies.length > 0;
  const highSeverityAnomalies = anomalies?.filter(a => a.severity === 'high' || a.severity === 'critical') || [];

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Brain className="h-4 w-4 text-primary" />
              ML Predictions
            </CardTitle>
            <CardDescription>
              AI-powered forecasts and anomaly detection
            </CardDescription>
          </div>
          {hasAnomalies && (
            <Badge variant={highSeverityAnomalies.length > 0 ? 'destructive' : 'secondary'} className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {anomalies?.length} anomalies
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {/* Anomalies Section */}
        {hasAnomalies && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Detected Anomalies
            </h4>
            <div className="space-y-2">
              {anomalies?.slice(0, 3).map((anomaly) => (
                <AnomalyCard key={anomaly.id} anomaly={anomaly} />
              ))}
            </div>
          </div>
        )}

        {/* Workload Forecasts */}
        {workloadForecasts && workloadForecasts.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setExpandedSection(expandedSection === 'workload' ? null : 'workload')}
              className="flex w-full items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
            >
              <span>Workload Forecasts</span>
              {expandedSection === 'workload' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {expandedSection === 'workload' && (
              <div className="space-y-2">
                {workloadForecasts.slice(0, 3).map((forecast) => (
                  <WorkloadForecastCard key={forecast.agentId} forecast={forecast} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Cost Projection */}
        {costProjection && (
          <div className="space-y-2">
            <button
              onClick={() => setExpandedSection(expandedSection === 'cost' ? null : 'cost')}
              className="flex w-full items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
            >
              <span>Cost Projection</span>
              {expandedSection === 'cost' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {expandedSection === 'cost' && (
              <CostProjectionCard projection={costProjection} />
            )}
          </div>
        )}

        {/* Task Predictions */}
        {taskPredictions && taskPredictions.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setExpandedSection(expandedSection === 'tasks' ? null : 'tasks')}
              className="flex w-full items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
            >
              <span>Task Predictions</span>
              {expandedSection === 'tasks' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {expandedSection === 'tasks' && (
              <div className="space-y-2">
                {taskPredictions.slice(0, 3).map((prediction) => (
                  <TaskPredictionCard key={prediction.taskId} prediction={prediction} />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnomalyCard({ anomaly }: { anomaly: Anomaly }) {
  const severityColors = {
    low: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    critical: 'bg-red-500/10 text-red-600 border-red-500/20',
  };

  const typeIcons = {
    cost: DollarSign,
    performance: Zap,
    activity: Clock,
    system: AlertTriangle,
  };

  const Icon = typeIcons[anomaly.type];

  return (
    <div className={cn(
      'rounded-lg border p-3 text-sm',
      severityColors[anomaly.severity]
    )}>
      <div className="flex items-start gap-2">
        <Icon className="h-4 w-4 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium">{anomaly.title}</p>
          <p className="text-xs opacity-90 mt-1">{anomaly.description}</p>
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span>Expected: {anomaly.expectedValue}</span>
            <span>Actual: {anomaly.actualValue}</span>
            <span className={anomaly.deviation > 0 ? 'text-red-600' : 'text-green-600'}>
              {anomaly.deviation > 0 ? '+' : ''}{anomaly.deviation}%
            </span>
          </div>
          {anomaly.recommendedAction && (
            <p className="text-xs mt-2 opacity-75">
              💡 {anomaly.recommendedAction}
            </p>
          )}
        </div>
        <Badge variant="outline" className="shrink-0 text-xs capitalize">
          {anomaly.severity}
        </Badge>
      </div>
    </div>
  );
}

function WorkloadForecastCard({ forecast }: { forecast: AgentWorkloadForecast }) {
  const trendIcons = {
    increasing: <TrendingUp className="h-3 w-3 text-red-500" />,
    decreasing: <TrendingDown className="h-3 w-3 text-green-500" />,
    stable: <div className="h-3 w-3 rounded-full bg-gray-400" />,
  };

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm">{forecast.agentName}</span>
        <div className="flex items-center gap-1">
          {trendIcons[forecast.trend]}
          <span className="text-xs text-muted-foreground capitalize">{forecast.trend}</span>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Current Load</span>
          <span>{forecast.currentLoad}%</span>
        </div>
        <Progress value={forecast.currentLoad} className="h-1.5" />
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Predicted (7d)</span>
          <span className={forecast.predictedLoad > 80 ? 'text-red-600' : ''}>
            {forecast.predictedLoad}%
          </span>
        </div>
        <Progress 
          value={forecast.predictedLoad} 
          className="h-1.5"
        />
      </div>
      {forecast.recommendedAction && (
        <p className="text-xs text-muted-foreground mt-2">
          💡 {forecast.recommendedAction}
        </p>
      )}
    </div>
  );
}

function CostProjectionCard({ projection }: { projection: CostProjection }) {
  const trendIcons = {
    up: <TrendingUp className="h-4 w-4 text-red-500" />,
    down: <TrendingDown className="h-4 w-4 text-green-500" />,
    stable: <div className="h-4 w-4 rounded-full bg-gray-400" />,
  };

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Projected ({projection.period})</p>
          <p className="text-2xl font-bold">{formatCurrency(projection.projectedSpend)}</p>
        </div>
        <div className="flex items-center gap-2">
          {trendIcons[projection.trend]}
          <span className={cn(
            'text-sm font-medium',
            projection.projectedChange > 0 ? 'text-red-600' : 'text-green-600'
          )}>
            {projection.projectedChange > 0 ? '+' : ''}{projection.projectedChange.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <h5 className="text-xs font-medium text-muted-foreground">Breakdown</h5>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">LLM</p>
            <p className="text-sm font-medium">{formatCurrency(projection.breakdown.llmUsage)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Escalations</p>
            <p className="text-sm font-medium">{formatCurrency(projection.breakdown.escalations)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Other</p>
            <p className="text-sm font-medium">{formatCurrency(projection.breakdown.other)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskPredictionCard({ prediction }: { prediction: TaskCompletionPrediction }) {
  const confidenceColor = prediction.confidenceScore > 0.8 ? 'bg-green-500' 
    : prediction.confidenceScore > 0.6 ? 'bg-yellow-500' 
    : 'bg-red-500';

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm truncate">Task {prediction.taskId.slice(0, 8)}...</span>
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">{prediction.predictedDuration}m</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className={cn('h-2 w-2 rounded-full', confidenceColor)} />
        <span className="text-xs text-muted-foreground">
          {(prediction.confidenceScore * 100).toFixed(0)}% confidence
        </span>
      </div>
    </div>
  );
}

function PredictiveAnalyticsSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
