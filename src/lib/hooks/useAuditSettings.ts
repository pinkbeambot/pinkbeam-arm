'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api/fetch';

export interface RetentionConfig {
  activity_retention_days: number;
  security_log_retention_days: number;
  auto_archive_enabled: boolean;
  archive_after_days: number;
}

export interface StorageStats {
  activity_count: number;
  security_log_count: number;
  archived_count: number;
}

interface RetentionData {
  retention: RetentionConfig;
  stats: StorageStats;
}

export function useRetentionSettings() {
  const [retention, setRetention] = useState<RetentionConfig | null>(null);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/settings/retention');
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to fetch retention settings');
      }
      const { data } = (await res.json()) as { data: RetentionData };
      setRetention(data.retention);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateRetention = useCallback(async (updates: Partial<RetentionConfig>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch('/api/settings/retention', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to update retention settings');
      }
      const { data } = (await res.json()) as { data: { retention: RetentionConfig } };
      setRetention(data.retention);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { retention, stats, loading, saving, error, updateRetention, refetch: fetchSettings };
}

export interface ExportOptions {
  format: 'csv' | 'json';
  entity_type?: string;
  time_range?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  include_security?: boolean;
}

export function useAuditExport() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const exportAuditLog = useCallback(async (options: ExportOptions) => {
    setExporting(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('format', options.format);
      if (options.entity_type) params.set('entity_type', options.entity_type);
      if (options.time_range) params.set('time_range', options.time_range);
      if (options.date_from) params.set('date_from', options.date_from);
      if (options.date_to) params.set('date_to', options.date_to);
      if (options.search) params.set('search', options.search);
      if (options.include_security) params.set('include_security', 'true');

      const res = await apiFetch(`/api/activities/export?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to export audit log');
      }

      // Trigger download
      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `audit-log.${options.format}`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return false;
    } finally {
      setExporting(false);
    }
  }, []);

  return { exportAuditLog, exporting, error };
}
