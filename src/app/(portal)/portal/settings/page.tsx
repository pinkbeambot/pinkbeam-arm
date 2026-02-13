import { DashboardLayout, PageContainer, PageHeader } from "@/components/dashboard/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <PageContainer>
        <PageHeader
          title="Settings"
          description="Configure your portal preferences."
        />
        
        <div className="grid gap-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                General Settings
              </CardTitle>
              <CardDescription>
                Manage your account and portal configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Settings className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground">Settings coming soon</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Configuration options will be available in the next release.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </DashboardLayout>
  );
}
