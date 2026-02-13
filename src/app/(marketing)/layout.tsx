import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pink Beam ARM - Agent Relationship Management",
  description: "Build your AI workforce with Pink Beam. Hire autonomous AI employees for research, sales, support, and creative work.",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
