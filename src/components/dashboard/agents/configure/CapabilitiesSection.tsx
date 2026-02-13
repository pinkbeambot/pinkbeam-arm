'use client';

import { 
  Wrench, 
  Mail, 
  Search, 
  MessageCircle, 
  Calendar, 
  Globe, 
  Database, 
  FileText,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Capability } from '@/types';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CapabilitiesSectionProps {
  capabilities: Capability[];
  toolConfig: Record<string, boolean>;
  onChangeCapabilities: (capabilities: Capability[]) => void;
  onChangeToolConfig: (config: Record<string, boolean>) => void;
}

interface ToolOption {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  requiresConfig?: boolean;
  warning?: string;
}

const coreCapabilities: { id: Capability; label: string; description: string }[] = [
  { 
    id: 'decide', 
    label: 'Make Decisions', 
    description: 'Can make autonomous decisions within defined boundaries' 
  },
  { 
    id: 'escalate', 
    label: 'Escalate to Human', 
    description: 'Can request human input when needed' 
  },
  { 
    id: 'delegate', 
    label: 'Delegate Tasks', 
    description: 'Can assign tasks to other agents' 
  },
  { 
    id: 'spawn', 
    label: 'Spawn Child Agents', 
    description: 'Can create sub-agents for complex tasks' 
  },
  { 
    id: 'access_external', 
    label: 'Access External APIs', 
    description: 'Can call external services and APIs' 
  },
  { 
    id: 'modify_config', 
    label: 'Modify Configuration', 
    description: 'Can change its own settings and parameters' 
  },
];

const toolOptions: ToolOption[] = [
  { 
    id: 'email', 
    name: 'Email', 
    description: 'Read and send emails', 
    icon: Mail,
    requiresConfig: true,
  },
  { 
    id: 'web_search', 
    name: 'Web Search', 
    description: 'Search the internet for information', 
    icon: Search 
  },
  { 
    id: 'slack', 
    name: 'Slack', 
    description: 'Send messages to Slack channels', 
    icon: MessageCircle,
    requiresConfig: true,
  },
  { 
    id: 'calendar', 
    name: 'Calendar', 
    description: 'Read and manage calendar events', 
    icon: Calendar,
    requiresConfig: true,
  },
  { 
    id: 'web_browser', 
    name: 'Web Browser', 
    description: 'Browse websites and extract information', 
    icon: Globe 
  },
  { 
    id: 'database', 
    name: 'Database', 
    description: 'Query and update database records', 
    icon: Database,
    requiresConfig: true,
    warning: 'Grant database access carefully',
  },
  { 
    id: 'file_system', 
    name: 'File System', 
    description: 'Read and write files', 
    icon: FileText 
  },
];

export function CapabilitiesSection({
  capabilities,
  toolConfig,
  onChangeCapabilities,
  onChangeToolConfig,
}: CapabilitiesSectionProps) {
  const toggleCapability = (capability: Capability) => {
    const updated = capabilities.includes(capability)
      ? capabilities.filter((c) => c !== capability)
      : [...capabilities, capability];
    onChangeCapabilities(updated);
  };

  const toggleTool = (toolId: string) => {
    onChangeToolConfig({
      ...toolConfig,
      [toolId]: !toolConfig[toolId],
    });
  };

  const hasHighRiskPermissions = capabilities.includes('modify_config') || 
    capabilities.includes('spawn') ||
    toolConfig['database'];

  return (
    <div className="space-y-8">
      {/* Warning for high-risk permissions */}
      {hasHighRiskPermissions && (
        <Alert variant="warning" className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            This agent has high-level permissions. Review carefully before activating.
          </AlertDescription>
        </Alert>
      )}

      {/* Core Capabilities */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Core Capabilities</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Define what this agent is allowed to do within the ARM system.
        </p>

        <div className="grid gap-3">
          {coreCapabilities.map((cap) => (
            <div
              key={cap.id}
              className={cn(
                'flex items-start justify-between p-4 rounded-lg border transition-all',
                capabilities.includes(cap.id)
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{cap.label}</span>
                  {(cap.id === 'modify_config' || cap.id === 'spawn') && (
                    <Badge variant="secondary" className="text-xs">High Privilege</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{cap.description}</p>
              </div>
              <Switch
                checked={capabilities.includes(cap.id)}
                onCheckedChange={() => toggleCapability(cap.id)}
              />
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Tool Access */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Tool Access</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Select which external tools and integrations this agent can use.
        </p>

        <div className="grid gap-3">
          {toolOptions.map((tool) => {
            const Icon = tool.icon;
            const isEnabled = toolConfig[tool.id];

            return (
              <div
                key={tool.id}
                className={cn(
                  'flex items-start justify-between p-4 rounded-lg border transition-all',
                  isEnabled
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className="flex items-start gap-3 flex-1 pr-4">
                  <div className={cn(
                    'p-2 rounded-lg',
                    isEnabled ? 'bg-primary/10' : 'bg-muted'
                  )}>
                    <Icon className={cn(
                      'h-4 w-4',
                      isEnabled ? 'text-primary' : 'text-muted-foreground'
                    )} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tool.name}</span>
                      {tool.requiresConfig && (
                        <Badge variant="outline" className="text-xs">Requires Setup</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
                    {tool.warning && isEnabled && (
                      <p className="text-xs text-amber-600 mt-2">{tool.warning}</p>
                    )}
                  </div>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => toggleTool(tool.id)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Permission Summary */}
      <div className="bg-muted rounded-lg p-4">
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Permission Summary
        </h4>
        <p className="text-sm text-muted-foreground">
          This agent can:{' '}
          {capabilities.length === 0 && toolConfig && Object.values(toolConfig).filter(Boolean).length === 0 ? (
            'No permissions granted yet'
          ) : (
            <>
              {capabilities.map(c => c.replace('_', ' ')).join(', ')}
              {Object.entries(toolConfig)
                .filter(([, enabled]) => enabled)
                .map(([id]) => id)
                .join(', ')}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
