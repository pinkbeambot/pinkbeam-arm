import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { DesignSystemProvider } from "@/components/design-system";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  Activity, 
  CheckSquare, 
  Brain, 
  AlertCircle, 
  MessageSquare,
  BarChart3,
  Settings
} from "lucide-react";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pink Beam ARM - Agent Relationship Management",
  description: "Command center for AI-native businesses",
};

// Sidebar navigation items
const sidebarItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Agent Roster", href: "/agents", icon: Users },
  { label: "Activity Feed", href: "/activity", icon: Activity },
  { label: "Task Pipeline", href: "/tasks", icon: CheckSquare },
  { label: "Decision Log", href: "/decisions", icon: Brain },
  { label: "Escalations", href: "/escalations", icon: AlertCircle, badge: 0 },
  { label: "Chat", href: "/chat", icon: MessageSquare },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

function Sidebar() {
  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-beam">
            <span className="text-white font-bold text-sm">PB</span>
          </div>
          <span className="font-bold text-lg">
            <span className="text-gradient-beam">ARM</span>
          </span>
        </Link>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {sidebarItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-subtle" />
          <span>System operational</span>
        </div>
      </div>
    </aside>
  );
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <DesignSystemProvider defaultTheme="system">
          <div className="flex h-screen bg-background">
            <Sidebar />
            <main className="flex-1 overflow-auto">
              <div className="p-6 max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
        </DesignSystemProvider>
      </body>
    </html>
  );
}
