import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Employees | Pink Beam ARM",
  description: "Meet your AI workforce. Hire autonomous AI employees for research, sales, support, content, design, and video production.",
};

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
