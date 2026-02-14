'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

export interface VersionHistoryEntry {
  id: string;
  version_number: number;
  name: string | null;
  description: string | null;
  change_type: 'manual' | 'auto_save' | 'restore' | 'template_import' | 'clone' | 'system';
  change_source: string;
  changed_by: string | null;
  changed_by_name: string | null;
  created_at: string;
  is_current: boolean;
  change_summary: {
    changed_fields?: string[];
    restored_from_version?: number;
    is_initial?: boolean;
    previous_version?: number;
  } | null;
}

export interface UseVersionHistoryReturn {
  versions: VersionHistoryEntry[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  currentVersion: number;
  totalCount: number;
  fetchVersions: (page?: number) => Promise<void>;
  fetchMore: () => Promise<void>;
  restoreVersion: (versionNumber: number) => Promise<boolean>;
  compareVersions: (versionA: number, versionB: number) => Promise<{
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
  } | null>;
}

export function useVersionHistory(agentId: string): UseVersionHistoryReturn {
  const [versions, setVersions] = useState<VersionHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [currentVersion, setCurrentVersion] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

  const fetchVersions = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/agents/${agentId}/config/versions?page=${page}&limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch version history');
      }

      const data = await response.json();
      
      if (page === 1) {
        setVersions(data.data || []);
      } else {
        setVersions(prev => [...prev, ...(data.data || [])]);
      }
      
      setCurrentVersion(data.meta?.current_version || 0);
      setTotalCount(data.pagination?.total || 0);
      setHasMore((data.pagination?.total || 0) > page * 20);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching versions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load version history',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [agentId, toast]);

  const fetchMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    await fetchVersions(currentPage + 1);
    setIsLoadingMore(false);
  }, [currentPage, hasMore, isLoadingMore, fetchVersions]);

  const restoreVersion = useCallback(async (versionNumber: number): Promise<boolean> => {
    try {
      const response = await fetch(
        `/api/agents/${agentId}/config/restore`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify({ version_number: versionNumber }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to restore version');
      }

      const data = await response.json();
      
      toast({
        title: 'Version Restored',
        description: `Successfully restored to version ${versionNumber}`,
      });

      // Refresh versions to get the new restore entry
      await fetchVersions(1);
      
      return true;
    } catch (error) {
      console.error('Error restoring version:', error);
      toast({
        title: 'Restore Failed',
        description: error instanceof Error ? error.message : 'Failed to restore version',
        variant: 'destructive',
      });
      return false;
    }
  }, [agentId, fetchVersions, toast]);

  const compareVersions = useCallback(async (
    versionA: number,
    versionB: number
  ): Promise<{ diff: { changes: Array<{ path: string; type: 'added' | 'removed' | 'modified'; oldValue?: unknown; newValue?: unknown }>; summary: { totalChanges: number; addedCount: number; removedCount: number; modifiedCount: number } } } | null> => {
    try {
      const response = await fetch(
        `/api/agents/${agentId}/config/versions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify({ version_a: versionA, version_b: versionB }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to compare versions');
      }

      const data = await response.json();
      return data.data?.diff || null;
    } catch (error) {
      console.error('Error comparing versions:', error);
      toast({
        title: 'Error',
        description: 'Failed to compare versions',
        variant: 'destructive',
      });
      return null;
    }
  }, [agentId, toast]);

  return {
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
  };
}
