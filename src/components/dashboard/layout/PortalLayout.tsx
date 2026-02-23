'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Bot,
  Activity,
  Kanban,
  Brain,
  AlertCircle,
  BarChart3,
  Settings,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Zap,
  LogOut,
  Loader2,
  Sparkles,
  Users,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/components/auth/AuthProvider';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { ConnectionStatus } from '@/components/realtime/ConnectionStatus';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useBrowserNotifications } from '@/lib/hooks/useBrowserNotifications';
import { GlobalSearch } from '@/components/dashboard/GlobalSearch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================================================
// Mobile Navigation Items
// ============================================================================

const mobileNavItems = [
  { label: 'Dashboard', href: '/portal', icon: LayoutDashboard },
  { label: 'Agents', href: '/portal/agents', icon: Bot },
  { label: 'Tasks', href: '/portal/tasks', icon: Kanban },
  { label: 'Analytics', href: '/portal/analytics', icon: BarChart3 },
  { label: 'Chat', href: '/portal/chat', icon: MessageSquare },
];

// ============================================================================
// Portal Sidebar
// ============================================================================

interface PortalSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
  onNavClick?: () => void;
}

export function PortalSidebar({ 
  collapsed = false, 
  onToggle,
  className,
  onNavClick,
}: PortalSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const { error } = await signOut();
    
    if (!error) {
      router.push('/login');
    } else {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  const navItems = [
    { label: 'Dashboard', href: '/portal', icon: LayoutDashboard },
    { label: 'Agents', href: '/portal/agents', icon: Bot },
    { label: 'Tasks', href: '/portal/tasks', icon: Kanban },
    { label: 'Activity', href: '/portal/activity', icon: Activity },
    { label: 'Decisions', href: '/portal/decisions', icon: Brain },
    { label: 'Escalations', href: '/portal/escalations', icon: AlertCircle },
    { label: 'Performance', href: '/portal/performance', icon: BarChart3 },
    { label: 'Analytics', href: '/portal/analytics', icon: BarChart3 },
    { label: 'Chat', href: '/portal/chat', icon: MessageSquare },
  ];

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-border',
        'transition-all duration-300 ease-in-out flex flex-col',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Logo Section */}
      <div className="flex h-16 items-center px-4 border-b border-border flex-shrink-0">
        <Link href="/portal" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 flex-shrink-0 shadow-lg shadow-pink-500/20">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span className="font-bold text-sidebar-foreground">Pink Beam</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 px-2 pb-4 space-y-1 border-t border-border pt-4">
        <Link
          href="/portal/settings"
          onClick={onNavClick}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]',
            pathname?.startsWith('/portal/settings')
              ? 'bg-primary/10 text-primary'
              : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
          )}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 min-h-[44px] disabled:opacity-50"
        >
          {isLoggingOut ? (
            <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin" />
          ) : (
            <LogOut className="h-5 w-5 flex-shrink-0" />
          )}
          {!collapsed && <span>Logout</span>}
        </button>

        <div className="px-3 py-2">
          <ConnectionStatus state="connected" size="sm" showLabel={!collapsed} />
        </div>
      </div>
    </aside>
  );
}

// ============================================================================
// Mobile Navigation
// ============================================================================

interface MobileNavProps {
  onOpenMenu: () => void;
}

function MobileNav({ onOpenMenu }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border md:hidden">
      <div className="flex items-center justify-around h-16 pb-safe">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center min-w-[64px] min-h-[44px] rounded-lg',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </Link>
          );
        })}
        
        <button
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center min-w-[64px] min-h-[44px] rounded-lg text-muted-foreground"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">Menu</span>
        </button>
      </div>
    </nav>
  );
}

// ============================================================================
// Mobile Header
// ============================================================================

function MobileHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card/95 backdrop-blur-sm border-b border-border z-30 flex items-center px-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenMenu}
        className="mr-3 min-h-[44px] min-w-[44px]"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Link href="/portal" className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="font-bold text-base">Pink Beam</span>
      </Link>
      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
        <ThemeSwitcher />
      </div>
    </header>
  );
}

// ============================================================================
// Mobile Menu Sheet
// ============================================================================

interface MobileMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function MobileMenuSheet({ open, onOpenChange }: MobileMenuSheetProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const { error } = await signOut();
    if (!error) {
      router.push('/login');
    } else {
      setIsLoggingOut(false);
    }
  };

  const allNavItems = [
    { label: 'Dashboard', href: '/portal', icon: LayoutDashboard },
    { label: 'Agents', href: '/portal/agents', icon: Bot },
    { label: 'Templates', href: '/portal/templates', icon: LayoutGrid },
    { label: 'Tasks', href: '/portal/tasks', icon: Kanban },
    { label: 'Activity', href: '/portal/activity', icon: Activity },
    { label: 'Decisions', href: '/portal/decisions', icon: Brain },
    { label: 'Escalations', href: '/portal/escalations', icon: AlertCircle },
    { label: 'Performance', href: '/portal/performance', icon: BarChart3 },
    { label: 'Chat', href: '/portal/chat', icon: MessageSquare },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <div className="flex flex-col h-full">
          <div className="flex h-16 items-center px-4 border-b border-border">
            <Link href="/portal" className="flex items-center gap-3" onClick={() => onOpenChange(false)}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-foreground">Pink Beam</span>
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <div className="space-y-1">
              {allNavItems.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[48px]',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground/70 hover:text-foreground hover:bg-accent'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-border p-4 space-y-3">
            <ConnectionStatus state="connected" size="sm" showLabel />
            <Button variant="outline" className="w-full justify-start" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
              Logout
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// Portal Layout
// ============================================================================

interface PortalLayoutProps {
  children: React.ReactNode;
}

export function PortalLayout({ children }: PortalLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  useBrowserNotifications();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <PortalSidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Navigation */}
      <MobileNav onOpenMenu={() => setMobileMenuOpen(true)} />
      <MobileHeader onOpenMenu={() => setMobileMenuOpen(true)} />
      <MobileMenuSheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />

      {/* Main Content */}
      <main 
        className={cn(
          'transition-all duration-300 ease-in-out',
          'pt-14 pb-20 md:pt-0 md:pb-0',
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
        )}
      >
        <div className="min-h-[calc(100vh-3.5rem-5rem)] md:min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// Page Container
// ============================================================================

export function PageContainer({ 
  children,
  className 
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('p-4 sm:p-6', className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Page Header
// ============================================================================

export function PageHeader({ 
  title, 
  description,
  children,
  className 
}: { 
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-6 sm:mb-8', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">{description}</p>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
