'use client';

import { useState } from 'react';
import { Clock, GitCommit, RotateCcw, Eye, ChevronDown, ChevronRight, User as UserIcon } from 'lucide-react';
import { cn, formatDateTime, formatRelativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ConfigVersion {
  id: string;
  version: number;
  name: string;
  description: string;
  createdAt: string;
  createdBy: string;
  changes: ConfigChange[];
  config: Record<string, unknown>;
}

interface ConfigChange {
  field: string;
  oldValue: string;
  newValue: string;
  type: 'modified' | 'added' | 'removed';
}

interface VersionHistoryProps {
  versions: ConfigVersion[];
  currentVersionId: string;
  onRollback: (version: ConfigVersion) => void;
  onView: (version: ConfigVersion) => void;
}

// Mock data for demonstration
const mockVersions: ConfigVersion[] = [
  {
    id: 'v3',
    version: 3,
    name: 'Added escalation triggers',
    description: 'Enabled high-stakes and ambiguity escalation',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    createdBy: 'Alex CEO',
    changes: [
      { field: 'escalateHighStakes', oldValue: 'false', newValue: 'true', type: 'modified' },
      { field: 'escalateAmbiguity', oldValue: 'false', newValue: 'true', type: 'modified' },
    ],
    config: {},
  },
  {
    id: 'v2',
    version: 2,
    name: 'Updated system prompt',
    description: 'Clarified success criteria and added examples',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    createdBy: 'Alex CEO',
    changes: [
      { field: 'systemPrompt', oldValue: 'Previous prompt...', newValue: 'Updated prompt with examples...', type: 'modified' },
      { field: 'successCriteria', oldValue: '', newValue: 'Response time < 1 hour', type: 'added' },
    ],
    config: {},
  },
  {
    id: 'v1',
    version: 1,
    name: 'Initial configuration',
    description: 'Created agent with default settings',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    createdBy: 'System',
    changes: [
      { field: 'name', oldValue: '', newValue: 'Support Agent', type: 'added' },
      { field: 'role', oldValue: '', newValue: 'worker', type: 'added' },
    ],
    config: {},
  },
];

export function VersionHistory({
  versions = mockVersions,
  currentVersionId,
  onRollback,
  onView,
}: VersionHistoryProps) {
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [diffDialogOpen, setDiffDialogOpen] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState<string[]>([versions[0]?.id]);

  const toggleExpanded = (versionId: string) => {
    setExpandedVersions((prev) =>
      prev.includes(versionId)
        ? prev.filter((id) => id !== versionId)
        : [...prev, versionId]
    );
  };

  const handleCompare = () => {
    if (selectedVersions.length === 2) {
      setDiffDialogOpen(true);
    }
  };

  const getChangeTypeColor = (type: ConfigChange['type']) => {
    switch (type) {
      case 'added':
        return 'text-green-600 bg-green-50 dark:bg-green-950';
      case 'removed':
        return 'text-red-600 bg-red-50 dark:bg-red-950';
      case 'modified':
        return 'text-amber-600 bg-amber-50 dark:bg-amber-950';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-950';
    }
  };

  return (
    <div className="space-y-4">
      {/* Compare Bar */}
      {selectedVersions.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="text-sm">
            {selectedVersions.length} version{selectedVersions.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={selectedVersions.length !== 2}
              onClick={handleCompare}
            >
              <Eye className="mr-2 h-4 w-4" />
              Compare
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedVersions([])}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Version List */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-3 pr-4">
          {versions.map((version, index) => {
            const isExpanded = expandedVersions.includes(version.id);
            const isCurrent = version.id === currentVersionId;
            const isSelected = selectedVersions.includes(version.id);

            return (
              <div
                key={version.id}
                className={cn(
                  'border rounded-lg transition-all',
                  isCurrent && 'border-primary bg-primary/5',
                  isSelected && 'ring-2 ring-primary/20',
                  !isCurrent && !isSelected && 'border-border hover:border-primary/50'
                )}
              >
                {/* Header */}
                <div className="flex items-center gap-3 p-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedVersions((prev) => [...prev.slice(-1), version.id]);
                      } else {
                        setSelectedVersions((prev) => prev.filter((id) => id !== version.id));
                      }
                    }}
                    className="rounded border-gray-300"
                  />

                  <button
                    onClick={() => toggleExpanded(version.id)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}

                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-muted">
                        <GitCommit className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{version.name}</span>
                          {isCurrent && (
                            <Badge variant="default" className="text-xs">Current</Badge>
                          )}
                          {index === 0 && !isCurrent && (
                            <Badge variant="secondary" className="text-xs">Latest</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>v{version.version}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(version.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </button>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRollback(version)}
                          disabled={isCurrent}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Rollback to this version</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t pt-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <UserIcon className="h-4 w-4" />
                      <span>{version.createdBy}</span>
                      <span>•</span>
                      <Clock className="h-4 w-4" />
                      <span>{formatDateTime(version.createdAt)}</span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      {version.description}
                    </p>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Changes
                      </p>
                      {version.changes.map((change, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            'flex items-center gap-2 p-2 rounded text-sm',
                            getChangeTypeColor(change.type)
                          )}
                        >
                          <Badge variant="outline" className="text-xs capitalize">
                            {change.type}
                          </Badge>
                          <span className="font-medium">{change.field}</span>
                          {change.type === 'modified' && (
                            <>
                              <span className="text-muted-foreground">changed from</span>
                              <code className="px-1.5 py-0.5 bg-black/10 rounded text-xs truncate max-w-[100px]">
                                {change.oldValue}
                              </code>
                              <span className="text-muted-foreground">to</span>
                              <code className="px-1.5 py-0.5 bg-black/10 rounded text-xs truncate max-w-[100px]">
                                {change.newValue}
                              </code>
                            </>
                          )}
                          {change.type === 'added' && (
                            <>
                              <span className="text-muted-foreground">set to</span>
                              <code className="px-1.5 py-0.5 bg-black/10 rounded text-xs truncate max-w-[150px]">
                                {change.newValue}
                              </code>
                            </>
                          )}
                          {change.type === 'removed' && (
                            <span className="text-muted-foreground">removed</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Diff Dialog */}
      <Dialog open={diffDialogOpen} onOpenChange={setDiffDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Compare Versions</DialogTitle>
            <DialogDescription>
              View differences between selected versions
            </DialogDescription>
          </DialogHeader>
          <DiffView
            versions={versions.filter((v) => selectedVersions.includes(v.id))}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DiffView({ versions }: { versions: ConfigVersion[] }) {
  if (versions.length !== 2) return null;

  const [v1, v2] = versions;
  const allChanges = [...v1.changes, ...v2.changes];
  const uniqueFields = [...new Set(allChanges.map((c) => c.field))];

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">v{v1.version}</Badge>
          <span className="text-muted-foreground">{v1.name}</span>
        </div>
        <span className="text-muted-foreground">vs</span>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">v{v2.version}</Badge>
          <span className="text-muted-foreground">{v2.name}</span>
        </div>
      </div>

      <div className="border rounded-lg divide-y">
        {uniqueFields.map((field) => {
          const change1 = v1.changes.find((c) => c.field === field);
          const change2 = v2.changes.find((c) => c.field === field);

          return (
            <div key={field} className="p-4">
              <p className="font-medium mb-2">{field}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">v{v1.version}</p>
                  <code className="block p-2 bg-muted rounded text-sm">
                    {change1?.newValue || change1?.oldValue || '(unchanged)'}
                  </code>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">v{v2.version}</p>
                  <code className="block p-2 bg-muted rounded text-sm">
                    {change2?.newValue || change2?.oldValue || '(unchanged)'}
                  </code>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
