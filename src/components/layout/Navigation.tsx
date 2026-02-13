"use client";

import * as React from "react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X, User, LogOut, Users, Globe, Code2, Lightbulb, ChevronDown, Home, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { NotificationBell } from "@/components/notifications/NotificationBell";

// Service configuration
const services = [
  {
    id: "agents",
    name: "Agents",
    description: "AI employees for your business",
    icon: Users,
    href: "/agents",
    color: "#FF006E",
    bgColor: "bg-pink-500",
    textColor: "text-pink-500",
    borderColor: "border-pink-500/30",
    bgHover: "hover:bg-pink-500/10",
  },
  {
    id: "web",
    name: "Web",
    description: "Website & SEO services",
    icon: Globe,
    href: "/web",
    color: "#8B5CF6",
    bgColor: "bg-violet-500",
    textColor: "text-violet-400",
    borderColor: "border-violet-500/30",
    bgHover: "hover:bg-violet-500/10",
  },
  {
    id: "labs",
    name: "Labs",
    description: "Custom software development",
    icon: Code2,
    href: "/labs",
    color: "#06B6D4",
    bgColor: "bg-cyan-500",
    textColor: "text-cyan-500",
    borderColor: "border-cyan-500/30",
    bgHover: "hover:bg-cyan-500/10",
  },
  {
    id: "solutions",
    name: "Solutions",
    description: "Strategic consulting",
    icon: Lightbulb,
    href: "/solutions",
    color: "#F59E0B",
    bgColor: "bg-amber-500",
    textColor: "text-amber-500",
    borderColor: "border-amber-500/30",
    bgHover: "hover:bg-amber-500/10",
  },
];

// Employee configuration for Agents
const employees = [
  { id: "sdr", name: "Mike", role: "SDR", href: "/agents/employees/sdr" },
  { id: "researcher", name: "Sarah", role: "Researcher", href: "/agents/employees/researcher" },
  { id: "support", name: "Alex", role: "Support", href: "/agents/employees/support" },
  { id: "content", name: "Casey", role: "Content", href: "/agents/employees/content" },
  { id: "designer", name: "LUMEN", role: "Designer", href: "/agents/employees/designer" },
  { id: "video", name: "FLUX", role: "Video", href: "/agents/employees/video" },
];

// Solutions services configuration
const solutionsServices = [
  { id: "ai-strategy", name: "AI Strategy", href: "/solutions/services/ai-strategy" },
  { id: "digital-transformation", name: "Digital Transformation", href: "/solutions/services/digital-transformation" },
  { id: "technology-advisory", name: "Technology Advisory", href: "/solutions/services/technology-architecture" },
  { id: "growth-strategy", name: "Growth Strategy", href: "/solutions/services/growth-strategy" },
];

// Detect current service from pathname
function useCurrentService() {
  const pathname = usePathname();

  if (pathname?.startsWith("/agents")) return services.find(s => s.id === "agents") || null;
  if (pathname?.startsWith("/web")) return services.find(s => s.id === "web") || null;
  if (pathname?.startsWith("/labs")) return services.find(s => s.id === "labs") || null;
  if (pathname?.startsWith("/solutions")) return services.find(s => s.id === "solutions") || null;

  return null; // Launchpad / homepage
}

// Detect contextual dropdown based on pathname
function useContextualDropdown() {
  const pathname = usePathname();

  // Agents employees
  if (pathname?.startsWith("/agents/employees/")) {
    const currentEmployee = employees.find(e => pathname.includes(e.id));
    return {
      type: "employees",
      label: "Employees",
      current: currentEmployee,
      items: employees,
    };
  }

  // Solutions services
  if (pathname?.startsWith("/solutions/services/")) {
    const currentService = solutionsServices.find(s => pathname.includes(s.id));
    return {
      type: "solutions-services",
      label: "Services",
      current: currentService,
      items: solutionsServices,
    };
  }

  return null;
}

