'use client';

import { useState } from 'react';
import { 
  Play, 
  Loader2, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle, 
  Terminal,
  RefreshCw,
  Trash2,
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  History,
  Sparkles,
  X
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAgentTest, type TestRunResult } from '@/lib/hooks/useAgentTest';
import { useToast } from '@/components/ui/use-toast';

interface TestAgentPanelProps {
  agentId: string;
  agentConfig?: Record<string, unknown>;
}

const samplePrompts = [
  'Draft a professional email to a potential client introducing our services',
  'Analyze this data and provide insights: Q1 revenue up 15%, Q2 up 8%, Q3 down 3%',
  'Create a task list for launching a new marketing campaign',
  'Summarize the key points from this meeting transcript...',
  'Help me prioritize my tasks for today based on urgency and impact',
  'Write a follow-up message to a customer who reported a bug',
];

export function TestAgentPanel({ agentId, agentConfig }: TestAgentPanelProps) {
  const [testInput, setTestInput] = useState('');
  const { toast } = useToast();
  
  const {
    testHistory,
    currentResult,
    isLoading,
    isLoadingHistory,
    error,
    runTest,
    fetchTestHistory,
    clearHistory,
    selectResult,
    stats,
  } = useAgentTest({ agentId });

  const handleTest = async () => {
    if (!testInput.trim()) return;

    try {
      await runTest({
        testInput: testInput.trim(),
        config: agentConfig,
        useCurrent: true,
      });
      
      toast({
        title: 'Test completed',
        description: 'Agent response received successfully.',
      });
    } catch (err) {
      toast({
        title: 'Test failed',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const runSamplePrompt = (prompt: string) => {
    setTestInput(prompt);
  };

  const handleClearHistory = () => {
    clearHistory();
    toast({
      title: 'History cleared',
      description: 'Test history has been cleared.',
    });
  };

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Test Agent
            </h3>
            <p className="text-sm text-muted-foreground">
              Test your agent with real LLM execution
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            Live Test
          </Badge>
        </div>

        {/* Stats Overview */}
        {testHistory.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            <Card className="bg-muted/50">
              <CardContent className="p-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <History className="h-3 w-3" />
                  Tests
                </div>
                <p className="text-lg font-semibold">{stats.totalTests}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <TrendingUp className="h-3 w-3" />
                  Success
                </div>
                <p className="text-lg font-semibold">{stats.successRate.toFixed(0)}%</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Clock className="h-3 w-3" />
                  Avg Time
                </div>
                <p className="text-lg font-semibold">{Math.round(stats.avgResponseTime)}ms</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <DollarSign className="h-3 w-3" />
                  Total Cost
                </div>
                <p className="text-lg font-semibold">{formatCurrency(stats.totalCost)}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sample Prompts */}
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Sample Prompts
          </p>
          <div className="flex flex-wrap gap-2">
            {samplePrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => runSamplePrompt(prompt)}
                className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary hover:bg-primary/5 transition-all text-left truncate max-w-[200px]"
                title={prompt}
              >
                {prompt.length > 40 ? prompt.slice(0, 40) + '...' : prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Test Input</span>
          </div>
          <Textarea
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="Enter a test prompt to see how your agent responds..."
            rows={4}
            disabled={isLoading}
          />
          <Button
            onClick={handleTest}
            disabled={isLoading || !testInput.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Test...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Test
              </>
            )}
          </Button>
        </div>

        <Separator className="my-4" />

        {/* Results Section */}
        <div className="flex-1 min-h-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm">Test History</h4>
              {isLoadingHistory && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchTestHistory}
                    disabled={isLoadingHistory}
                  >
                    <RefreshCw className={cn("h-4 w-4", isLoadingHistory && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh history</p>
                </TooltipContent>
              </Tooltip>
              {testHistory.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearHistory}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clear history</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="text-sm text-destructive">
                <p className="font-medium">Error</p>
                <p className="text-destructive/80">{error.message}</p>
              </div>
            </div>
          )}

          {testHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Terminal className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No tests run yet</p>
              <p className="text-xs mt-1">Enter a prompt and click Run Test</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100%-2rem)]">
              <div className="space-y-3 pr-4">
                {testHistory.map((result) => (
                  <TestResultItem
                    key={result.id}
                    result={result}
                    isSelected={currentResult?.id === result.id}
                    onClick={() => selectResult(result)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Selected Result Detail */}
        {currentResult && (
          <TestResultDetail 
            result={currentResult} 
            onClose={() => selectResult(null)}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

/**
 * Individual test result item
 */
interface TestResultItemProps {
  result: TestRunResult;
  isSelected: boolean;
  onClick: () => void;
}

function TestResultItem({ result, isSelected, onClick }: TestResultItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-all',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {result.success ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          <span className="text-xs text-muted-foreground">
            {result.timestamp.toLocaleTimeString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {result.costUsd !== undefined && result.costUsd > 0 && (
            <Badge variant="outline" className="text-xs">
              {formatCurrency(result.costUsd)}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {result.responseTimeMs}ms
          </Badge>
        </div>
      </div>
      <p className="text-sm truncate">{result.input}</p>
      {result.modelUsed && result.modelUsed !== 'unknown' && (
        <p className="text-xs text-muted-foreground mt-1">
          Model: {result.modelUsed}
        </p>
      )}
    </button>
  );
}

/**
 * Test result detail panel
 */
interface TestResultDetailProps {
  result: TestRunResult;
  onClose: () => void;
}

function TestResultDetail({ result, onClose }: TestResultDetailProps) {
  return (
    <div className="mt-4 pt-4 border-t">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-sm">Test Result Details</h4>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <Accordion type="single" collapsible defaultValue="output">
        {/* Input */}
        <AccordionItem value="input">
          <AccordionTrigger className="text-sm py-2">
            Input
          </AccordionTrigger>
          <AccordionContent>
            <div className="bg-muted rounded-lg p-3 text-sm">
              {result.input}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Output */}
        <AccordionItem value="output">
          <AccordionTrigger className="text-sm py-2">
            Response
          </AccordionTrigger>
          <AccordionContent>
            <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">
              {result.output}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Error (if any) */}
        {!result.success && result.errorMessage && (
          <AccordionItem value="error">
            <AccordionTrigger className="text-sm py-2 text-destructive">
              Error
            </AccordionTrigger>
            <AccordionContent>
              <div className="bg-destructive/10 rounded-lg p-3 text-sm text-destructive">
                {result.errorMessage}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Metadata */}
        <AccordionItem value="metadata">
          <AccordionTrigger className="text-sm py-2">
            Metadata
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-muted rounded p-2">
                <span className="text-muted-foreground text-xs">Status</span>
                <p className={cn(
                  "font-medium",
                  result.success ? "text-green-600" : "text-red-600"
                )}>
                  {result.success ? 'Success' : 'Failed'}
                </p>
              </div>
              <div className="bg-muted rounded p-2">
                <span className="text-muted-foreground text-xs">Model</span>
                <p className="font-medium">{result.modelUsed}</p>
              </div>
              <div className="bg-muted rounded p-2">
                <span className="text-muted-foreground text-xs">Latency</span>
                <p className="font-medium">{result.responseTimeMs}ms</p>
              </div>
              <div className="bg-muted rounded p-2">
                <span className="text-muted-foreground text-xs">Tokens Used</span>
                <p className="font-medium">{result.tokensUsed ?? 'N/A'}</p>
              </div>
              <div className="bg-muted rounded p-2">
                <span className="text-muted-foreground text-xs">Cost</span>
                <p className="font-medium">{result.costUsd ? formatCurrency(result.costUsd) : 'N/A'}</p>
              </div>
              <div className="bg-muted rounded p-2">
                <span className="text-muted-foreground text-xs">Timestamp</span>
                <p className="font-medium">{result.timestamp.toLocaleString()}</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
