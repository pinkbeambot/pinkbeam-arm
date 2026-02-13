'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  DollarSign,
  Clock,
  Calculator,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import type { ROIMetrics } from './types';

interface ROIMetricsSectionProps {
  data: ROIMetrics;
  className?: string;
}

export function ROIMetricsSection({ data, className }: ROIMetricsSectionProps) {
  const {
    totalTasksCompleted,
    totalCost,
    estimatedHumanHoursSaved,
    humanHourlyRate,
    estimatedValueGenerated,
    roiPercentage,
    costPerTask,
    tasksPerDollar,
    projectedMonthlyCost,
    projectedAnnualCost,
  } = data;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              ROI Analysis
            </CardTitle>
            <CardDescription>
              Value generated vs. cost of AI workforce
            </CardDescription>
          </div>
          <Badge variant={roiPercentage > 1000 ? 'default' : 'secondary'} className="text-lg px-3 py-1">
            {roiPercentage.toFixed(0)}% ROI
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main ROI Visual */}
        <div className="relative p-6 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cost */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium text-muted-foreground">Cost</span>
              </div>
              <p className="text-3xl font-bold text-red-600">
                ${totalCost.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Total AI workforce spend
              </p>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center">
              <div className="hidden md:flex items-center gap-2">
                <ArrowRight className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <div className="md:hidden">
                <div className="h-px w-full bg-border my-4" />
              </div>
            </div>

            {/* Value */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-muted-foreground">Value Generated</span>
              </div>
              <p className="text-3xl font-bold text-green-600">
                ${estimatedValueGenerated.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {estimatedHumanHoursSaved.toLocaleString()} hours saved
              </p>
            </div>
          </div>

          {/* ROI Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Return on Investment</span>
              <span className="font-bold">{roiPercentage.toFixed(0)}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-1000 rounded-full",
                  roiPercentage > 1000 ? "bg-green-500" :
                  roiPercentage > 500 ? "bg-green-400" :
                  roiPercentage > 200 ? "bg-yellow-400" : "bg-orange-400"
                )}
                style={{ width: `${Math.min(roiPercentage / 20, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Detailed Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ROIMetricCard
            icon={Calculator}
            label="Cost per Task"
            value={`$${costPerTask.toFixed(2)}`}
            subtext="Average cost"
          />
          <ROIMetricCard
            icon={TrendingUp}
            label="Tasks per $"
            value={tasksPerDollar.toFixed(1)}
            subtext="Efficiency metric"
          />
          <ROIMetricCard
            icon={Clock}
            label="Human Hours Saved"
            value={estimatedHumanHoursSaved.toLocaleString()}
            subtext="vs manual work"
          />
          <ROIMetricCard
            icon={DollarSign}
            label="Hourly Rate"
            value={`$${humanHourlyRate}/hr`}
            subtext="Equivalent value"
          />
        </div>

        {/* Projections */}
        <div className="p-4 rounded-lg bg-muted/50">
          <h4 className="text-sm font-medium mb-4">Projected Costs</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-background rounded-md">
              <span className="text-sm text-muted-foreground">Monthly (projected)</span>
              <span className="font-bold">${projectedMonthlyCost.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-background rounded-md">
              <span className="text-sm text-muted-foreground">Annual (projected)</span>
              <span className="font-bold">${projectedAnnualCost.toLocaleString()}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Based on current usage patterns. Actual costs may vary based on task volume and complexity.
          </p>
        </div>

        {/* Comparison to Human Labor */}
        <div className="border rounded-lg p-4">
          <h4 className="text-sm font-medium mb-3">Comparison to Human Labor</h4>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">AI Workforce Cost</span>
                <span className="font-medium">${totalCost.toLocaleString()}</span>
              </div>
              <Progress value={(totalCost / estimatedValueGenerated) * 100} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Human Labor Equivalent</span>
                <span className="font-medium">${estimatedValueGenerated.toLocaleString()}</span>
              </div>
              <Progress value={100} className="h-2" />
            </div>
          </div>
          <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-md">
            <p className="text-sm text-green-700 dark:text-green-400">
              <strong>Savings: ${(estimatedValueGenerated - totalCost).toLocaleString()}</strong>
              {' '}({((1 - totalCost / estimatedValueGenerated) * 100).toFixed(1)}% less than human labor)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ROIMetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext: string;
}

function ROIMetricCard({ icon: Icon, label, value, subtext }: ROIMetricCardProps) {
  return (
    <div className="p-4 rounded-lg bg-muted/30 text-center">
      <Icon className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      <p className="text-xs text-muted-foreground">{subtext}</p>
    </div>
  );
}
