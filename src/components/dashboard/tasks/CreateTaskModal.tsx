'use client';

import { useState, useCallback } from 'react';
import { 
  Plus, 
  Loader2, 
  User
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import type { Task, TaskStatus, TaskPriority, Agent } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: Agent[];
  onCreate: (taskData: Partial<Task>) => Promise<void>;
  loading?: boolean;
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string; description: string }[] = [
  { 
    value: 'urgent', 
    label: 'Urgent', 
    color: 'bg-red-500',
    description: 'Critical tasks requiring immediate attention'
  },
  { 
    value: 'high', 
    label: 'High', 
    color: 'bg-orange-500',
    description: 'Important tasks with tight deadlines'
  },
  { 
    value: 'normal', 
    label: 'Normal', 
    color: 'bg-blue-500',
    description: 'Standard priority tasks'
  },
  { 
    value: 'low', 
    label: 'Low', 
    color: 'bg-gray-500',
    description: 'Tasks that can be deferred'
  },
];

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'queued', label: 'Backlog', color: 'bg-gray-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
];

interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  acceptance_criteria: string[];
  icon: string;
}

const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'research',
    title: 'Research: {topic}',
    description: 'Conduct comprehensive research on the specified topic. Gather key insights, statistics, and relevant sources.',
    priority: 'normal',
    acceptance_criteria: [
      'Research document with at least 5 key findings',
      'List of 10+ credible sources',
      'Executive summary (200 words)'
    ],
    icon: '🔍',
  },
  {
    id: 'content',
    title: 'Create: {content_type}',
    description: 'Create high-quality content following brand guidelines and SEO best practices.',
    priority: 'normal',
    acceptance_criteria: [
      'Draft content meeting quality standards',
      'Optimized for target keywords',
      'Proofread and edited'
    ],
    icon: '✍️',
  },
  {
    id: 'review',
    title: 'Review: {item}',
    description: 'Review and provide feedback on the specified work item.',
    priority: 'high',
    acceptance_criteria: [
      'Detailed feedback document',
      'Specific improvement suggestions',
      'Approval or revision request'
    ],
    icon: '👀',
  },
  {
    id: 'analysis',
    title: 'Analyze: {data}',
    description: 'Analyze data and generate actionable insights and recommendations.',
    priority: 'normal',
    acceptance_criteria: [
      'Clean, processed dataset',
      'Visualizations and charts',
      'Key insights summary'
    ],
    icon: '📊',
  },
  {
    id: 'custom',
    title: 'Custom Task',
    description: 'Create a custom task with your own specifications.',
    priority: 'normal',
    acceptance_criteria: [],
    icon: '⚙️',
  },
];

export function CreateTaskModal({
  isOpen,
  onClose,
  agents,
  onCreate,
  loading,
}: CreateTaskModalProps) {
  const [activeTab, setActiveTab] = useState('template');
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [taskData, setTaskData] = useState<Partial<Task>>({
    title: '',
    description: '',
    priority: 'normal',
    status: 'queued',
    assigned_agent_id: undefined,
    due_date: undefined,
    acceptance_criteria: [],
  });

  const resetForm = useCallback(() => {
    setTaskData({
      title: '',
      description: '',
      priority: 'normal',
      status: 'queued',
      assigned_agent_id: undefined,
      due_date: undefined,
      acceptance_criteria: [],
    });
    setSelectedTemplate(null);
    setActiveTab('template');
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSelectTemplate = useCallback((template: TaskTemplate) => {
    setSelectedTemplate(template);
    setTaskData(prev => ({
      ...prev,
      title: template.title,
      description: template.description,
      priority: template.priority,
      acceptance_criteria: template.acceptance_criteria,
    }));
    setActiveTab('details');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taskData.title?.trim()) return;
    
    setCreating(true);
    try {
      await onCreate({
        ...taskData,
        title: taskData.title.trim(),
        description: taskData.description?.trim(),
      });
      handleClose();
    } finally {
      setCreating(false);
    }
  };

  const isSubmitDisabled = !taskData.title?.trim() || creating;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Create a task and assign it to an AI agent
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="template">Choose Template</TabsTrigger>
              <TabsTrigger value="details" disabled={!selectedTemplate}>
                Task Details
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="max-h-[calc(90vh-200px)]">
            <TabsContent value="template" className="p-6 m-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {TASK_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={cn(
                      'flex flex-col items-start p-4 rounded-lg border text-left transition-all',
                      'hover:border-primary hover:bg-primary/5',
                      selectedTemplate?.id === template.id && 'border-primary bg-primary/5'
                    )}
                  >
                    <div className="text-2xl mb-2">{template.icon}</div>
                    <h4 className="font-medium text-sm mb-1">{template.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="secondary" className="text-[10px]">
                        {PRIORITY_OPTIONS.find(p => p.value === template.priority)?.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {template.acceptance_criteria.length} criteria
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTemplate(TASK_TEMPLATES.find(t => t.id === 'custom') || null);
                    setActiveTab('details');
                  }}
                >
                  Skip Template
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="details" className="p-6 m-0">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Task Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={taskData.title}
                    onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
                    placeholder="Enter task title"
                    className="w-full"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={taskData.description || ''}
                    onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
                    placeholder="Describe what needs to be done..."
                    rows={3}
                  />
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Priority */}
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={taskData.priority}
                      onValueChange={(value: TaskPriority) => setTaskData({ ...taskData, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <div className={cn('w-2 h-2 rounded-full', option.color)} />
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <Label>Initial Status</Label>
                    <Select
                      value={taskData.status}
                      onValueChange={(value: TaskStatus) => setTaskData({ ...taskData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <div className={cn('w-2 h-2 rounded-full', option.color)} />
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Assignee */}
                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <Select
                    value={taskData.assigned_agent_id || 'unassigned'}
                    onValueChange={(value) => setTaskData({ ...taskData, assigned_agent_id: value === 'unassigned' ? undefined : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-3 w-3 text-muted-foreground" />
                          </div>
                          Unassigned
                        </div>
                      </SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={agent.avatar_url || undefined} />
                              <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">
                                {getInitials(agent.name)}
                              </AvatarFallback>
                            </Avatar>
                            {agent.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={taskData.due_date ? taskData.due_date.split('T')[0] : ''}
                    onChange={(e) => setTaskData({ 
                      ...taskData, 
                      due_date: e.target.value ? new Date(e.target.value).toISOString() : undefined 
                    })}
                  />
                </div>

                {/* Acceptance Criteria */}
                <div className="space-y-2">
                  <Label htmlFor="criteria">Acceptance Criteria</Label>
                  <Textarea
                    id="criteria"
                    value={taskData.acceptance_criteria?.join('\n') || ''}
                    onChange={(e) => setTaskData({ 
                      ...taskData, 
                      acceptance_criteria: e.target.value.split('\n').filter(Boolean) 
                    })}
                    placeholder="Enter criteria (one per line)..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter each criterion on a new line
                  </p>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('template')}
                  >
                    Back to Templates
                  </Button>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitDisabled}
                    >
                      {creating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Task
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
