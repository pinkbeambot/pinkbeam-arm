import { PortalLayout, PageContainer, PageHeader } from "@/components/dashboard/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, WifiOff } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activity Feed - ARM",
  description: "Real-time stream of agent activity",
};

export default function ActivityFeedPage() {
  return (
    <PortalLayout>
      <PageContainer>
        <PageHeader
          title="Activity Feed"
          description="Real-time stream of everything happening in your AI workforce"
        />
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Activity feed coming soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <WifiOff className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground">Activity feed offline</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                The activity feed will be available once the backend API is connected.
              </p>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    </PortalLayout>
  );
}
