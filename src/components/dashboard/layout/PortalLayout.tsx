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
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';
import { ThemeSwitcher } from '@/components/theme-switcher';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const navItems: NavItem[] = [
  { label: 'Portal', href: '/portal', icon: LayoutDashboard },
  { label: 'Agent Roster', href: '/portal/agents', icon: Bot },
  { label: 'Activity Feed', href: '/portal/activity', icon: Activity },
  { label: 'Task Pipeline', href: '/portal/tasks', icon: Kanban },
  { label: 'Decision Log', href: '/portal/decisions', icon: Brain },
  { label: 'Escalations', href: '/portal/escalations', icon: AlertCircle, badge: 0 },
  { label: 'Live Metrics', href: '/portal/metrics', icon: Zap },
  { label: 'Performance', href: '/portal/performance', icon: BarChart3 },
  { label: 'Chat', href: '/portal/chat', icon: MessageSquare },
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

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-border',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Logo Section */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        <Link 
          href="/portal" 
          className={cn(
            'flex items-center gap-3 transition-opacity',
            collapsed && 'justify-center w-full'
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 flex-shrink-0">
            <span className="text-white font-bold text-sm">PB</span>
          </div>
          {!collapsed && (
            <span className="font-semibold text-sidebar-foreground">
              Pink Beam
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isActive 
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                  : 'text-sidebar-foreground/70',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-medium text-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings and Logout Section */}
      <div className="absolute bottom-16 left-0 right-0 px-2 space-y-1 border-t border-border pt-4">
        {/* Settings Link */}
        <Link
          href="/portal/settings"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            isSettingsActive 
              ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
              : 'text-sidebar-foreground/70',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="flex-1">Settings</span>}
        </Link>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={cn(
            'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            'text-sidebar-foreground/70 disabled:opacity-50 disabled:cursor-not-allowed',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Logout' : undefined}
        >
          {isLoggingOut ? (
            <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin" />
          ) : (
            <LogOut className="h-5 w-5 flex-shrink-0" />
          )}
          {!collapsed && <span className="flex-1">Logout</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <div className="absolute bottom-4 right-0 translate-x-1/2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full bg-background shadow-md border-border"
          onClick={onToggle}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
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
    <header className={cn('border-b border-border bg-card', className)}>
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
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 md:hidden',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <PortalSidebar className="relative" />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-30 flex items-center px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(true)}
          className="mr-4"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/portal" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600">
            <span className="text-white font-bold text-xs">PB</span>
          </div>
          <span className="font-semibold">Pink Beam</span>
        </Link>
      </div>

      {/* Main Content */}
      <main 
        className={cn(
          'transition-all duration-300',
          'pt-14 md:pt-0', // Mobile header offset
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
        )}
      >
        <div className="min-h-[calc(100vh-3.5rem)] md:min-h-screen">
          {children}
        </div>
      </main>
    </div>
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-muted-foreground">{description}</p>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-3">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
