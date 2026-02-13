'use client';

import { useState } from 'react';
import { Bot, Upload } from 'lucide-react';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import type { AgentRole } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface BasicInfoSectionProps {
  name: string;
  role: AgentRole;
  description: string;
  avatarUrl?: string;
  onChange: (updates: Partial<{ name: string; role: AgentRole; description: string; avatarUrl: string }>) => void;
}

const roleOptions: { value: AgentRole; label: string; description: string }[] = [
  { value: 'ceo', label: 'CEO', description: 'Root agent with full control' },
  { value: 'manager', label: 'Manager', description: 'Can spawn and delegate to other agents' },
  { value: 'worker', label: 'Worker', description: 'Handles tasks and makes decisions' },
  { value: 'specialist', label: 'Specialist', description: 'Domain expert for specific tasks' },
  { value: 'system', label: 'System', description: 'Infrastructure and maintenance' },
];

const avatarOptions = [
  '/avatars/agent-1.png',
  '/avatars/agent-2.png',
  '/avatars/agent-3.png',
  '/avatars/agent-4.png',
  '/avatars/agent-5.png',
  '/avatars/agent-6.png',
];

export function BasicInfoSection({
  name,
  role,
  description,
  avatarUrl,
  onChange,
}: BasicInfoSectionProps) {
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  return (
    <div className="space-y-6">
      {/* Avatar Selection */}
      <div className="space-y-3">
        <Label>Avatar</Label>
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className={cn('text-white text-2xl', getAvatarColor(name))}>
              {getInitials(name || 'AI')}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Choose Avatar
            </Button>
            <p className="text-xs text-muted-foreground">
              Select an avatar or upload your own
            </p>
          </div>
        </div>

        {showAvatarPicker && (
          <div className="grid grid-cols-6 gap-2 p-4 bg-muted rounded-lg">
            {avatarOptions.map((url, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  onChange({ avatarUrl: url });
                  setShowAvatarPicker(false);
                }}
                className={cn(
                  'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                  avatarUrl === url ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-primary/50'
                )}
              >
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Name Input */}
      <div className="space-y-2">
        <Label htmlFor="agent-name">
          Agent Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="agent-name"
          value={name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g., Marketing Writer, Lead Qualifier"
        />
        <p className="text-xs text-muted-foreground">
          Give your agent a clear, descriptive name
        </p>
      </div>

      {/* Role Selection */}
      <div className="space-y-2">
        <Label htmlFor="agent-role">Role</Label>
        <Select
          value={role}
          onValueChange={(v) => onChange({ role: v as AgentRole })}
        >
          <SelectTrigger id="agent-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex flex-col items-start">
                  <span>{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="agent-description">Role Description</Label>
        <Textarea
          id="agent-description"
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Describe what this agent does and its main responsibilities..."
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          A brief description of the agent&apos;s purpose and responsibilities
        </p>
      </div>
    </div>
  );
}
