'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Bot, Sparkles, User, Wrench, Shield, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { SUPPORTED_MODELS } from '@/lib/constants/models';
import type { Agent, AgentRole, Capability, CreateAgentInput } from '@/types';
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

interface CreateAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: CreateAgentInput) => Promise<void>;
  loading?: boolean;
  existingAgents?: Agent[];
}

type Step = 'template' | 'basic' | 'capabilities' | 'review';

interface AgentTemplate {
  id: string;
  name: string;
  role: AgentRole;
  description: string;
  icon: React.ElementType;
  defaultCapabilities: Capability[];
  suggestedModel: string;
}

const basicInfoSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  role: z.enum(['ceo', 'manager', 'worker', 'specialist', 'system'] as const),
  description: z.string().min(1, 'Description is required'),
  model: z.string().min(1, 'Model is required'),
});

type BasicInfoFormData = z.infer<typeof basicInfoSchema>;

const templates: AgentTemplate[] = [
  {
    id: 'sdr',
    name: 'SDR Agent',
    role: 'worker',
    description: 'Qualifies leads, schedules meetings, and handles initial outreach.',
    icon: User,
    defaultCapabilities: ['decide', 'escalate', 'access_external'],
    suggestedModel: 'claude-3-sonnet',
  },
  {
    id: 'content-writer',
    name: 'Content Writer',
    role: 'specialist',
    description: 'Creates blog posts, social media content, and marketing copy.',
    icon: Sparkles,
    defaultCapabilities: ['decide', 'escalate'],
    suggestedModel: 'claude-3-sonnet',
  },
  {
    id: 'support',
    name: 'Support Agent',
    role: 'worker',
    description: 'Handles customer inquiries and resolves common issues.',
    icon: User,
    defaultCapabilities: ['decide', 'escalate', 'access_external'],
    suggestedModel: 'claude-3-haiku',
  },
  {
    id: 'manager',
    name: 'Manager Agent',
    role: 'manager',
    description: 'Coordinates other agents and handles complex delegations.',
    icon: Shield,
    defaultCapabilities: ['spawn', 'delegate', 'decide', 'escalate'],
    suggestedModel: 'claude-3-opus',
  },
  {
    id: 'blank',
    name: 'Start from Scratch',
    role: 'worker',
    description: 'Build a custom agent with your own configuration.',
    icon: Bot,
    defaultCapabilities: ['decide', 'escalate'],
    suggestedModel: 'claude-3-sonnet',
  },
];

const capabilities: { id: Capability; label: string; description: string }[] = [
  { id: 'spawn', label: 'Spawn Agents', description: 'Can create child agents' },
  { id: 'delegate', label: 'Delegate Tasks', description: 'Can assign tasks to other agents' },
  { id: 'decide', label: 'Make Decisions', description: 'Can make autonomous decisions' },
  { id: 'escalate', label: 'Escalate', description: 'Can request human input' },
  { id: 'access_external', label: 'External APIs', description: 'Can call external APIs and tools' },
  { id: 'modify_config', label: 'Modify Config', description: 'Can change agent settings' },
];

