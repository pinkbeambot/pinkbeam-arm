import { PortalLayout, PageContainer, PageHeader } from "@/components/dashboard/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function ChatPage() {
  return (
    <PortalLayout>
      <PageContainer>
        <PageHeader
          title="Chat"
          description="Communicate with your AI workforce."
        />
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Team Chat
            </CardTitle>
            <CardDescription>
              Real-time messaging with your agents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground">Chat coming soon</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Team messaging will be available in the next release.
              </p>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    </PortalLayout>
  );
}
