'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PortalLayout, PageContainer, PageHeader } from '@/components/dashboard/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotificationPreferences } from '@/lib/hooks/useNotifications';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from '@/types/notification';
import {
  Bell,
  Mail,
  Globe,
  Smartphone,
  Save,
  RotateCcw,
  UserCheck,
  AlertTriangle,
  GitPullRequest,
  ShieldAlert,
  Check,
  AlertCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Channel configuration
const CHANNELS: { id: NotificationChannel; label: string; icon: typeof Bell; description: string }[] = [
  { id: 'in_app', label: 'In-App', icon: Bell, description: 'Show notifications in the app' },
  { id: 'email', label: 'Email', icon: Mail, description: 'Send notifications to your email' },
  { id: 'webhook', label: 'Webhook', icon: Globe, description: 'POST to your webhook URL' },
  { id: 'push', label: 'Push', icon: Smartphone, description: 'Send push notifications' },
];

// Priority levels
const PRIORITIES: { value: NotificationPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-gray-500' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
];

// Notification type configuration
const NOTIFICATION_TYPES: {
  type: NotificationType;
  label: string;
  icon: typeof Bell;
  description: string;
  category: string;
}[] = [
  {
    type: 'task_assigned',
    label: 'Task Assigned',
    icon: UserCheck,
    description: 'When a new task is assigned to you or your agents',
    category: 'Tasks',
  },
  {
    type: 'escalation_received',
    label: 'Escalation Received',
    icon: AlertTriangle,
    description: 'When an agent escalates an issue requiring your attention',
    category: 'Escalations',
  },
  {
    type: 'decision_required',
    label: 'Decision Required',
    icon: GitPullRequest,
    description: 'When a decision needs your approval or input',
    category: 'Decisions',
  },
  {
    type: 'system_alert',
    label: 'System Alert',
    icon: ShieldAlert,
    description: 'Important system events and alerts',
    category: 'System',
  },
];

interface PreferenceCardProps {
  type: NotificationType;
  label: string;
  icon: typeof Bell;
  description: string;
  channels: Record<NotificationChannel, boolean>;
  minPriority: NotificationPriority;
  onChannelToggle: (channel: NotificationChannel) => void;
  onPriorityChange: (priority: NotificationPriority) => void;
}

function PreferenceCard({
  type,
  label,
  icon: Icon,
  description,
  channels,
  minPriority,
  onChannelToggle,
  onPriorityChange,
}: PreferenceCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{label}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Channel toggles */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Delivery Channels</Label>
          <div className="grid grid-cols-2 gap-3">
            {CHANNELS.map((channel) => (
              <div
                key={channel.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border transition-colors',
                  channels[channel.id]
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-muted/50 border-transparent'
                )}
              >
                <div className="flex items-center gap-2">
                  <channel.icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{channel.label}</p>
                    <p className="text-xs text-muted-foreground hidden sm:block">{channel.description}</p>
                  </div>
                </div>
                <Switch
                  checked={channels[channel.id]}
                  onCheckedChange={() => onChannelToggle(channel.id)}
                  aria-label={`Enable ${channel.label} notifications for ${label}`}
                />
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Priority threshold */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Minimum Priority</Label>
          <p className="text-xs text-muted-foreground">
            Only receive notifications with this priority level or higher
          </p>
          <div className="flex flex-wrap gap-2">
            {PRIORITIES.map((priority) => (
              <Button
                key={priority.value}
                variant={minPriority === priority.value ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'h-8 text-xs',
                  minPriority === priority.value && 'bg-primary text-primary-foreground'
                )}
                onClick={() => onPriorityChange(priority.value)}
              >
                <span className={cn('w-2 h-2 rounded-full mr-2', priority.color)} />
                {priority.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-16 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { preferences, loading, error, updatePreferences } = useNotificationPreferences();
  const [localPreferences, setLocalPreferences] = React.useState<Record<NotificationType, PreferenceCardProps['channels'] & { minPriority: NotificationPriority }>>({
    task_assigned: { in_app: true, email: true, webhook: false, push: false, minPriority: 'normal' },
    escalation_received: { in_app: true, email: true, webhook: true, push: true, minPriority: 'high' },
    decision_required: { in_app: true, email: true, webhook: false, push: true, minPriority: 'high' },
    system_alert: { in_app: true, email: true, webhook: true, push: true, minPriority: 'normal' },
    info: { in_app: true, email: false, webhook: false, push: false, minPriority: 'low' },
    success: { in_app: true, email: false, webhook: false, push: false, minPriority: 'low' },
    warning: { in_app: true, email: true, webhook: false, push: false, minPriority: 'normal' },
    error: { in_app: true, email: true, webhook: true, push: true, minPriority: 'high' },
  });
  const [hasChanges, setHasChanges] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Load preferences from API
  React.useEffect(() => {
    if (preferences.length > 0) {
      const prefs: typeof localPreferences = { ...localPreferences };
      preferences.forEach((pref) => {
        prefs[pref.notification_type] = {
          in_app: pref.channels.in_app,
          email: pref.channels.email,
          webhook: pref.channels.webhook,
          push: pref.channels.push,
          minPriority: pref.min_priority,
        };
      });
      setLocalPreferences(prefs);
    }
  }, [preferences]);

  const handleChannelToggle = (type: NotificationType, channel: NotificationChannel) => {
    setLocalPreferences((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [channel]: !prev[type][channel],
      },
    }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handlePriorityChange = (type: NotificationType, priority: NotificationPriority) => {
    setLocalPreferences((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        minPriority: priority,
      },
    }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const prefsToUpdate = Object.entries(localPreferences).map(([type, config]) => ({
      notification_type: type as NotificationType,
      channels: {
        in_app: config.in_app,
        email: config.email,
        webhook: config.webhook,
        push: config.push,
      },
      min_priority: config.minPriority,
    }));

    const success = await updatePreferences(prefsToUpdate);
    if (success) {
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
    setIsSaving(false);
  };

  const handleReset = () => {
    const defaultPrefs: typeof localPreferences = {
      task_assigned: { in_app: true, email: true, webhook: false, push: false, minPriority: 'normal' },
      escalation_received: { in_app: true, email: true, webhook: true, push: true, minPriority: 'high' },
      decision_required: { in_app: true, email: true, webhook: false, push: true, minPriority: 'high' },
      system_alert: { in_app: true, email: true, webhook: true, push: true, minPriority: 'normal' },
      info: { in_app: true, email: false, webhook: false, push: false, minPriority: 'low' },
      success: { in_app: true, email: false, webhook: false, push: false, minPriority: 'low' },
      warning: { in_app: true, email: true, webhook: false, push: false, minPriority: 'normal' },
      error: { in_app: true, email: true, webhook: true, push: true, minPriority: 'high' },
    };
    setLocalPreferences(defaultPrefs);
    setHasChanges(true);
    setSaveSuccess(false);
  };

  if (loading) {
    return (
      <PortalLayout>
        <PageContainer>
          <PageHeader
            title="Notification Settings"
            description="Configure how and when you receive notifications."
          />
          <LoadingState />
        </PageContainer>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <PageContainer>
        <PageHeader
          title="Notification Settings"
          description="Configure how and when you receive notifications."
        >
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isSaving}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </PageHeader>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {saveSuccess && (
          <Alert className="mb-6 bg-green-50 border-green-200 text-green-800">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription>Your notification preferences have been saved.</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 max-w-4xl">
          {/* Info card */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Customize how you receive different types of notifications. You can enable multiple
              channels for each notification type and set minimum priority thresholds.
            </AlertDescription>
          </Alert>

          {/* Notification type cards */}
          {NOTIFICATION_TYPES.map(({ type, label, icon, description }) => (
            <PreferenceCard
              key={type}
              type={type}
              label={label}
              icon={icon}
              description={description}
              channels={{
                in_app: localPreferences[type].in_app,
                email: localPreferences[type].email,
                webhook: localPreferences[type].webhook,
                push: localPreferences[type].push,
              }}
              minPriority={localPreferences[type].minPriority}
              onChannelToggle={(channel) => handleChannelToggle(type, channel)}
              onPriorityChange={(priority) => handlePriorityChange(type, priority)}
            />
          ))}

          {/* Webhook configuration (if webhook is enabled for any) */}
          {Object.values(localPreferences).some((p) => p.webhook) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Webhook Configuration
                </CardTitle>
                <CardDescription>
                  Configure the URL where webhook notifications will be sent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <input
                    type="url"
                    id="webhook-url"
                    placeholder="https://your-app.com/webhooks/notifications"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Webhook notifications will be sent as POST requests to this URL with a JSON payload.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PageContainer>
    </PortalLayout>
  );
}
