/**
 * Form Components Usage Examples
 * 
 * These examples demonstrate how to use the form components
 * in real-world scenarios based on existing patterns in the codebase.
 */

// ============================================
// Example 1: Simple Form (Create Task)
// ============================================

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  FormField, 
  FormSection,
  FormDivider,
  FormActions,
  FormValidationSummary,
  RequiredFieldLegend 
} from '@/components/forms';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CheckSquare } from 'lucide-react';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
});

type TaskFormData = z.infer<typeof taskSchema>;

function CreateTaskFormExample() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    mode: 'onBlur',
    defaultValues: {
      priority: 'normal',
    },
  });

  const onSubmit = async (data: TaskFormData) => {
    console.log('Submitting:', data);
    // API call here
  };

  // Convert errors object to array for summary
  const errorMessages = Object.entries(errors).map(([field, error]) => 
    error?.message || `${field} is invalid`
  );

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to your workflow.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Validation Summary */}
          <FormValidationSummary errors={errorMessages} />

          {/* Required Legend */}
          <RequiredFieldLegend />

          {/* Form Section */}
          <FormSection title="Task Details" icon={CheckSquare}>
            <FormField
              name="title"
              label="Title"
              required
              error={errors.title?.message}
            >
              <Input placeholder="Enter task title..." {...register('title')} />
            </FormField>

            <FormField
              name="description"
              label="Description"
              required
              helper="Describe what needs to be done"
              error={errors.description?.message}
            >
              <Textarea 
                rows={4} 
                placeholder="Describe the task..." 
                {...register('description')} 
              />
            </FormField>

            <FormField
              name="priority"
              label="Priority"
              required
              error={errors.priority?.message}
            >
              <Select {...register('priority')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </FormSection>

          {/* Actions */}
          <FormActions
            variant="modal"
            onCancel={() => {}}
            onSubmit={handleSubmit(onSubmit)}
            isSubmitting={isSubmitting}
            submitLabel="Create Task"
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Example 2: Multi-Section Form (Edit Agent)
// ============================================

import { User, Settings, Wrench } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const capabilities = [
  { id: 'spawn', label: 'Spawn Agents', description: 'Can create child agents' },
  { id: 'delegate', label: 'Delegate Tasks', description: 'Can assign tasks to other agents' },
  { id: 'decide', label: 'Make Decisions', description: 'Can make autonomous decisions' },
  { id: 'escalate', label: 'Escalate', description: 'Can request human input' },
];

function EditAgentFormExample() {
  const [selectedCapabilities, setSelectedCapabilities] = React.useState<string[]>([]);
  
  const toggleCapability = (id: string) => {
    setSelectedCapabilities(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  return (
    <form className="space-y-8">
      {/* Basic Info Section */}
      <FormSection 
        title="Basic Information" 
        description="Configure the core agent settings"
        icon={User}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField name="firstName" label="First Name" required>
            <Input />
          </FormField>
          <FormField name="lastName" label="Last Name" required>
            <Input />
          </FormField>
        </div>

        <FormField name="email" label="Email Address" required>
          <Input type="email" />
        </FormField>
      </FormSection>

      {/* Divider */}
      <FormDivider />

      {/* Configuration Section */}
      <FormSection 
        title="Configuration" 
        description="Advanced agent settings"
        icon={Settings}
      >
        <FormField 
          name="model" 
          label="Model"
          helper="Select the AI model for this agent"
        >
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4">GPT-4</SelectItem>
              <SelectItem value="claude">Claude</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </FormSection>

      {/* Divider with Label */}
      <FormDivider label="Permissions" />

      {/* Capabilities Section */}
      <FormSection 
        title="Capabilities" 
        description="Select what this agent can do"
        icon={Wrench}
      >
        <div className="space-y-3">
          {capabilities.map((cap) => (
            <div
              key={cap.id}
              className="flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all border-border hover:border-primary/50"
              onClick={() => toggleCapability(cap.id)}
            >
              <Checkbox
                checked={selectedCapabilities.includes(cap.id)}
                onCheckedChange={() => toggleCapability(cap.id)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <span className="font-medium">{cap.label}</span>
                <p className="text-sm text-muted-foreground">{cap.description}</p>
              </div>
            </div>
          ))}
        </div>
      </FormSection>

      {/* Actions */}
      <FormActions
        variant="modal"
        onCancel={() => {}}
        onDiscard={() => {}}
        onSubmit={() => {}}
        hasChanges={true}
      />
    </form>
  );
}

// ============================================
// Example 3: Async Validation
// ============================================

import { useState, useCallback, useEffect } from 'react';

function AsyncValidationExample() {
  const [username, setUsername] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string>();

  // Simulate API check
  const checkUsername = useCallback(async (value: string) => {
    if (!value) {
      setIsValid(false);
      setError(undefined);
      return;
    }

    setIsValidating(true);
    setError(undefined);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (value === 'taken') {
      setError('Username is already taken');
      setIsValid(false);
    } else {
      setIsValid(true);
    }
    
    setIsValidating(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkUsername(username);
    }, 300);
    return () => clearTimeout(timer);
  }, [username, checkUsername]);

  return (
    <FormField
      name="username"
      label="Username"
      required
      helper="Letters, numbers, and underscores only"
      error={error}
      isValidating={isValidating}
      isValid={isValid}
      successMessage="Username available"
    >
      <Input 
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter username"
      />
    </FormField>
  );
}

// ============================================
// Example 4: Full Page Form
// ============================================

function FullPageFormExample() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-2">Create New Agent</h1>
      <p className="text-muted-foreground mb-6">
        Set up a new AI agent to join your workforce.
      </p>

      <form className="space-y-8">
        <RequiredFieldLegend className="mb-6" />

        <FormSection title="Basic Information" icon={User}>
          <FormField name="name" label="Agent Name" required>
            <Input placeholder="e.g., Marketing Writer" />
          </FormField>

          <FormField name="description" label="Description" required>
            <Textarea rows={4} />
          </FormField>
        </FormSection>

        <FormActions
          variant="page"  // Primary button on left
          onCancel={() => {}}
          onSubmit={() => {}}
          submitLabel="Create Agent"
        />
      </form>
    </div>
  );
}

// ============================================
// Export examples for documentation
// ============================================

export const FormExamples = {
  CreateTaskFormExample,
  EditAgentFormExample,
  AsyncValidationExample,
  FullPageFormExample,
};

// Re-import React for the examples
import React from 'react';
