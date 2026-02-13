'use client';

import { useState } from 'react';
import { Play, Loader2, MessageSquare, AlertCircle, CheckCircle, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface TestAgentPanelProps {
  agentConfig: Record<string, unknown>;
}

interface TestResult {
  id: string;
  input: string;
  output: string;
  reasoning?: string;
  confidence?: number;
  latency: number;
  tokensUsed: number;
  timestamp: Date;
  status: 'success' | 'error' | 'escalated';
  error?: string;
}

const samplePrompts = [
  'Draft a professional email to a potential client introducing our services',
  'Analyze this data and provide insights: Q1 revenue up 15%, Q2 up 8%, Q3 down 3%',
  'Create a task list for launching a new marketing campaign',
  'Summarize the key points from this meeting transcript...',
];

export function TestAgentPanel({ agentConfig }: TestAgentPanelProps) {
  const [testInput, setTestInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);

  const handleTest = async () => {
    if (!testInput.trim()) return;

    setIsRunning(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const mockResult: TestResult = {
      id: Date.now().toString(),
      input: testInput,
      output: 'This is a simulated response from the agent. In production, this would be the actual output from testing the agent configuration.',
      reasoning: 'The agent analyzed the request and determined the appropriate response based on its system instructions and capabilities.',
      confidence: 0.85,
      latency: 1250,
      tokensUsed: 342,
      timestamp: new Date(),
      status: 'success',
    };

    setResults((prev) => [mockResult, ...prev]);
    setSelectedResult(mockResult);
    setIsRunning(false);
  };

  const runSamplePrompt = (prompt: string) => {
    setTestInput(prompt);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium">Test Agent</h3>
          <p className="text-sm text-muted-foreground">
            Dry run your agent configuration before saving
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Dry Run Mode
        </Badge>
      </div>

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
            >
              {prompt}
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
        />
        <Button
          onClick={handleTest}
          disabled={isRunning || !testInput.trim()}
          className="w-full"
        >
          {isRunning ? (
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

      {/* Results */}
      <div className="flex-1 min-h-0">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-sm">Test History</h4>
          {results.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setResults([]);
                setSelectedResult(null);
              }}
            >
              Clear All
            </Button>
          )}
        </div>

        {results.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Terminal className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No tests run yet</p>
            <p className="text-xs mt-1">Enter a prompt and click Run Test</p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100%-2rem)]">
            <div className="space-y-3 pr-4">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => setSelectedResult(result)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-all',
                    selectedResult?.id === result.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {result.status === 'success' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {result.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      {result.status === 'escalated' && (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {result.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {result.latency}ms
                    </Badge>
                  </div>
                  <p className="text-sm truncate">{result.input}</p>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Selected Result Detail */}
      {selectedResult && (
        <div className="mt-4 pt-4 border-t">
          <Accordion type="single" collapsible defaultValue="output">
            <AccordionItem value="output">
              <AccordionTrigger className="text-sm py-2">
                Response
              </AccordionTrigger>
              <AccordionContent>
                <div className="bg-muted rounded-lg p-3 text-sm">
                  {selectedResult.output}
                </div>
              </AccordionContent>
            </AccordionItem>

            {selectedResult.reasoning && (
              <AccordionItem value="reasoning">
                <AccordionTrigger className="text-sm py-2">
                  Reasoning
                </AccordionTrigger>
                <AccordionContent>
                  <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">
                    {selectedResult.reasoning}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            <AccordionItem value="metadata">
              <AccordionTrigger className="text-sm py-2">
                Metadata
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-muted rounded p-2">
                    <span className="text-muted-foreground">Confidence</span>
                    <p className="font-medium">
                      {selectedResult.confidence
                        ? `${(selectedResult.confidence * 100).toFixed(0)}%`
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-muted rounded p-2">
                    <span className="text-muted-foreground">Tokens Used</span>
                    <p className="font-medium">{selectedResult.tokensUsed}</p>
                  </div>
                  <div className="bg-muted rounded p-2">
                    <span className="text-muted-foreground">Latency</span>
                    <p className="font-medium">{selectedResult.latency}ms</p>
                  </div>
                  <div className="bg-muted rounded p-2">
                    <span className="text-muted-foreground">Status</span>
                    <p className="font-medium capitalize">{selectedResult.status}</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </div>
  );
}
