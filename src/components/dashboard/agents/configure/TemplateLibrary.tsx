'use client';

import { useState } from 'react';
import { Search, Sparkles, User, Wrench, Shield, MessageSquare, BarChart3, FileText, Mail, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentRole, Capability } from '@/types';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TemplateLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: AgentTemplate) => void;
}

export interface AgentTemplate {
  id: string;
  name: string;
  role: AgentRole;
  description: string;
  icon: React.ElementType;
  category: string;
  defaultCapabilities: Capability[];
  suggestedModel: string;
  systemPrompt: string;
  successCriteria: string;
  tags: string[];
}

const categories = ['All', 'Sales', 'Marketing', 'Support', 'Operations', 'Content', 'Analysis'];

const templates: AgentTemplate[] = [
  {
    id: 'sdr',
    name: 'SDR Agent',
    role: 'worker',
    description: 'Qualifies leads, schedules meetings, and handles initial outreach.',
    icon: User,
    category: 'Sales',
    defaultCapabilities: ['decide', 'escalate', 'access_external'],
    suggestedModel: 'claude-3-sonnet',
    systemPrompt: 'You are a Sales Development Representative (SDR) agent. Your role is to qualify leads, schedule meetings, and handle initial outreach. Be professional, persistent but respectful, and always provide value in your communications. Research prospects thoroughly before reaching out and personalize your messages.',
    successCriteria: 'Lead response rate >20%, Meetings booked >5/week, Qualified opportunities created',
    tags: ['sales', 'outreach', 'leads'],
  },
  {
    id: 'content-writer',
    name: 'Content Writer',
    role: 'specialist',
    description: 'Creates blog posts, social media content, and marketing copy.',
    icon: FileText,
    category: 'Content',
    defaultCapabilities: ['decide', 'escalate'],
    suggestedModel: 'claude-3-sonnet',
    systemPrompt: 'You are a Content Writer specializing in engaging, SEO-optimized content. You write blog posts, social media content, and marketing copy. Always research topics thoroughly, use a consistent brand voice, and optimize for readability and engagement.',
    successCriteria: 'Content published on schedule, Engagement metrics meet targets, SEO rankings improved',
    tags: ['content', 'writing', 'marketing'],
  },
  {
    id: 'support-agent',
    name: 'Support Agent',
    role: 'worker',
    description: 'Handles customer inquiries and resolves common issues.',
    icon: MessageSquare,
    category: 'Support',
    defaultCapabilities: ['decide', 'escalate', 'access_external'],
    suggestedModel: 'claude-3-haiku',
    systemPrompt: 'You are a Customer Support Agent. Your goal is to resolve customer issues quickly and empathetically. Always acknowledge the customer\'s frustration, provide clear solutions, and follow up to ensure satisfaction. Escalate complex issues appropriately.',
    successCriteria: 'First response time <1 hour, Resolution rate >80%, CSAT score >4.5',
    tags: ['support', 'customer service', 'help desk'],
  },
  {
    id: 'manager',
    name: 'Manager Agent',
    role: 'manager',
    description: 'Coordinates other agents and handles complex delegations.',
    icon: Shield,
    category: 'Operations',
    defaultCapabilities: ['spawn', 'delegate', 'decide', 'escalate'],
    suggestedModel: 'claude-3-opus',
    systemPrompt: 'You are a Manager Agent responsible for coordinating other agents and handling complex task delegation. You break down large projects into subtasks, assign them to appropriate agents, monitor progress, and ensure quality. You have the authority to spawn child agents when needed.',
    successCriteria: 'Projects completed on time, Sub-agent coordination effective, Quality standards met',
    tags: ['management', 'coordination', 'planning'],
  },
  {
    id: 'analyst',
    name: 'Data Analyst',
    role: 'specialist',
    description: 'Analyzes data, creates reports, and provides insights.',
    icon: BarChart3,
    category: 'Analysis',
    defaultCapabilities: ['decide', 'escalate', 'access_external'],
    suggestedModel: 'claude-3-sonnet',
    systemPrompt: 'You are a Data Analyst agent. You analyze business data, create reports, and provide actionable insights. Always verify your calculations, cite data sources, and present findings clearly with visualizations when appropriate.',
    successCriteria: 'Reports delivered accurately, Insights drive business decisions, Data quality maintained',
    tags: ['analytics', 'reports', 'data'],
  },
  {
    id: 'email-specialist',
    name: 'Email Specialist',
    role: 'worker',
    description: 'Manages email inbox, drafts responses, and organizes messages.',
    icon: Mail,
    category: 'Operations',
    defaultCapabilities: ['decide', 'escalate', 'access_external'],
    suggestedModel: 'claude-3-haiku',
    systemPrompt: 'You are an Email Management Specialist. You organize inboxes, draft professional responses, and prioritize messages by importance. Maintain a professional tone, respond promptly to urgent emails, and keep the inbox organized with labels and folders.',
    successCriteria: 'Inbox zero maintained, Response time <4 hours, No important emails missed',
    tags: ['email', 'inbox', 'communication'],
  },
  {
    id: 'social-media',
    name: 'Social Media Manager',
    role: 'specialist',
    description: 'Manages social media accounts and engagement.',
    icon: Sparkles,
    category: 'Marketing',
    defaultCapabilities: ['decide', 'escalate', 'access_external'],
    suggestedModel: 'claude-3-sonnet',
    systemPrompt: 'You are a Social Media Manager. You create engaging posts, respond to comments, monitor brand mentions, and analyze social metrics. Stay on brand voice, engage authentically with followers, and be responsive to trending topics.',
    successCriteria: 'Posting schedule maintained, Engagement rate increased, Brand sentiment positive',
    tags: ['social media', 'marketing', 'engagement'],
  },
  {
    id: 'dev-helper',
    name: 'Dev Helper',
    role: 'specialist',
    description: 'Assists with code reviews, documentation, and debugging.',
    icon: Wrench,
    category: 'Operations',
    defaultCapabilities: ['decide', 'escalate'],
    suggestedModel: 'claude-3-opus',
    systemPrompt: 'You are a Development Helper agent. You assist with code reviews, write documentation, help debug issues, and explain technical concepts. Always follow best practices, write clean code, and provide clear explanations.',
    successCriteria: 'Code quality improved, Documentation complete, Bugs identified and resolved',
    tags: ['development', 'code', 'technical'],
  },
];