export function CreateAgentModal({ open, onOpenChange, onCreate, loading }: CreateAgentModalProps) {
  const [step, setStep] = useState<Step>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [formData, setFormData] = useState<CreateAgentInput>({
    name: '',
    role: 'worker',
    description: '',
    capabilities: ['decide', 'escalate'],
    model: 'claude-3-sonnet',
  });

  const handleTemplateSelect = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setFormData(prev => ({
      ...prev,
      role: template.role,
      capabilities: template.defaultCapabilities,
      model: template.suggestedModel,
    }));
    setStep('basic');
  };

  const handleNext = () => {
    const steps: Step[] = ['template', 'basic', 'capabilities', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: Step[] = ['template', 'basic', 'capabilities', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    await onCreate(formData);
    // Reset form
    setStep('template');
    setSelectedTemplate(null);
    setFormData({
      name: '',
      role: 'worker',
      description: '',
      capabilities: ['decide', 'escalate'],
      model: 'claude-3-sonnet',
    });
  };

  const canProceed = () => {
    switch (step) {
      case 'template':
        return selectedTemplate !== null;
      case 'basic': {
        const result = basicInfoSchema.safeParse({
          name: formData.name,
          role: formData.role,
          description: formData.description,
          model: formData.model,
        });
        return result.success;
      }
      case 'capabilities':
        return (formData.capabilities?.length || 0) > 0;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="create-agent-modal" aria-modal="true" aria-labelledby="create-agent-title" className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle id="create-agent-title">Create New Agent</DialogTitle>
          <DialogDescription>
            Set up a new AI agent to join your workforce.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2 mb-6">
          {(['template', 'basic', 'capabilities', 'review'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                step === s && 'bg-primary text-primary-foreground',
                ['template', 'basic', 'capabilities', 'review'].indexOf(step) > i && 'bg-primary/20 text-primary',
                ['template', 'basic', 'capabilities', 'review'].indexOf(step) < i && 'bg-muted text-muted-foreground'
              )}>
                {['template', 'basic', 'capabilities', 'review'].indexOf(step) > i ? (
                  <Check className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 3 && <div className={cn('w-8 h-0.5', ['template', 'basic', 'capabilities', 'review'].indexOf(step) > i ? 'bg-primary' : 'bg-muted')} />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="py-4">
          {step === 'template' && (
            <TemplateStep onSelect={handleTemplateSelect} />
          )}
          {step === 'basic' && (
            <BasicInfoStep formData={formData} onChange={setFormData} />
          )}
          {step === 'capabilities' && (
            <CapabilitiesStep formData={formData} onChange={setFormData} />
          )}
          {step === 'review' && (
            <ReviewStep formData={formData} template={selectedTemplate} />
          )}
        </div>

        <DialogFooter className="gap-2">
          {step !== 'template' && (
            <Button variant="outline" onClick={handleBack} disabled={loading}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          {step !== 'review' ? (
            <Button onClick={handleNext} disabled={!canProceed() || loading}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Create Agent'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateStep({ onSelect }: { onSelect: (template: AgentTemplate) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {templates.map((template) => {
        const Icon = template.icon;
        return (
          <button
            key={template.id}
            data-testid={`template-${template.id}`}
            onClick={() => onSelect(template)}
            className={cn(
              'flex flex-col items-start p-4 rounded-lg border-2 text-left transition-all',
              'hover:border-primary hover:bg-primary/5',
              'border-border bg-card'
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <span className="font-semibold">{template.name}</span>
            </div>
            <p className="text-sm text-muted-foreground">{template.description}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {template.defaultCapabilities.slice(0, 3).map(cap => (
                <Badge key={cap} variant="secondary" className="text-xs capitalize">
                  {cap.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function BasicInfoStep({ 
  formData, 
  onChange 
}: { 
  formData: CreateAgentInput; 
  onChange: (data: CreateAgentInput) => void;
}) {
  const {
    register,
    formState: { errors },
  } = useForm<BasicInfoFormData>({
    resolver: zodResolver(basicInfoSchema),
    mode: 'onChange',
    defaultValues: {
      name: formData.name,
      role: formData.role,
      description: formData.description,
      model: formData.model,
    },
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Agent Name</Label>
        <Input
          id="name"
          placeholder="e.g., Marketing Writer, Lead Qualifier"
          {...register('name', {
            onChange: (e) => onChange({ ...formData, name: e.target.value }),
          })}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select 
          value={formData.role} 
          onValueChange={(v) => onChange({ ...formData, role: v as AgentRole })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ceo">CEO (executive oversight)</SelectItem>
            <SelectItem value="manager">Manager (can spawn agents)</SelectItem>
            <SelectItem value="worker">Worker (handles tasks)</SelectItem>
            <SelectItem value="specialist">Specialist (domain expert)</SelectItem>
            <SelectItem value="system">System (infrastructure)</SelectItem>
          </SelectContent>
        </Select>
        {errors.role && (
          <p className="text-sm text-destructive">{errors.role.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe what this agent does and its responsibilities..."
          rows={4}
          {...register('description', {
            onChange: (e) => onChange({ ...formData, description: e.target.value }),
          })}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="model">Model</Label>
        <Select 
          value={formData.model} 
          onValueChange={(v) => onChange({ ...formData, model: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_MODELS.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.model && (
          <p className="text-sm text-destructive">{errors.model.message}</p>
        )}
      </div>
    </div>
  );
}

function CapabilitiesStep({ 
  formData, 
  onChange 
}: { 
  formData: CreateAgentInput; 
  onChange: (data: CreateAgentInput) => void;
}) {
  const toggleCapability = (capability: Capability) => {
    const current = formData.capabilities || [];
    const updated = current.includes(capability)
      ? current.filter(c => c !== capability)
      : [...current, capability];
    onChange({ ...formData, capabilities: updated });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select what this agent is allowed to do. These permissions determine how the agent can interact with your system.
      </p>
      
      <div className="grid gap-4">
        {capabilities.map((cap) => (
          <div
            key={cap.id}
            className={cn(
              'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
              formData.capabilities?.includes(cap.id)
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
            onClick={() => toggleCapability(cap.id)}
          >
            <Checkbox
              checked={formData.capabilities?.includes(cap.id)}
              onCheckedChange={() => toggleCapability(cap.id)}
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
    </div>
  );
}

function ReviewStep({ 
  formData, 
  template 
}: { 
  formData: CreateAgentInput; 
  template: AgentTemplate | null;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
        <Avatar className="h-16 w-16">
          <AvatarFallback className={cn('text-white text-lg', getAvatarColor(formData.name))}>
            {getInitials(formData.name || 'AI')}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold text-lg">{formData.name}</h3>
          <Badge variant="secondary" className="capitalize">
            {formData.role}
          </Badge>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <span className="text-sm font-medium text-muted-foreground">Template</span>
          <p className="text-sm">{template?.name || 'Custom'}</p>
        </div>

        <Separator />

        <div>
          <span className="text-sm font-medium text-muted-foreground">Description</span>
          <p className="text-sm mt-1">{formData.description}</p>
        </div>

        <Separator />

        <div>
          <span className="text-sm font-medium text-muted-foreground">Model</span>
          <p className="text-sm">{SUPPORTED_MODELS.find(m => m.value === formData.model)?.label || formData.model}</p>
        </div>

        <Separator />

        <div>
          <span className="text-sm font-medium text-muted-foreground">Capabilities</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.capabilities?.map((cap) => (
              <Badge key={cap} variant="secondary" className="capitalize">
                {cap.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>Note:</strong> The agent will be created in &quot;Paused&quot; status. 
          You can activate it after reviewing the configuration.
        </p>
      </div>
    </div>
  );
}
