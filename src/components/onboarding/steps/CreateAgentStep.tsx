'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Bot, Sparkles, User, Shield, ChevronRight, ChevronLeft, Wrench, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SUPPORTED_MODELS } from '@/lib/constants/models';
import type { AgentRole, Capability } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { OnboardingStepProps } from '../types';

interface AgentTemplate {
  id: string;
  name: string;
  role: AgentRole;
  description: string;
  icon: React.ElementType;
  defaultCapabilities: Capability[];
  suggestedModel: string;
  exampleDescription: string;
}

const TEMPLATES: AgentTemplate[] = [
  {
    id: 'support',
    name: 'Support Agent',
    role: 'worker',
    description: 'Handles customer inquiries and resolves common issues',
    icon: User,
    defaultCapabilities: ['decide', 'escalate', 'access_external'],
    suggestedModel: 'claude-3-haiku',
    exampleDescription: 'A helpful customer support agent that can answer questions, troubleshoot issues, and escalate complex problems to human staff.',
  },
  {
    id: 'writer',
    name: 'Content Writer',
    role: 'specialist',
    description: 'Creates blog posts, social media, and marketing copy',
    icon: Sparkles,
    defaultCapabilities: ['decide', 'escalate'],
    suggestedModel: 'claude-3-sonnet',
    exampleDescription: 'A creative content writer specializing in blog posts, social media content, and marketing materials.',
  },
  {
    id: 'manager',
    name: 'Team Manager',
    role: 'manager',
    description: 'Coordinates other agents and handles complex delegations',
    icon: Shield,
    defaultCapabilities: ['spawn', 'delegate', 'decide', 'escalate'],
    suggestedModel: 'claude-3-opus',
    exampleDescription: 'A manager agent that can spawn child agents, delegate tasks, and coordinate complex workflows.',
  },
  {
    id: 'custom',
    name: 'Custom Agent',
    role: 'worker',
    description: 'Build a custom agent from scratch',
    icon: Bot,
    defaultCapabilities: ['decide', 'escalate'],
    suggestedModel: 'claude-3-sonnet',
    exampleDescription: '',
  },
];

const CAPABILITIES: { id: Capability; label: string; description: string }[] = [
  { id: 'spawn', label: 'Spawn Agents', description: 'Can create child agents' },
  { id: 'delegate', label: 'Delegate Tasks', description: 'Can assign tasks to other agents' },
  { id: 'decide', label: 'Make Decisions', description: 'Can make autonomous decisions' },
  { id: 'escalate', label: 'Escalate', description: 'Can request human input' },
  { id: 'access_external', label: 'External APIs', description: 'Can call external APIs and tools' },
  { id: 'modify_config', label: 'Modify Config', description: 'Can change agent settings' },
];

type SubStep = 'template' | 'details' | 'capabilities';

