'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Save, 
  X, 
  RotateCcw, 
  Sparkles, 
  History, 
  TestTube,
  AlertCircle,
  CheckCircle2,
  ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Agent, AgentRole, Capability } from '@/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/use-toast';

import { BasicInfoSection } from './BasicInfoSection';
import { InstructionsSection } from './InstructionsSection';
import { CapabilitiesSection } from './CapabilitiesSection';
import { EscalationSection } from './EscalationSection';
import { AdvancedSection } from './AdvancedSection';
import { TemplateLibrary, AgentTemplate } from './TemplateLibrary';
import { VersionHistory } from './VersionHistory';
import { TestAgentPanel } from './TestAgentPanel';

interface AgentConfigFormProps {
  agent: Agent;
  onSave: (updates: Partial<Agent>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface FormState {
  // Basic Info
  name: string;
  role: AgentRole;
  description: string;
  avatarUrl: string;
  
  // Instructions
  systemPrompt: string;
  successCriteria: string;
  examples: string;
  
  // Capabilities
  capabilities: Capability[];
  toolConfig: Record<string, boolean>;
  
  // Escalation
  escalationConfig: {
    confidenceThreshold: number;
    escalateHighStakes: boolean;
    escalateAmbiguity: boolean;
    escalateNovelSituations: boolean;
    escalateErrors: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    maxEscalationsPerHour: number;
  };
  
  // Advanced
  advancedConfig: {
    model: string;
    temperature: number;
    maxTokens: number;
    timeoutSeconds: number;
    jsonMode: boolean;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
}

function getInitialFormState(agent: Agent): FormState {
  return {
    name: agent.name || '',
    role: agent.role || 'worker',
    description: agent.description || '',
    avatarUrl: agent.avatar_url || '',
    systemPrompt: (agent.configuration?.systemPrompt as string) || '',
    successCriteria: (agent.configuration?.successCriteria as string) || '',
    examples: (agent.configuration?.examples as string) || '',
    capabilities: agent.capabilities || [],
    toolConfig: (agent.configuration?.toolConfig as Record<string, boolean>) || {},
    escalationConfig: {
      confidenceThreshold: (agent.limits?.escalation_threshold as number) || 70,
      escalateHighStakes: true,
      escalateAmbiguity: true,
      escalateNovelSituations: false,
      escalateErrors: true,
      quietHoursStart: '',
      quietHoursEnd: '',
      maxEscalationsPerHour: 10,
    },
    advancedConfig: {
      model: agent.llm_config?.model || 'claude-3-sonnet',
      temperature: agent.llm_config?.temperature || 0.7,
      maxTokens: agent.llm_config?.max_tokens || 2000,
      timeoutSeconds: agent.limits?.timeout_seconds || 60,
      jsonMode: false,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
  };
}

export function AgentConfigForm({ agent, onSave, onCancel, isLoading }: AgentConfigFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [formState, setFormState] = useState<FormState>(() => getInitialFormState(agent));
  const [originalState] = useState<FormState>(() => getInitialFormState(agent));
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // Track changes
  useEffect(() => {
    const changed = JSON.stringify(formState) !== JSON.stringify(originalState);
    setHasChanges(changed);
  }, [formState, originalState]);

  const validate = useCallback((): boolean => {
    const errors: string[] = [];

    if (!formState.name.trim()) {
      errors.push('Agent name is required');
    }

    if (!formState.description.trim()) {
      errors.push('Role description is required');
    }

    if (!formState.systemPrompt.trim()) {
      errors.push('System instructions are required');
    }

    if (formState.capabilities.length === 0) {
      errors.push('At least one capability must be selected');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, [formState]);

  const handleSave = async () => {
    if (!validate()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before saving',
        variant: 'destructive',
      });
      return;
    }

    try {
      const updates: Partial<Agent> = {
        name: formState.name,
        role: formState.role,
        description: formState.description,
        avatar_url: formState.avatarUrl,
        capabilities: formState.capabilities,
        model: formState.advancedConfig.model,
        configuration: {
          ...agent.configuration,
          systemPrompt: formState.systemPrompt,
          successCriteria: formState.successCriteria,
          examples: formState.examples,
          toolConfig: formState.toolConfig,
        },
        llm_config: {
          provider: formState.advancedConfig.model.startsWith('claude') ? 'anthropic' : 'openai',
          model: formState.advancedConfig.model,
          temperature: formState.advancedConfig.temperature,
          max_tokens: formState.advancedConfig.maxTokens,
        },
        limits: {
          max_sub_agents: agent.limits?.max_sub_agents || 10,
          escalation_threshold: formState.escalationConfig.confidenceThreshold,
          timeout_seconds: formState.advancedConfig.timeoutSeconds,
          max_tokens_per_task: agent.limits?.max_tokens_per_task || 4000,
          max_cost_per_task_usd: agent.limits?.max_cost_per_task_usd || 1.0,
        },
      };

      await onSave(updates);
      toast({
        title: 'Configuration Saved',
        description: `${formState.name} has been updated successfully.`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to save configuration. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDiscard = () => {
    setFormState(originalState);
    setValidationErrors([]);
    toast({
      title: 'Changes Discarded',
      description: 'Your changes have been reverted.',
    });
  };

  const applyTemplate = (template: AgentTemplate) => {
    setFormState((prev) => ({
      ...prev,
      name: template.name,
      role: template.role,
      description: template.description,
      systemPrompt: template.systemPrompt,
      successCriteria: template.successCriteria,
      capabilities: template.defaultCapabilities,
      advancedConfig: {
        ...prev.advancedConfig,
        model: template.suggestedModel,
      },
    }));

    toast({
      title: 'Template Applied',
      description: `${template.name} template has been loaded.`,
    });
  };

  const updateFormState = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Configure {agent.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="capitalize">{agent.role}</span>
              {hasChanges && (
                <>
                  <span>•</span>
                  <Badge variant="secondary" className="text-xs">Unsaved Changes</Badge>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplateLibrary(true)}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Templates
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowVersionHistory(true)}
          >
            <History className="mr-2 h-4 w-4" />
            History
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTestPanel(true)}
          >
            <TestTube className="mr-2 h-4 w-4" />
            Test
          </Button>
          <Separator orientation="vertical" className="h-8 mx-2" />
          <Button
            variant="outline"
            size="sm"
            onClick={handleDiscard}
            disabled={!hasChanges || isLoading}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Discard
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive" className="mx-6 mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside mt-1">
              {validationErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="px-6 py-2 border-b rounded-none bg-transparent justify-start gap-4">
            <TabsTrigger value="basic" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0">
              Basic Info
            </TabsTrigger>
            <TabsTrigger value="instructions" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0">
              Instructions
            </TabsTrigger>
            <TabsTrigger value="capabilities" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0">
              Capabilities
            </TabsTrigger>
            <TabsTrigger value="escalation" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0">
              Escalation
            </TabsTrigger>
            <TabsTrigger value="advanced" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0">
              Advanced
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <div className="max-w-3xl mx-auto p-6">
              <TabsContent value="basic" className="mt-0">
                <BasicInfoSection
                  name={formState.name}
                  role={formState.role}
                  description={formState.description}
                  avatarUrl={formState.avatarUrl}
                  onChange={(updates) => setFormState((prev) => ({ ...prev, ...updates }))}
                />
              </TabsContent>

              <TabsContent value="instructions" className="mt-0">
                <InstructionsSection
                  systemPrompt={formState.systemPrompt}
                  successCriteria={formState.successCriteria}
                  examples={formState.examples}
                  onChange={(updates) => setFormState((prev) => ({ ...prev, ...updates }))}
                />
              </TabsContent>

              <TabsContent value="capabilities" className="mt-0">
                <CapabilitiesSection
                  capabilities={formState.capabilities}
                  toolConfig={formState.toolConfig}
                  onChangeCapabilities={(capabilities) => updateFormState('capabilities', capabilities)}
                  onChangeToolConfig={(toolConfig) => updateFormState('toolConfig', toolConfig)}
                />
              </TabsContent>

              <TabsContent value="escalation" className="mt-0">
                <EscalationSection
                  config={formState.escalationConfig}
                  onChange={(config) => updateFormState('escalationConfig', config)}
                />
              </TabsContent>

              <TabsContent value="advanced" className="mt-0">
                <AdvancedSection
                  config={formState.advancedConfig}
                  onChange={(config) => updateFormState('advancedConfig', config)}
                />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </div>

      {/* Template Library Modal */}
      <TemplateLibrary
        open={showTemplateLibrary}
        onOpenChange={setShowTemplateLibrary}
        onSelect={applyTemplate}
      />

      {/* Version History Sheet */}
      <Sheet open={showVersionHistory} onOpenChange={setShowVersionHistory}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <VersionHistory
              versions={[]}
              currentVersionId="v3"
              onRollback={(version) => {
                toast({
                  title: 'Rollback Initiated',
                  description: `Rolling back to ${version.name}`,
                });
              }}
              onView={(version) => {
                console.log('View version:', version);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Test Panel Sheet */}
      <Sheet open={showTestPanel} onOpenChange={setShowTestPanel}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Test Agent
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 h-[calc(100%-4rem)]">
            <TestAgentPanel agentId={agent.id} agentConfig={formState as unknown as Record<string, unknown>} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
