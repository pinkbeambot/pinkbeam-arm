import { PortalLayout, PageContainer, PageHeader } from "@/components/dashboard/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, Mail, Settings, Bell } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get user initials for avatar
  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <PortalLayout>
      <PageContainer>
        <PageHeader
          title="Settings"
          description="Manage your account and portal preferences"
        />

        <div className="grid gap-6 max-w-4xl">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Profile
              </CardTitle>
              <CardDescription>
                Your account information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {user?.email ? getInitials(user.email) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Profile Picture</p>
                  <p className="text-sm text-muted-foreground">
                    Avatar customization coming soon
                  </p>
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Your email address is used for authentication and cannot be changed here.
                </p>
              </div>

              {/* User ID (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="user-id">User ID</Label>
                <Input
                  id="user-id"
                  type="text"
                  value={user?.id || ''}
                  disabled
                  className="bg-muted font-mono text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings Link */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notifications
              </CardTitle>
              <CardDescription>
                Manage how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link href="/portal/settings/notifications">
                  Configure Notification Preferences
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Coming Soon Sections */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-muted-foreground" />
                Additional Settings
              </CardTitle>
              <CardDescription>
                More configuration options coming soon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Workspace settings</li>
                <li>• Billing & subscription management</li>
                <li>• API keys & integrations</li>
                <li>• Data export & privacy controls</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </PortalLayout>
  );
}
