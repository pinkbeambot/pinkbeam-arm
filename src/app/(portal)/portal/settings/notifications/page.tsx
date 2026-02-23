'use client';

import * as React from 'react';
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
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from '@/types/notification';
import {
  Bell,
  BellRing,
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
  Volume2,
  VolumeX,
  Moon,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrowserNotifications } from '@/lib/hooks/useBrowserNotifications';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

// Common timezones for the selector
const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Pacific/Auckland',
];

function getTimezoneLabel(tz: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(now);
    const tzAbbr = parts.find(p => p.type === 'timeZoneName')?.value || '';
    const city = tz.split('/').pop()?.replace(/_/g, ' ') || tz;
    return `${city} (${tzAbbr})`;
  } catch {
    return tz;
  }
}

export default function NotificationSettingsPage() {
  const { preferences, loading, error, updatePreferences } = useNotificationPreferences();
  const {
    permission,
    requestPermission,
    settings: browserSettings,
    updateSettings: updateBrowserSettings,
    isSupported,
  } = useBrowserNotifications();
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

          {/* Browser Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BellRing className="h-4 w-4" />
                Browser Notifications
              </CardTitle>
              <CardDescription>
                Receive desktop notifications for escalations, decisions, and system alerts even when
                the app is in the background
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Permission status */}
              {!isSupported ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your browser does not support desktop notifications.
                  </AlertDescription>
                </Alert>
              ) : permission === 'denied' ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Browser notifications are blocked. Please enable them in your browser settings
                    for this site, then refresh the page.
                  </AlertDescription>
                </Alert>
              ) : permission === 'default' ? (
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Enable Desktop Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Get alerted about critical events even when the app isn&apos;t in focus
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={requestPermission}
                  >
                    <BellRing className="h-4 w-4 mr-2" />
                    Allow Notifications
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 rounded-lg border bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Desktop notifications enabled
                    </p>
                  </div>
                  <Badge variant="outline" className="text-green-700 border-green-300 dark:text-green-300 dark:border-green-700">
                    Active
                  </Badge>
                </div>
              )}

              {/* Enable/disable toggle */}
              {isSupported && permission === 'granted' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="browser-enabled" className="text-sm font-medium">
                          Notifications Enabled
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Temporarily pause all desktop notifications
                        </p>
                      </div>
                      <Switch
                        id="browser-enabled"
                        checked={browserSettings.enabled}
                        onCheckedChange={(enabled) => updateBrowserSettings({ enabled })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {browserSettings.soundEnabled ? (
                          <Volume2 className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <VolumeX className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="space-y-0.5">
                          <Label htmlFor="sound-enabled" className="text-sm font-medium">
                            Notification Sound
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Play a chime when notifications arrive
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="sound-enabled"
                        checked={browserSettings.soundEnabled}
                        onCheckedChange={(soundEnabled) => updateBrowserSettings({ soundEnabled })}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quiet Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Moon className="h-4 w-4" />
                Quiet Hours
              </CardTitle>
              <CardDescription>
                Pause desktop notifications during specified hours so you aren&apos;t disturbed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="quiet-hours-enabled" className="text-sm font-medium">
                    Enable Quiet Hours
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Silence desktop notifications during the specified time range
                  </p>
                </div>
                <Switch
                  id="quiet-hours-enabled"
                  checked={browserSettings.quietHours.enabled}
                  onCheckedChange={(enabled) =>
                    updateBrowserSettings({
                      quietHours: { ...browserSettings.quietHours, enabled },
                    })
                  }
                />
              </div>

              {browserSettings.quietHours.enabled && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quiet-start" className="text-sm font-medium flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Start Time
                      </Label>
                      <Input
                        id="quiet-start"
                        type="time"
                        value={browserSettings.quietHours.start}
                        onChange={(e) =>
                          updateBrowserSettings({
                            quietHours: { ...browserSettings.quietHours, start: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quiet-end" className="text-sm font-medium flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        End Time
                      </Label>
                      <Input
                        id="quiet-end"
                        type="time"
                        value={browserSettings.quietHours.end}
                        onChange={(e) =>
                          updateBrowserSettings({
                            quietHours: { ...browserSettings.quietHours, end: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quiet-timezone" className="text-sm font-medium flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5" />
                        Timezone
                      </Label>
                      <Select
                        value={browserSettings.quietHours.timezone}
                        onValueChange={(timezone) =>
                          updateBrowserSettings({
                            quietHours: { ...browserSettings.quietHours, timezone },
                          })
                        }
                      >
                        <SelectTrigger id="quiet-timezone">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COMMON_TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                              {getTimezoneLabel(tz)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Notifications arriving between {browserSettings.quietHours.start} and{' '}
                    {browserSettings.quietHours.end} ({getTimezoneLabel(browserSettings.quietHours.timezone)}) will be silenced.
                    You&apos;ll still see them in your notification center.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

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
