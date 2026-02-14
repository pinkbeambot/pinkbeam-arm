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
  Zap,
  LogOut,
  Loader2,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';
import { ThemeSwitcher } from '@/components/theme-switcher';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  description?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { 
        label: 'Dashboard', 
        href: '/portal', 
        icon: LayoutDashboard,
        description: 'Overview of your AI workforce'
      },
    ],
  },
  {
    label: 'Workforce',
    items: [
      { 
        label: 'Agent Roster', 
        href: '/portal/agents', 
        icon: Bot,
        description: 'Manage your AI agents'
      },
      { 
        label: 'Task Pipeline', 
        href: '/portal/tasks', 
        icon: Kanban,
        description: 'View and manage tasks'
      },
      { 
        label: 'Activity Feed', 
        href: '/portal/activity', 
        icon: Activity,
        description: 'Recent agent activities'
      },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { 
        label: 'Decision Log', 
        href: '/portal/decisions', 
        icon: Brain,
        description: 'Review agent decisions'
      },
      { 
        label: 'Escalations', 
        href: '/portal/escalations', 
        icon: AlertCircle, 
        badge: 0,
        description: 'Issues requiring attention'
      },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { 
        label: 'Live Metrics', 
        href: '/portal/metrics', 
        icon: Zap,
        description: 'Real-time performance'
      },
      { 
        label: 'Performance', 
        href: '/portal/performance', 
        icon: BarChart3,
        description: 'Historical analytics'
      },
    ],
  },
  {
    label: 'Communication',
    items: [
      { 
        label: 'Chat', 
        href: '/portal/chat', 
        icon: MessageSquare,
        description: 'Message your agents'
      },
    ],
  },
];

interface PortalSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}

export function PortalSidebar({ 
  collapsed = false, 
  onToggle,
  className 
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

  const isSettingsActive = pathname === '/portal/settings' || pathname?.startsWith('/portal/settings/');

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
    const Icon = item.icon;

    const linkContent = (
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
          'hover:bg-sidebar-accent/80',
          isActive 
            ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20' 
            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground',
          collapsed && 'justify-center px-2'
        )}
        title={collapsed ? item.label : undefined}
      >
        <div className={cn(
          'flex items-center justify-center rounded-md p-1 transition-colors',
          isActive ? 'bg-primary/10' : 'bg-transparent',
          collapsed && 'p-0'
        )}>
          <Icon className={cn(
            'h-5 w-5 flex-shrink-0 transition-colors',
            isActive ? 'text-primary' : 'text-sidebar-foreground/60'
          )} />
        </div>
        {!collapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className={cn(
                'flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold',
                isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-red-500 text-white'
              )}>
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
            {isActive && (
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {linkContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            <span>{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-border',
          'transition-all duration-300 ease-in-out flex flex-col',
          collapsed ? 'w-16' : 'w-64',
          className
        )}
      >
        {/* Logo Section */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border flex-shrink-0">
          <Link 
            href="/portal" 
            className={cn(
              'flex items-center gap-3 transition-opacity',
              collapsed && 'justify-center w-full'
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 flex-shrink-0 shadow-lg shadow-pink-500/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-sidebar-foreground leading-tight">
                  Pink Beam
                </span>
                <span className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider font-medium">
                  ARM Platform
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-6 overflow-y-auto scrollbar-thin">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              {!collapsed && (
                <h3 className="px-3 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-2">
                  {group.label}
                </h3>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Settings and Logout Section */}
        <div className="flex-shrink-0 px-2 pb-4 space-y-1 border-t border-border pt-4">
          {/* Settings Link */}
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  href="/portal/settings"
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    'hover:bg-sidebar-accent/80 justify-center px-2',
                    isSettingsActive 
                      ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20' 
                      : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
                  )}
                >
                  <Settings className={cn(
                    'h-5 w-5 flex-shrink-0',
                    isSettingsActive ? 'text-primary' : 'text-sidebar-foreground/60'
                  )} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="/portal/settings"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                'hover:bg-sidebar-accent/80',
                isSettingsActive 
                  ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20' 
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
              )}
            >
              <Settings className={cn(
                'h-5 w-5 flex-shrink-0',
                isSettingsActive ? 'text-primary' : 'text-sidebar-foreground/60'
              )} />
              <span className="flex-1">Settings</span>
              {isSettingsActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          )}

          {/* Logout Button */}
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    'hover:bg-sidebar-accent/80 justify-center px-2',
                    'text-sidebar-foreground/70 hover:text-sidebar-foreground disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {isLoggingOut ? (
                    <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-sidebar-foreground/60" />
                  ) : (
                    <LogOut className="h-5 w-5 flex-shrink-0 text-sidebar-foreground/60" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Logout</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={cn(
                'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                'hover:bg-sidebar-accent/80',
                'text-sidebar-foreground/70 hover:text-sidebar-foreground disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isLoggingOut ? (
                <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-sidebar-foreground/60" />
              ) : (
                <LogOut className="h-5 w-5 flex-shrink-0 text-sidebar-foreground/60" />
              )}
              <span className="flex-1">Logout</span>
            </button>
          )}
        </div>

        {/* Collapse Toggle */}
        <div className="flex-shrink-0 relative h-8">
          <div className="absolute bottom-4 right-0 translate-x-1/2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full bg-background shadow-md border-border hover:bg-accent hover:text-accent-foreground"
              onClick={onToggle}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}

// Backwards compatibility
export const DashboardSidebar = PortalSidebar;

interface PortalHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PortalHeader({ 
  title, 
  subtitle,
  children,
  className 
}: PortalHeaderProps) {
  return (
    <header className={cn('border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30', className)}>
      <div className="flex h-16 items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <ThemeSwitcher />
          {children}
        </div>
      </div>
    </header>
  );
}

// Backwards compatibility
export const DashboardHeader = PortalHeader;

interface PortalLayoutProps {
  children: React.ReactNode;
}

export function PortalLayout({ children }: PortalLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <PortalSidebar 
            collapsed={sidebarCollapsed} 
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <div className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:hidden',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          <PortalSidebar className="relative" />
        </div>

        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card/95 backdrop-blur-sm border-b border-border z-30 flex items-center px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="mr-4"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/portal" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 shadow-md shadow-pink-500/20">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold">Pink Beam</span>
          </Link>
        </div>

        {/* Main Content */}
        <main 
          className={cn(
            'transition-all duration-300 ease-in-out',
            'pt-14 md:pt-0', // Mobile header offset
            sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
          )}
        >
          <div className="min-h-[calc(100vh-3.5rem)] md:min-h-screen">
            {children}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

// Backwards compatibility
export const DashboardLayout = PortalLayout;

export function PageContainer({ 
  children,
  className 
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  );
}

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
    <div className={cn('mb-8', className)}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-muted-foreground max-w-2xl">{description}</p>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
