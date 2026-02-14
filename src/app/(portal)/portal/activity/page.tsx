import { Metadata } from "next";
import { ActivityFeedPageClient } from "./ActivityFeedPageClient";

export const metadata: Metadata = {
  title: "Activity Feed - ARM",
  description: "Real-time stream of agent activity",
};

export default function ActivityFeedPage() {
  return <ActivityFeedPageClient />;
}
