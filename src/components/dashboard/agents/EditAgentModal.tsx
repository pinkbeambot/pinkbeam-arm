'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bot, Sparkles, Wrench, Pencil, AlertCircle, Check } from 'lucide-react';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import type { Agent, AgentRole, Capability } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EditAgentModalProps {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (agentId: string, updates: Partial<Agent>) => Promise<void>;
  loading?: boolean;
}

type Tab = 'basic' | 'instructions' | 'capabilities' | 'review';

interface FormState {
  name: string;
  role: AgentRole;
  description: string;
  instructions: string;
  capabilities: Capability[];
  model: string;
  avatarUrl: string;
}

const capabilities: { id: Capability; label: string; description: string }[] = [
  { id: 'spawn', label: 'Spawn Agents', description: 'Can create child agents' },
  { id: 'delegate', label: 'Delegate Tasks', description: 'Can assign tasks to other agents' },
  { id: 'decide', label: 'Make Decisions', description: 'Can make autonomous decisions' },
  { id: 'escalate', label: 'Escalate', description: 'Can request human input' },
  { id: 'access_external', label: 'External APIs', description: 'Can call external APIs and tools' },
  { id: 'modify_config', label: 'Modify Config', description: 'Can change agent settings' },
];

const models = [
  { value: 'claude-3-opus', label: 'Claude 3 Opus (Most capable)' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet (Balanced)' },
  { value: 'claude-3-haiku', label: 'Claude 3 Haiku (Fastest)' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
];

const roles: { value: AgentRole; label: string; description: string }[] = [
  { value: 'ceo', label: 'CEO', description: 'Top-level decision maker' },
  { value: 'manager', label: 'Manager', description: 'Can spawn and coordinate other agents' },
  { value: 'worker', label: 'Worker', description: 'Handles assigned tasks' },
  { value: 'specialist', label: 'Specialist', description: 'Domain expert for specific tasks' },
  { value: 'system', label: 'System', description: 'Infrastructure and system operations' },
];

function getInitialFormState(agent: Agent | null): FormState {
  if (!agent) {
    return {
      name: '',
      role: 'worker',
      description: '',
      instructions: '',
      capabilities: ['decide', 'escalate'],
      model: 'claude-3-sonnet',
      avatarUrl: '',
    };
  }

  return {
    name: agent.name || '',
    role: agent.role || 'worker',
    description: agent.description || '',
    instructions: (agent.configuration?.systemPrompt as string) || 
                  (agent.configuration?.system_prompt as string) || '',
    capabilities: agent.capabilities || ['decide', 'escalate'],
    model: agent.model || agent.llm_config?.model || 'claude-3-sonnet',
    avatarUrl: agent.avatar_url || '',
  };
}

export function EditAgentModal({ agent, open, onOpenChange, onSave, loading }: EditAgentModalProps) {
  const [formState, setFormState] = useState<FormState>(() => getInitialFormState(agent));
  const [originalState, setOriginalState] = useState<FormState>(() => getInitialFormState(agent));
  const [activeTab, setActiveTab] = useState<Tab>('basic');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Reset form when agent changes or modal opens
  useEffect(() => {
    if (open && agent) {
      const initial = getInitialFormState(agent);
      setFormState(initial);
      setOriginalState(initial);
      setValidationErrors([]);
      setActiveTab('basic');
    }
  }, [agent, open]);

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

    if (formState.capabilities.length === 0) {
      errors.push('At least one capability must be selected');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, [formState]);

  const handleSave = async () => {
    if (!agent) return;
    
    if (!validate()) {
      return;
    }

    const updates: Partial<Agent> = {
      name: formState.name,
      role: formState.role,
      description: formState.description,
      capabilities: formState.capabilities,
      model: formState.model,
      avatar_url: formState.avatarUrl || undefined,
      configuration: {
        ...agent.configuration,
        systemPrompt: formState.instructions,
        system_prompt: formState.instructions,
      },
      llm_config: {
        provider: formState.model.startsWith('claude') ? 'anthropic' : 'openai',
        model: formState.model,
        temperature: agent.llm_config?.temperature ?? 0.7,
        max_tokens: agent.llm_config?.max_tokens ?? 2000,
      },
    };

    await onSave(agent.id, updates);
  };

  const toggleCapability = (capability: Capability) => {
    const current = formState.capabilities || [];
    const updated = current.includes(capability)
      ? current.filter(c => c !== capability)
      : [...current, capability];
    setFormState(prev => ({ ...prev, capabilities: updated }));
  };

  const handleDiscard = () => {
    setFormState(originalState);
    setValidationErrors([]);
  };

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Pencil className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Edit Agent</DialogTitle>
              <DialogDescription>
                Update {agent.name}&apos;s configuration
                {hasChanges && (
                  <Badge variant="secondary" className="ml-2 text-xs">Unsaved Changes</Badge>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside mt-1 text-sm">
                {validationErrors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="instructions">Instructions</TabsTrigger>
            <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
            <TabsTrigger value="review">Review</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 my-4">
            <TabsContent value="basic" className="mt-0 space-y-6">
              <BasicInfoTab formState={formState} onChange={setFormState} />
            </TabsContent>

            <TabsContent value="instructions" className="mt-0 space-y-6">
              <InstructionsTab formState={formState} onChange={setFormState} />
            </TabsContent>

            <TabsContent value="capabilities" className="mt-0 space-y-6">
              <CapabilitiesTab formState={formState} onToggleCapability={toggleCapability} />
            </TabsContent>

            <TabsContent value="review" className="mt-0 space-y-6">
              <ReviewTab formState={formState} agent={agent} />
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="gap-2 border-t pt-4">
          <Button 
            variant="outline" 
            onClick={handleDiscard} 
            disabled={!hasChanges || loading}
          >
            Discard Changes
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || loading}
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BasicInfoTab({ 
  formState, 
  onChange 
}: { 
  formState: FormState; 
  onChange: (data: FormState) => void;
}) {
  return (
    <div className="space-y-6 pr-4">
      {/* Avatar Preview */}
      <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
        <Avatar className="h-16 w-16">
          <AvatarFallback className={cn('text-white text-lg', getAvatarColor(formState.name))}>
            {getInitials(formState.name || 'AI')}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-medium">{formState.name || 'Unnamed Agent'}</h3>
          <p className="text-sm text-muted-foreground capitalize">{formState.role}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Agent Name *</Label>
        <Input
          id="name"
          placeholder="e.g., Marketing Writer, Lead Qualifier"
          value={formState.name}
          onChange={(e) => onChange({ ...formState, name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role *</Label>
        <Select 
          value={formState.role} 
          onValueChange={(v) => onChange({ ...formState, role: v as AgentRole })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                <div className="flex flex-col items-start">
                  <span>{role.label}</span>
                  <span className="text-xs text-muted-foreground">{role.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          placeholder="Describe what this agent does and its responsibilities..."
          value={formState.description}
          onChange={(e) => onChange({ ...formState, description: e.target.value })}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="model">Model</Label>
        <Select 
          value={formState.model} 
          onValueChange={(v) => onChange({ ...formState, model: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function InstructionsTab({ 
  formState, 
  onChange 
}: { 
  formState: FormState; 
  onChange: (data: FormState) => void;
}) {
  return (
    <div className="space-y-6 pr-4">
      <div className="bg-muted rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">System Instructions</span>
        </div>
        <p className="text-sm text-muted-foreground">
          These instructions define how the agent behaves, its personality, and how it should respond to tasks.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">Instructions</Label>
        <Textarea
          id="instructions"
          placeholder="You are a helpful AI assistant that..."
          value={formState.instructions}
          onChange={(e) => onChange({ ...formState, instructions: e.target.value })}
          rows={12}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Supports markdown formatting. These instructions will be included in every conversation with the agent.
        </p>
      </div>
    </div>
  );
}

function CapabilitiesTab({ 
  formState, 
  onToggleCapability 
}: { 
  formState: FormState; 
  onToggleCapability: (capability: Capability) => void;
}) {
  return (
    <div className="space-y-6 pr-4">
      <div className="bg-muted rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Wrench className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Agent Capabilities</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Select what this agent is allowed to do. These permissions determine how the agent can interact with your system.
        </p>
      </div>

      <div className="space-y-3">
        {capabilities.map((cap) => (
          <div
            key={cap.id}
            className={cn(
              'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
              formState.capabilities?.includes(cap.id)
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
            onClick={() => onToggleCapability(cap.id)}
          >
            <Checkbox
              checked={formState.capabilities?.includes(cap.id)}
              onCheckedChange={() => onToggleCapability(cap.id)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{cap.label}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{cap.description}</p>
            </div>
          </div>
        ))}
      </div>

      {formState.capabilities.length === 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            At least one capability must be selected
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function ReviewTab({ 
  formState, 
  agent 
}: { 
  formState: FormState; 
  agent: Agent;
}) {
  const changedFields = [];
  
  if (formState.name !== agent.name) changedFields.push('name');
  if (formState.role !== agent.role) changedFields.push('role');
  if (formState.description !== (agent.description || '')) changedFields.push('description');
  if (formState.instructions !== ((agent.configuration?.systemPrompt as string) || '')) changedFields.push('instructions');
  if (JSON.stringify(formState.capabilities.sort()) !== JSON.stringify((agent.capabilities || []).sort())) changedFields.push('capabilities');
  if (formState.model !== (agent.model || agent.llm_config?.model)) changedFields.push('model');

  return (
    <div className="space-y-6 pr-4">
      <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
        <Avatar className="h-16 w-16">
          <AvatarFallback className={cn('text-white text-lg', getAvatarColor(formState.name))}>
            {getInitials(formState.name || 'AI')}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold text-lg">{formState.name}</h3>
          <Badge variant="secondary" className="capitalize">
            {formState.role}
          </Badge>
        </div>
      </div>

      {changedFields.length > 0 ? (
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Changes to be saved:</strong>
            </p>
            <ul className="list-disc list-inside mt-2 text-sm text-amber-800 dark:text-amber-200">
              {changedFields.map(field => (
                <li key={field} className="capitalize">{field.replace('_', ' ')}</li>
              ))}
            </ul>
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <span className="text-sm font-medium text-muted-foreground">Description</span>
              <p className="text-sm mt-1">{formState.description}</p>
            </div>

            <Separator />

            <div>
              <span className="text-sm font-medium text-muted-foreground">Model</span>
              <p className="text-sm">{models.find(m => m.value === formState.model)?.label || formState.model}</p>
            </div>

            <Separator />

            <div>
              <span className="text-sm font-medium text-muted-foreground">Capabilities</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {formState.capabilities?.map((cap) => (
                  <Badge key={cap} variant="secondary" className="capitalize">
                    {cap.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No changes made yet</p>
          <p className="text-sm text-muted-foreground">Edit fields in other tabs to see changes here</p>
        </div>
      )}
    </div>
  );
}

export default EditAgentModal;