export function TemplateLibrary({
  open,
  onOpenChange,
  onSelect,
}: TemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [previewTemplate, setPreviewTemplate] = useState<AgentTemplate | null>(null);

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelect = (template: AgentTemplate) => {
    onSelect(template);
    onOpenChange(false);
    setPreviewTemplate(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Agent Template Library
          </DialogTitle>
          <DialogDescription>
            Choose a pre-configured template to quickly set up your agent
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-6 px-6 pb-6 h-[600px]">
          {/* Sidebar */}
          <div className="w-64 flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2">
                Categories
              </p>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md text-sm transition-all',
                    selectedCategory === category
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {category}
                  {category !== 'All' && (
                    <span className="ml-2 text-xs opacity-60">
                      ({templates.filter(t => t.category === category).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Template Grid */}
          <ScrollArea className="flex-1 -mr-6 pr-6">
            <div className="grid grid-cols-2 gap-4 pb-4">
              {filteredTemplates.map((template) => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.id}
                    onClick={() => setPreviewTemplate(template)}
                    className={cn(
                      'flex flex-col items-start p-4 rounded-lg border text-left transition-all',
                      previewTemplate?.id === template.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    )}
                  >
                    <div className="flex items-center gap-3 mb-3 w-full">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold block truncate">{template.name}</span>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {template.role}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {template.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-auto">
                      {template.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs capitalize">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Preview Panel */}
          {previewTemplate && (
            <div className="w-80 border-l pl-6 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  {(() => {
                    const Icon = previewTemplate.icon;
                    return <Icon className="h-5 w-5 text-primary" />;
                  })()}
                </div>
                <div>
                  <h3 className="font-semibold">{previewTemplate.name}</h3>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {previewTemplate.role}
                  </Badge>
                </div>
              </div>

              <ScrollArea className="flex-1 -mr-2 pr-2">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Description
                    </p>
                    <p className="text-sm">{previewTemplate.description}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      System Prompt Preview
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-4">
                      {previewTemplate.systemPrompt}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Capabilities
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {previewTemplate.defaultCapabilities.map((cap) => (
                        <Badge key={cap} variant="secondary" className="text-xs capitalize">
                          {cap.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Suggested Model
                    </p>
                    <p className="text-sm">{previewTemplate.suggestedModel}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Success Criteria
                    </p>
                    <p className="text-sm text-muted-foreground">{previewTemplate.successCriteria}</p>
                  </div>
                </div>
              </ScrollArea>

              <div className="pt-4 border-t mt-4">
                <Button onClick={() => handleSelect(previewTemplate)} className="w-full">
                  <Check className="mr-2 h-4 w-4" />
                  Use This Template
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