export function CreateAgentStep({ onNext, onBack, data, onUpdateData }: OnboardingStepProps) {
  const [subStep, setSubStep] = React.useState<SubStep>('template');
  const [selectedTemplate, setSelectedTemplate] = React.useState<AgentTemplate | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleTemplateSelect = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    onUpdateData({
      agentRole: template.role,
      agentCapabilities: template.defaultCapabilities,
      agentModel: template.suggestedModel,
      agentDescription: template.exampleDescription || data.agentDescription,
    });
    setSubStep('details');
  };

  const validateDetails = () => {
    const newErrors: Record<string, string> = {};
    if (!data.agentName.trim()) {
      newErrors.name = 'Name is required';
    } else if (data.agentName.length > 100) {
      newErrors.name = 'Name must be 100 characters or less';
    }
    if (!data.agentDescription.trim()) {
      newErrors.description = 'Description is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDetailsNext = () => {
    if (validateDetails()) {
      setSubStep('capabilities');
    }
  };

  const toggleCapability = (capability: Capability) => {
    const current = data.agentCapabilities;
    const updated = current.includes(capability)
      ? current.filter(c => c !== capability)
      : [...current, capability];
    onUpdateData({ agentCapabilities: updated });
  };

  const canProceed = data.agentCapabilities.length > 0;

  return (
    <div className="space-y-6">
      {/* Sub-step Progress */}
      <div className="flex items-center justify-center gap-2">
        {(['template', 'details', 'capabilities'] as SubStep[]).map((step, index) => (
          <React.Fragment key={step}>
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
              subStep === step && 'bg-primary text-primary-foreground',
              (['template', 'details', 'capabilities'] as SubStep[]).indexOf(subStep) > index && 'bg-primary/20 text-primary'
            )}>
              {(['template', 'details', 'capabilities'] as SubStep[]).indexOf(subStep) > index ? (
                <Check className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>
            {index < 2 && (
              <div className={cn(
                'w-8 h-0.5',
                (['template', 'details', 'capabilities'] as SubStep[]).indexOf(subStep) > index ? 'bg-primary' : 'bg-muted'
              )} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {subStep === 'template' && (
          <TemplateSubStep
            key="template"
            onSelect={handleTemplateSelect}
          />
        )}
        {subStep === 'details' && (
          <DetailsSubStep
            key="details"
            data={data}
            onUpdateData={onUpdateData}
            errors={errors}
            selectedTemplate={selectedTemplate}
            onBack={() => setSubStep('template')}
            onNext={handleDetailsNext}
          />
        )}
        {subStep === 'capabilities' && (
          <CapabilitiesSubStep
            key="capabilities"
            data={data}
            onToggleCapability={toggleCapability}
            onBack={() => setSubStep('details')}
            onNext={onNext}
            canProceed={canProceed}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

import { AnimatePresence } from 'framer-motion';

function TemplateSubStep({ onSelect }: { onSelect: (template: AgentTemplate) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="text-center space-y-2">
        <div className="w-12 h-12 mx-auto bg-primary/10 rounded-xl flex items-center justify-center">
          <Bot className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Choose a Template</h2>
        <p className="text-sm text-muted-foreground">Select a starting point for your first agent</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className={cn(
                'flex flex-col items-start p-4 rounded-lg border-2 text-left transition-all',
                'hover:border-primary hover:bg-primary/5',
                'border-border bg-card'
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold text-sm">{template.name}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

function DetailsSubStep({
  data,
  onUpdateData,
  errors,
  selectedTemplate,
  onBack,
  onNext,
}: {
  data: OnboardingStepProps['data'];
  onUpdateData: OnboardingStepProps['onUpdateData'];
  errors: Record<string, string>;
  selectedTemplate: AgentTemplate | null;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="text-center space-y-2">
        <div className="w-12 h-12 mx-auto bg-primary/10 rounded-xl flex items-center justify-center">
          <Bot className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Agent Details</h2>
        <p className="text-sm text-muted-foreground">
          {selectedTemplate?.name ? `Based on ${selectedTemplate.name} template` : 'Customize your agent'}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="agent-name">Agent Name</Label>
          <Input
            id="agent-name"
            placeholder="e.g., Marketing Writer, Lead Qualifier"
            value={data.agentName}
            onChange={(e) => onUpdateData({ agentName: e.target.value })}
            className={cn(errors.name && 'border-destructive')}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="agent-role">Role</Label>
          <Select
            value={data.agentRole}
            onValueChange={(v) => onUpdateData({ agentRole: v as AgentRole })}
          >
            <SelectTrigger id="agent-role">
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="agent-description">Description</Label>
          <Textarea
            id="agent-description"
            placeholder="Describe what this agent does and its responsibilities..."
            rows={3}
            value={data.agentDescription}
            onChange={(e) => onUpdateData({ agentDescription: e.target.value })}
            className={cn(errors.description && 'border-destructive')}
          />
          {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="agent-model">Model</Label>
          <Select
            value={data.agentModel}
            onValueChange={(v) => onUpdateData({ agentModel: v })}
          >
            <SelectTrigger id="agent-model">
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
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} className="flex-1">
          Next
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

function CapabilitiesSubStep({
  data,
  onToggleCapability,
  onBack,
  onNext,
  canProceed,
}: {
  data: OnboardingStepProps['data'];
  onToggleCapability: (cap: Capability) => void;
  onBack: () => void;
  onNext: () => void;
  canProceed: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="text-center space-y-2">
        <div className="w-12 h-12 mx-auto bg-primary/10 rounded-xl flex items-center justify-center">
          <Wrench className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Capabilities</h2>
        <p className="text-sm text-muted-foreground">What can this agent do?</p>
      </div>

      <div className="space-y-2">
        {CAPABILITIES.map((cap) => (
          <div
            key={cap.id}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
              data.agentCapabilities.includes(cap.id)
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
            onClick={() => onToggleCapability(cap.id)}
          >
            <Checkbox
              checked={data.agentCapabilities.includes(cap.id)}
              onCheckedChange={() => onToggleCapability(cap.id)}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{cap.label}</span>
                {['decide', 'escalate'].includes(cap.id) && (
                  <Badge variant="secondary" className="text-[10px]">Recommended</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{cap.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed} className="flex-1">
          Continue
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
