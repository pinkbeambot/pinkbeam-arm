'use client';

import { useEffect, useState } from 'react';
import { 
  History, 
  RotateCcw, 
  GitCompare, 
  ChevronDown, 
  ChevronUp,
  User,
  Bot,
  Save,
  Undo2,
  FilePlus,
  Copy,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { useVersionHistory, VersionHistoryEntry } from './useVersionHistory';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface VersionHistoryProps {
  agentId: string;
  agentName: string;
}

function getChangeTypeIcon(type: VersionHistoryEntry['change_type']) {
  switch (type) {
    case 'restore':
      return <Undo2 className="h-4 w-4" />;
    case 'template_import':
      return <FilePlus className="h-4 w-4" />;
    case 'clone':
      return <Copy className="h-4 w-4" />;
    case 'system':
      return <Bot className="h-4 w-4" />;
    case 'auto_save':
      return <Save className="h-4 w-4" />;
    default:
      return <User className="h-4 w-4" />;
  }
}

function getChangeTypeColor(type: VersionHistoryEntry['change_type']) {
  switch (type) {
    case 'restore':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    case 'template_import':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'clone':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'system':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    case 'auto_save':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    default:
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
  }
}

function getChangeTypeLabel(type: VersionHistoryEntry['change_type']) {
  switch (type) {
    case 'restore':
      return 'Restored';
    case 'template_import':
      return 'Template';
    case 'clone':
      return 'Cloned';
    case 'system':
      return 'System';
    case 'auto_save':
      return 'Auto-saved';
    default:
      return 'Manual';
  }
}

export function VersionHistory({ agentId, agentName }: VersionHistoryProps) {
  const {
    versions,
    isLoading,
    isLoadingMore,
    hasMore,
    currentVersion,
    totalCount,
    fetchVersions,
    fetchMore,
    restoreVersion,
    compareVersions,
  } = useVersionHistory(agentId);

  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [compareResult, setCompareResult] = useState<{
    versionA: { version_number: number; name: string | null };
    versionB: { version_number: number; name: string | null };
    diff: {
      changes: Array<{
        path: string;
        type: 'added' | 'removed' | 'modified';
        oldValue?: unknown;
        newValue?: unknown;
      }>;
      summary: {
        totalChanges: number;
        addedCount: number;
        removedCount: number;
        modifiedCount: number;
      };
    };
  } | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState<number | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleCompare = async () => {
    if (selectedVersions.length !== 2) return;
    
    const [a, b] = selectedVersions.sort((x, y) => x - y);
    const result = await compareVersions(a, b);
    
    if (result) {
      const versionA = versions.find(v => v.version_number === a);
      const versionB = versions.find(v => v.version_number === b);
      
      setCompareResult({
        versionA: { version_number: a, name: versionA?.name || null },
        versionB: { version_number: b, name: versionB?.name || null },
        diff: result.diff,
      });
      setCompareDialogOpen(true);
    }
  };

  const handleRestore = async () => {
    if (versionToRestore === null) return;
    
    setIsRestoring(true);
    const success = await restoreVersion(versionToRestore);
    setIsRestoring(false);
    
    if (success) {
      setRestoreDialogOpen(false);
      setVersionToRestore(null);
    }
  };

  const toggleVersionSelection = (versionNumber: number) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionNumber)) {
        return prev.filter(v => v !== versionNumber);
      }
      if (prev.length >= 2) {
        return [prev[1], versionNumber];
      }
      return [...prev, versionNumber];
    });
  };

  const formatFieldName = (field: string) => {
    return field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
          <CardDescription>Loading version history...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Version History
              </CardTitle>
              <CardDescription>
                {totalCount} version{totalCount !== 1 ? 's' : ''} • Current: v{currentVersion}
              </CardDescription>
            </div>
            {selectedVersions.length === 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCompare}
                className="gap-2"
              >
                <GitCompare className="h-4 w-4" />
                Compare Selected
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {versions.map((version, index) => {
                const isExpanded = expandedVersion === version.version_number;
                const isSelected = selectedVersions.includes(version.version_number);
                const canSelect = selectedVersions.length < 2 || isSelected;

                return (
                  <div
                    key={version.id}
                    className={cn(
                      'border rounded-lg p-4 transition-colors',
                      version.is_current && 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20',
                      isSelected && 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20',
                      !version.is_current && !isSelected && 'hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Selection checkbox */}
                      <div className="pt-1">
                        <button
                          onClick={() => canSelect && toggleVersionSelection(version.version_number)}
                          disabled={!canSelect && !isSelected}
                          className={cn(
                            'w-5 h-5 rounded border flex items-center justify-center transition-colors',
                            isSelected
                              ? 'bg-blue-500 border-blue-500 text-white'
                              : canSelect
                              ? 'border-gray-300 hover:border-gray-400 dark:border-gray-600'
                              : 'border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800 cursor-not-allowed'
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </button>
                      </div>

                      {/* Icon */}
                      <div className={cn(
                        'p-2 rounded-lg shrink-0',
                        getChangeTypeColor(version.change_type)
                      )}>
                        {getChangeTypeIcon(version.change_type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">
                            v{version.version_number}
                          </span>
                          {version.is_current && (
                            <Badge variant="default" className="bg-indigo-500">
                              Current
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {getChangeTypeLabel(version.change_type)}
                          </Badge>
                        </div>

                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {version.name || 'Untitled version'}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                          <span>{format(new Date(version.created_at), 'MMM d, yyyy h:mm a')}</span>
                          {version.changed_by_name && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {version.changed_by_name}
                            </span>
                          )}
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-4 space-y-3 border-t pt-3">
                            {version.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {version.description}
                              </p>
                            )}

                            {version.change_summary?.changed_fields && (
                              <div>
                                <span className="text-xs font-medium text-gray-500">Changed fields:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {version.change_summary.changed_fields.map(field => (
                                    <Badge key={field} variant="outline" className="text-xs">
                                      {formatFieldName(field)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {version.change_summary?.restored_from_version && (
                              <div className="text-sm text-amber-600 dark:text-amber-400">
                                Restored from version {version.change_summary.restored_from_version}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col items-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedVersion(isExpanded ? null : version.version_number)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>

                        {!version.is_current && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setVersionToRestore(version.version_number);
                              setRestoreDialogOpen(true);
                            }}
                            className="gap-1"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Restore
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={fetchMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}

              {versions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No version history available</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Compare Dialog */}
      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Compare Versions
            </DialogTitle>
            <DialogDescription>
              Comparing v{compareResult?.versionA.version_number} with v{compareResult?.versionB.version_number}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[500px]">
            {compareResult?.diff.summary && (
              <div className="flex gap-4 mb-4">
                <Badge variant="default" className="bg-green-500">
                  {compareResult.diff.summary.addedCount} added
                </Badge>
                <Badge variant="default" className="bg-red-500">
                  {compareResult.diff.summary.removedCount} removed
                </Badge>
                <Badge variant="default" className="bg-blue-500">
                  {compareResult.diff.summary.modifiedCount} modified
                </Badge>
              </div>
            )}

            <div className="space-y-2">
              {compareResult?.diff.changes
                .map((change, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'border rounded p-3 text-sm',
                      change.type === 'added' && 'border-green-200 bg-green-50 dark:bg-green-950/20',
                      change.type === 'removed' && 'border-red-200 bg-red-50 dark:bg-red-950/20',
                      change.type === 'modified' && 'border-blue-200 bg-blue-50 dark:bg-blue-950/20'
                    )}
                  >
                    <div className="font-medium mb-1">{change.path || 'root'}</div>
                    {change.type === 'modified' ? (
                      <div className="space-y-1">
                        <div className="text-red-600 dark:text-red-400 line-through">
                          - {JSON.stringify(change.oldValue).slice(0, 100)}
                        </div>
                        <div className="text-green-600 dark:text-green-400">
                          + {JSON.stringify(change.newValue).slice(0, 100)}
                        </div>
                      </div>
                    ) : change.type === 'added' ? (
                      <div className="text-green-600 dark:text-green-400">
                        + {JSON.stringify(change.newValue).slice(0, 100)}
                      </div>
                    ) : (
                      <div className="text-red-600 dark:text-red-400 line-through">
                        - {JSON.stringify(change.oldValue).slice(0, 100)}
                      </div>
                    )}
                  </div>
                ))}

              {compareResult?.diff.changes.length === 0 && (
                <p className="text-center text-gray-500 py-4">No differences found</p>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button onClick={() => setCompareDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Alert Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Version</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore <strong>{agentName}</strong> to version {versionToRestore}?
              This will create a new version with the restored configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setVersionToRestore(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={isRestoring}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {isRestoring ? 'Restoring...' : 'Restore Version'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