// Logo component - links to launchpad
function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-beam">
        <span className="text-white font-display font-bold text-sm">PB</span>
        <div className="absolute inset-0 rounded-lg bg-gradient-beam blur-md opacity-50" />
      </div>
      <span className="font-display font-bold text-xl tracking-tight whitespace-nowrap">
        <span className="text-gradient-beam">Pink</span>
        <span className="text-foreground"> Beam</span>
      </span>
    </Link>
  );
}

// Service Switcher Component
function ServiceSwitcher({ currentService }: { currentService: typeof services[0] | null }) {
  const [open, setOpen] = useState(false);
  
  if (!currentService) {
    // On launchpad - show services dropdown
    return (
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-muted/50 hover:bg-muted transition-colors text-sm font-medium outline-none focus:ring-2 focus:ring-ring">
          <span className="text-muted-foreground">Services</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Pink Beam Services
          </div>
          {services.map((service) => (
            <DropdownMenuItem key={service.id} asChild>
              <Link href={service.href} className="flex items-center gap-3 cursor-pointer">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", service.bgColor)}>
                  <service.icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{service.name}</p>
                  <p className="text-xs text-muted-foreground">{service.description}</p>
                </div>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  
  // On a service page - show service badge + switcher
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors outline-none focus:ring-2 focus:ring-ring",
        currentService.borderColor,
        currentService.bgHover,
        "bg-opacity-10"
      )}>
        <span className={currentService.textColor}>{currentService.name}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Switch Service
        </div>
        <DropdownMenuItem asChild>
          <Link href="/" className="flex items-center gap-3 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-gradient-beam flex items-center justify-center">
              <Home className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Launchpad</p>
              <p className="text-xs text-muted-foreground">Back to home</p>
            </div>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {services
          .filter(s => s.id !== currentService.id)
          .map((service) => (
            <DropdownMenuItem key={service.id} asChild>
              <Link href={service.href} className="flex items-center gap-3 cursor-pointer">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", service.bgColor)}>
                  <service.icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{service.name}</p>
                  <p className="text-xs text-muted-foreground">{service.description}</p>
                </div>
              </Link>
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Contextual Dropdown - shows different dropdowns based on route
function ContextualDropdown() {
  const contextual = useContextualDropdown();
  const currentService = useCurrentService();

  if (!contextual) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors outline-none focus:ring-2 focus:ring-ring",
        currentService?.borderColor || "border-border",
        currentService?.bgHover || "hover:bg-muted",
        "bg-opacity-10"
      )}>
        <span className={currentService?.textColor || "text-foreground"}>
          {contextual.current?.name || contextual.label}
        </span>
        <ChevronDown className="w-3.5 h-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {contextual.label}
        </div>
        {contextual.items.map((item: any) => (
          <DropdownMenuItem key={item.id} asChild>
            <Link href={item.href} className="flex items-center gap-3 cursor-pointer">
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                {item.role && <p className="text-xs text-muted-foreground">{item.role}</p>}
              </div>
              {contextual.current?.id === item.id && (
                <div className="w-1.5 h-1.5 rounded-full bg-gradient-beam" />
              )}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Back Button - goes up one directory level
function BackButton() {
  const pathname = usePathname();
  const currentService = useCurrentService();

  // Don't show on homepage
  if (!pathname || pathname === "/") return null;

  // Calculate parent path
  const segments = pathname.split("/").filter(Boolean);
  const parentPath = segments.length > 1
    ? "/" + segments.slice(0, -1).join("/")
    : "/";

  return (
    <Link
      href={parentPath}
      className="hidden lg:flex items-center justify-center w-8 h-8 rounded-full border border-border hover:bg-muted transition-colors"
      title="Go back"
    >
      <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground" />
    </Link>
  );
}

// User Avatar Dropdown Component
function UserDropdown({ user, onSignOut }: { user: SupabaseUser; onSignOut: () => void }) {
  const initials = user.email?.charAt(0).toUpperCase() || "U";
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-gradient-beam text-white text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuItem asChild>
          <Link href="/portal">
            <User className="mr-2 h-4 w-4" />
            Portal
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Mobile Navigation
function MobileNav({ 
  user, 
  onSignOut, 
  currentService 
}: { 
  user: SupabaseUser | null; 
  onSignOut: () => void;
  currentService: typeof services[0] | null;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild className="lg:hidden">
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(100%,320px)] sm:w-80">
        <SheetHeader>
          <SheetTitle>
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-beam">
                <span className="text-white font-display font-bold text-sm">PB</span>
              </div>
              <span className="font-display font-bold text-xl">
                <span className="text-gradient-beam">Pink</span>
                <span className="text-foreground"> Beam</span>
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-8 space-y-6">
          {/* Service Section */}
          {currentService && (
            <div className="p-4 rounded-xl border bg-muted/50">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Current Service</p>
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", currentService.bgColor)}>
                  <currentService.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold">{currentService.name}</p>
                  <p className="text-xs text-muted-foreground">{currentService.description}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Services List */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground px-2">
              {currentService ? "Switch Service" : "Services"}
            </p>
            {!currentService && (
              <SheetClose asChild>
                <Link
                  href="/"
                  className="flex items-center gap-3 px-2 py-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-beam flex items-center justify-center">
                    <Home className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Launchpad</p>
                    <p className="text-xs text-muted-foreground">Platform home</p>
                  </div>
                </Link>
              </SheetClose>
            )}
            {currentService && (
              <SheetClose asChild>
                <Link
                  href="/"
                  className="flex items-center gap-3 px-2 py-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-beam flex items-center justify-center">
                    <Home className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Back to Launchpad</p>
                    <p className="text-xs text-muted-foreground">Platform home</p>
                  </div>
                </Link>
              </SheetClose>
            )}
            {services
              .filter(s => s.id !== currentService?.id)
              .map((service) => (
                <SheetClose key={service.id} asChild>
                  <Link
                    href={service.href}
                    className="flex items-center gap-3 px-2 py-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", service.bgColor)}>
                      <service.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-xs text-muted-foreground">{service.description}</p>
                    </div>
                  </Link>
                </SheetClose>
              ))}
          </div>
          
          {/* Other Links */}
          <div className="space-y-1">
            <SheetClose asChild>
              <Link
                href="/about"
                className="block px-2 py-3 text-lg font-medium hover:bg-muted rounded-lg transition-colors"
              >
                About
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link
                href="/contact"
                className="block px-2 py-3 text-lg font-medium hover:bg-muted rounded-lg transition-colors"
              >
                Contact
              </Link>
            </SheetClose>
          </div>

          {/* CTA Section */}
          {!user && (
            <div className="space-y-3 pt-4 border-t">
              <SheetClose asChild>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/sign-in">Sign in</Link>
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button className="w-full bg-gradient-beam hover:opacity-90" asChild>
                  <Link href={currentService ? `${currentService.href}#pricing` : "/sign-up"}>
                    Get Started
                  </Link>
                </Button>
              </SheetClose>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Main Navigation Component
export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const currentService = useCurrentService();
  const supabase = createClient();

  // Check auth status
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Handle scroll for sticky header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/50"
          : "bg-transparent"
      )}
    >
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Left: Logo + Service Switcher + Contextual Dropdown + Back Button */}
          <div className="flex items-center gap-3">
            <Logo />
            <div className="hidden lg:block">
              <ServiceSwitcher currentService={currentService} />
            </div>
            <div className="hidden lg:block">
              <ContextualDropdown />
            </div>
            <div className="hidden lg:block">
              <BackButton />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            
            {user ? (
              <>
                <NotificationBell />
                <UserDropdown user={user} onSignOut={handleSignOut} />
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button size="sm" className="bg-gradient-beam hover:opacity-90" asChild>
                  <Link href={currentService ? `${currentService.href}#pricing` : "/sign-up"}>
                    Get Started
                  </Link>
                </Button>
              </div>
            )}

            {/* Mobile menu */}
            <MobileNav user={user} onSignOut={handleSignOut} currentService={currentService} />
          </div>
        </div>
      </nav>
    </header>
  );
}
