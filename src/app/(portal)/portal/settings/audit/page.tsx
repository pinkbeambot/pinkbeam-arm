'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { PortalLayout, PageContainer, PageHeader } from '@/components/dashboard/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRBAC } from '@/lib/hooks';
import { useRetentionSettings, useAuditExport } from '@/lib/hooks/useAuditSettings';
import { useToast } from '@/components/ui/use-toast';
import {
  Download,
  Save,
  Shield,
  Archive,
  Database,
  FileText,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import type { ExportOptions } from '@/lib/hooks/useAuditSettings';

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AuditSettingsPage() {
  const { toast } = useToast();
  const { can } = useRBAC();
  const canRead = can('analytics:read');
  const canManage = can('team:manage');

  const { retention, stats, loading, saving, error, updateRetention } = useRetentionSettings();
  const { exportAuditLog, exporting, error: exportError } = useAuditExport();

  // Local form state for retention settings
  const [activityDays, setActivityDays] = useState<string>('');
  const [securityDays, setSecurityDays] = useState<string>('');
  const [autoArchive, setAutoArchive] = useState(false);
  const [archiveDays, setArchiveDays] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);

  // Export form state
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [exportEntityType, setExportEntityType] = useState<string>('all');
  const [exportTimeRange, setExportTimeRange] = useState<string>('30d');
  const [exportIncludeSecurity, setExportIncludeSecurity] = useState(false);

  // Initialize local state from fetched retention data
  const initialized = useRef(false);
  useEffect(() => {
    if (retention && !initialized.current) {
      initialized.current = true;
      setActivityDays(String(retention.activity_retention_days));
      setSecurityDays(String(retention.security_log_retention_days));
      setAutoArchive(retention.auto_archive_enabled);
      setArchiveDays(String(retention.archive_after_days));
    }
  }, [retention]);

  // Permission check
  if (!canRead) {
    return (
      <PortalLayout>
        <PageContainer>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>You do not have permission to view audit settings.</AlertDescription>
          </Alert>
        </PageContainer>
      </PortalLayout>
    );
  }

  const handleSaveRetention = async () => {
    const activityDaysNum = parseInt(activityDays, 10);
    const securityDaysNum = parseInt(securityDays, 10);
    const archiveDaysNum = parseInt(archiveDays, 10);

    if (isNaN(activityDaysNum) || activityDaysNum < 7 || activityDaysNum > 730) {
      toast({ title: 'Invalid Value', description: 'Activity retention must be between 7 and 730 days.', variant: 'destructive' });
      return;
    }
    if (isNaN(securityDaysNum) || securityDaysNum < 30 || securityDaysNum > 730) {
      toast({ title: 'Invalid Value', description: 'Security log retention must be between 30 and 730 days.', variant: 'destructive' });
      return;
    }
    if (autoArchive && (isNaN(archiveDaysNum) || archiveDaysNum < 7 || archiveDaysNum > 365)) {
      toast({ title: 'Invalid Value', description: 'Archive threshold must be between 7 and 365 days.', variant: 'destructive' });
      return;
    }

    const success = await updateRetention({
      activity_retention_days: activityDaysNum,
      security_log_retention_days: securityDaysNum,
      auto_archive_enabled: autoArchive,
      archive_after_days: archiveDaysNum,
    });

    if (success) {
      setHasChanges(false);
      toast({ title: 'Settings Saved', description: 'Retention settings have been updated.' });
    } else {
      toast({ title: 'Error', description: 'Failed to save retention settings.', variant: 'destructive' });
    }
  };

  const handleExport = async () => {
    const options: ExportOptions = {
      format: exportFormat,
      entity_type: exportEntityType !== 'all' ? exportEntityType : undefined,
      time_range: exportTimeRange !== 'all' ? exportTimeRange : undefined,
      include_security: exportIncludeSecurity,
    };

    const success = await exportAuditLog(options);
    if (success) {
      toast({ title: 'Export Complete', description: `Audit log exported as ${exportFormat.toUpperCase()}.` });
    } else {
      toast({ title: 'Export Failed', description: exportError?.message || 'Failed to export audit log.', variant: 'destructive' });
    }
  };

  const markChanged = () => setHasChanges(true);

  if (loading) {
    return (
      <PortalLayout>
        <PageContainer>
          <PageHeader title="Audit Log & Retention" description="Export audit logs and configure data retention policies." />
          <LoadingSkeleton />
        </PageContainer>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <PageContainer>
        <PageHeader
          title="Audit Log & Retention"
          description="Export audit logs and configure data retention policies."
        />

        {error && (
          <Alert variant="destructive" className="mb-6 max-w-4xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 max-w-4xl">
          {/* Storage Stats */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                      <FileText className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{formatNumber(stats.activity_count)}</p>
                      <p className="text-xs text-muted-foreground">Activity Records</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                      <Shield className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{formatNumber(stats.security_log_count)}</p>
                      <p className="text-xs text-muted-foreground">Security Log Entries</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-500/10">
                      <Archive className="h-5 w-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{formatNumber(stats.archived_count)}</p>
                      <p className="text-xs text-muted-foreground">Archived Records</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Export Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Export Audit Log
              </CardTitle>
              <CardDescription>
                Download activity and security logs in CSV or JSON format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'csv' | 'json')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Entity Type</Label>
                  <Select value={exportEntityType} onValueChange={setExportEntityType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="tasks">Tasks</SelectItem>
                      <SelectItem value="decisions">Decisions</SelectItem>
                      <SelectItem value="escalations">Escalations</SelectItem>
                      <SelectItem value="agents">Agents</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Time Range</Label>
                  <Select value={exportTimeRange} onValueChange={setExportTimeRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">Last Hour</SelectItem>
                      <SelectItem value="24h">Last 24 Hours</SelectItem>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="invisible">Action</Label>
                  <div className="flex items-center h-10 gap-3">
                    <Switch
                      id="include-security"
                      checked={exportIncludeSecurity}
                      onCheckedChange={setExportIncludeSecurity}
                    />
                    <Label htmlFor="include-security" className="text-sm cursor-pointer">
                      Include security logs
                    </Label>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Export up to 10,000 records per download
                </p>
                <Button onClick={handleExport} disabled={exporting}>
                  {exporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download {exportFormat.toUpperCase()}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Retention Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Retention Policies
              </CardTitle>
              <CardDescription>
                Configure how long audit data is retained before cleanup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!canManage && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You need admin permissions to modify retention settings.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="activity-days" className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Activity Log Retention
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="activity-days"
                      type="number"
                      min={7}
                      max={730}
                      value={activityDays}
                      onChange={(e) => { setActivityDays(e.target.value); markChanged(); }}
                      disabled={!canManage}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Activity records older than this will be purged. Range: 7–730 days.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="security-days" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Security Log Retention
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="security-days"
                      type="number"
                      min={30}
                      max={730}
                      value={securityDays}
                      onChange={(e) => { setSecurityDays(e.target.value); markChanged(); }}
                      disabled={!canManage}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Security audit entries older than this will be purged. Minimum: 30 days.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-archive" className="flex items-center gap-2">
                      <Archive className="h-4 w-4" />
                      Auto-Archive
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically move old activity records to the archive table
                    </p>
                  </div>
                  <Switch
                    id="auto-archive"
                    checked={autoArchive}
                    onCheckedChange={(v) => { setAutoArchive(v); markChanged(); }}
                    disabled={!canManage}
                  />
                </div>

                {autoArchive && (
                  <div className="space-y-2 pl-6 border-l-2 border-muted">
                    <Label htmlFor="archive-days">Archive activities older than</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="archive-days"
                        type="number"
                        min={7}
                        max={365}
                        value={archiveDays}
                        onChange={(e) => { setArchiveDays(e.target.value); markChanged(); }}
                        disabled={!canManage}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Records older than this threshold will be moved to the archive. Range: 7–365 days.
                    </p>
                  </div>
                )}
              </div>

              {canManage && (
                <>
                  <Separator />
                  <div className="flex justify-end">
                    <Button onClick={handleSaveRetention} disabled={!hasChanges || saving}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Retention Settings
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </PortalLayout>
  );
}
