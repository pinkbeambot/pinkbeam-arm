'use client';

import { Settings2, Thermometer, Hash, Clock, FileJson } from 'lucide-react';
import { Label } from '@/lib/ui/label';
import { Slider } from '@/lib/ui/slider';
import { Input } from '@/lib/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/lib/ui/select';
import { Switch } from '@/lib/ui/switch';
import { Badge } from '@/lib/ui/badge';
import { Separator } from '@/lib/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/lib/ui/tooltip';
import { cn } from '@/lib/utils';

interface AdvancedSectionProps {
  config: {
    model: string;
    temperature: number;
    maxTokens: number;
    timeoutSeconds: number;
    jsonMode: boolean;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
  onChange: (config: AdvancedSectionProps['config']) => void;
}

const models = [
  { value: 'claude-3-opus', label: 'Claude 3 Opus', provider: 'Anthropic', description: 'Most capable, best for complex tasks' },
  { value: 'claude-3-sonnet', label: 'Claude 3.5 Sonnet', provider: 'Anthropic', description: 'Balanced performance and speed' },
  { value: 'claude-3-haiku', label: 'Claude 3 Haiku', provider: 'Anthropic', description: 'Fastest, good for simple tasks' },
  { value: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI', description: 'Latest GPT-4 optimized model' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', provider: 'OpenAI', description: 'Reliable, well-tested' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI', description: 'Cost-effective, fast' },
];

export function AdvancedSection({
  config,
  onChange,
}: AdvancedSectionProps) {
  const updateConfig = <K extends keyof typeof config>(key: K, value: typeof config[K]) => {
    onChange({ ...config, [key]: value });
  };

  const selectedModel = models.find(m => m.value === config.model);

  return (
    <div className="space-y-8">
      {/* Model Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-muted-foreground" />
          <Label className="font-medium">Model Selection</Label>
        </div>
        
        <Select
          value={config.model}
          onValueChange={(value) => updateConfig('model', value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{model.label}</span>
                    <Badge variant="outline" className="text-xs">{model.provider}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{model.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedModel && (
          <div className="bg-muted rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Provider: {selectedModel.provider}</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground" />
              <span>{selectedModel.description}</span>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Temperature */}
      <div className="space-y-4">
        <TooltipProvider>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-muted-foreground" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label className="font-medium cursor-help">Temperature</Label>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Controls randomness: 0 = deterministic, 1 = creative</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Badge variant="secondary">{config.temperature.toFixed(1)}</Badge>
          </div>
        </TooltipProvider>
        
        <p className="text-sm text-muted-foreground">
          Lower values make responses more focused and deterministic. Higher values increase creativity and variation.
        </p>
        
        <Slider
          value={[config.temperature]}
          onValueChange={([value]) => updateConfig('temperature', value)}
          min={0}
          max={1}
          step={0.1}
          className="w-full"
        />
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className={cn(config.temperature <= 0.3 && 'font-medium text-foreground')}>
            Focused (0.0)
          </span>
          <span className={cn(config.temperature > 0.3 && config.temperature < 0.7 && 'font-medium text-foreground')}>
            Balanced (0.5)
          </span>
          <span className={cn(config.temperature >= 0.7 && 'font-medium text-foreground')}>
            Creative (1.0)
          </span>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Recommended:</strong>{' '}
            {config.temperature <= 0.3 && 'Use for tasks requiring precision like data extraction or coding.'}
            {config.temperature > 0.3 && config.temperature < 0.7 && 'Good balance for most business tasks and decision-making.'}
            {config.temperature >= 0.7 && 'Use for creative tasks like writing or brainstorming.'}
          </p>
        </div>
      </div>

      <Separator />

      {/* Max Tokens */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Hash className="h-5 w-5 text-muted-foreground" />
          <Label className="font-medium">Max Tokens</Label>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Maximum number of tokens the agent can generate in a single response
        </p>

        <div className="flex items-center gap-4">
          <Input
            type="number"
            min={100}
            max={8000}
            step={100}
            value={config.maxTokens}
            onChange={(e) => updateConfig('maxTokens', parseInt(e.target.value) || 1000)}
            className="w-32"
          />
          <div className="flex gap-2">
            {[500, 1000, 2000, 4000].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => updateConfig('maxTokens', value)}
                className={cn(
                  'px-3 py-1 text-xs rounded-md border transition-all',
                  config.maxTokens === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          1 token ≈ 0.75 words. Higher values allow longer responses but cost more.
        </p>
      </div>

      <Separator />

      {/* Timeout */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <Label className="font-medium">Timeout</Label>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Maximum time to wait for agent responses before timing out
        </p>

        <div className="flex items-center gap-4">
          <Input
            type="number"
            min={10}
            max={300}
            step={10}
            value={config.timeoutSeconds}
            onChange={(e) => updateConfig('timeoutSeconds', parseInt(e.target.value) || 60)}
            className="w-32"
          />
          <span className="text-sm text-muted-foreground">seconds</span>
        </div>
      </div>

      <Separator />

      {/* JSON Mode */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <FileJson className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Label className="font-medium">JSON Mode</Label>
                <Badge variant="outline" className="text-xs">Advanced</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Force agent to output valid JSON for structured data processing
              </p>
            </div>
          </div>
          <Switch
            checked={config.jsonMode}
            onCheckedChange={(checked) => updateConfig('jsonMode', checked)}
          />
        </div>

        {config.jsonMode && (
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> JSON mode requires explicit instructions in the system prompt about the expected JSON structure.
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* Advanced Parameters (Collapsed by default) */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Additional Parameters
        </h3>

        {/* Top P */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Top P (Nucleus Sampling)</Label>
            <span className="text-xs text-muted-foreground">{config.topP.toFixed(1)}</span>
          </div>
          <Slider
            value={[config.topP]}
            onValueChange={([value]) => updateConfig('topP', value)}
            min={0}
            max={1}
            step={0.1}
          />
        </div>

        {/* Frequency Penalty */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Frequency Penalty</Label>
            <span className="text-xs text-muted-foreground">{config.frequencyPenalty.toFixed(1)}</span>
          </div>
          <Slider
            value={[config.frequencyPenalty]}
            onValueChange={([value]) => updateConfig('frequencyPenalty', value)}
            min={-2}
            max={2}
            step={0.1}
          />
        </div>

        {/* Presence Penalty */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Presence Penalty</Label>
            <span className="text-xs text-muted-foreground">{config.presencePenalty.toFixed(1)}</span>
          </div>
          <Slider
            value={[config.presencePenalty]}
            onValueChange={([value]) => updateConfig('presencePenalty', value)}
            min={-2}
            max={2}
            step={0.1}
          />
        </div>
      </div>
    </div>
  );
}
