'use client';

import { AlertCircle, TrendingDown, DollarSign, Scale, HelpCircle, Clock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface EscalationSectionProps {
  config: {
    confidenceThreshold: number;
    escalateHighStakes: boolean;
    escalateAmbiguity: boolean;
    escalateNovelSituations: boolean;
    escalateErrors: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    maxEscalationsPerHour: number;
  };
  onChange: (config: EscalationSectionProps['config']) => void;
}

interface TriggerOption {
  key: keyof Omit<EscalationSectionProps['config'], 'confidenceThreshold' | 'quietHoursStart' | 'quietHoursEnd' | 'maxEscalationsPerHour'>;
  label: string;
  description: string;
  icon: React.ElementType;
  examples?: string[];
}

const triggerOptions: TriggerOption[] = [
  {
    key: 'escalateHighStakes',
    label: 'High-Stakes Actions',
    description: 'Auto-escalate financial, legal, or customer-impacting decisions',
    icon: DollarSign,
    examples: ['Refunds over $100', 'Contract modifications', 'Pricing changes'],
  },
  {
    key: 'escalateAmbiguity',
    label: 'Ambiguity Detection',
    description: 'Escalate when instructions are unclear or conflicting',
    icon: HelpCircle,
    examples: ['Conflicting requirements', 'Missing information', 'Vague instructions'],
  },
  {
    key: 'escalateNovelSituations',
    label: 'Novel Situations',
    description: 'Escalate unprecedented scenarios not seen in training',
    icon: Scale,
    examples: ['New error types', 'Unusual patterns', 'Edge cases'],
  },
  {
    key: 'escalateErrors',
    label: 'Error Recovery Failed',
    description: 'Escalate after failed attempts to resolve errors',
    icon: AlertCircle,
    examples: ['API failures', 'Data inconsistencies', 'Timeout errors'],
  },
];

export function EscalationSection({
  config,
  onChange,
}: EscalationSectionProps) {
  const updateConfig = <K extends keyof typeof config>(key: K, value: typeof config[K]) => {
    onChange({ ...config, [key]: value });
  };

  const toggleTrigger = (key: TriggerOption['key']) => {
    updateConfig(key, !config[key]);
  };

  return (
    <div className="space-y-8">
      {/* Confidence Threshold */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-muted-foreground" />
            <Label className="font-medium">Confidence Threshold</Label>
          </div>
          <Badge variant={config.confidenceThreshold < 70 ? 'destructive' : config.confidenceThreshold < 85 ? 'secondary' : 'default'}>
            {config.confidenceThreshold}%
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Escalate when agent confidence falls below this threshold
        </p>
        <Slider
          value={[config.confidenceThreshold]}
          onValueChange={([value]) => updateConfig('confidenceThreshold', value)}
          min={50}
          max={95}
          step={5}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>More autonomous (50%)</span>
          <span>Balanced (70%)</span>
          <span>More cautious (95%)</span>
        </div>
      </div>

      <Separator />

      {/* Escalation Triggers */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Escalation Triggers</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure when agents should automatically escalate to human oversight
        </p>

        <div className="grid gap-3">
          {triggerOptions.map((trigger) => {
            const Icon = trigger.icon;
            const isEnabled = config[trigger.key];

            return (
              <div
                key={trigger.key}
                className={cn(
                  'p-4 rounded-lg border transition-all',
                  isEnabled
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'p-2 rounded-lg',
                      isEnabled ? 'bg-primary/10' : 'bg-muted'
                    )}>
                      <Icon className={cn(
                        'h-4 w-4',
                        isEnabled ? 'text-primary' : 'text-muted-foreground'
                      )} />
                    </div>
                    <div>
                      <span className="font-medium">{trigger.label}</span>
                      <p className="text-sm text-muted-foreground">{trigger.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => toggleTrigger(trigger.key)}
                  />
                </div>
                {isEnabled && trigger.examples && (
                  <div className="mt-3 flex flex-wrap gap-2 pl-11">
                    {trigger.examples.map((example) => (
                      <Badge key={example} variant="secondary" className="text-xs">
                        {example}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Rate Limiting */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Rate Limiting</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="max-escalations">
              Max Escalations Per Hour
            </Label>
            <div className="flex items-center gap-4">
              <Input
                id="max-escalations"
                type="number"
                min={1}
                max={50}
                value={config.maxEscalationsPerHour}
                onChange={(e) => updateConfig('maxEscalationsPerHour', parseInt(e.target.value) || 10)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                Prevents escalation spam from misconfigured agents
              </span>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Quiet Hours */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Quiet Hours (Optional)</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          During quiet hours, non-critical escalations are queued until the window ends
        </p>

        <div className="flex items-center gap-4">
          <div className="space-y-2">
            <Label htmlFor="quiet-start" className="text-xs">Start</Label>
            <Input
              id="quiet-start"
              type="time"
              value={config.quietHoursStart || ''}
              onChange={(e) => updateConfig('quietHoursStart', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quiet-end" className="text-xs">End</Label>
            <Input
              id="quiet-end"
              type="time"
              value={config.quietHoursEnd || ''}
              onChange={(e) => updateConfig('quietHoursEnd', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
