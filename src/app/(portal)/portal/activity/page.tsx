import { ActivityFeed } from "@/components/dashboard/activity";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activity Feed - ARM",
  description: "Real-time stream of agent activity",
};

export default function ActivityFeedPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Activity Feed</h1>
        <p className="text-muted-foreground mt-1">
          Real-time stream of everything happening in your AI workforce
        </p>
      </div>
      
      <ActivityFeed 
        className="w-full"
        showFilters={true}
        maxHeight="calc(100vh - 200px)"
        realtime={true}
      />
    </div>
  );
}
