"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/theme-switcher";

const navLinks = [
  { href: "/agents", label: "AI Employees" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function MarketingNav() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === "/" && pathname === "/") return true;
    if (href !== "/" && pathname?.startsWith(href)) return true;
    return false;
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 group-hover:shadow-lg group-hover:shadow-pink-500/25 transition-all duration-300">
              <span className="text-white font-bold text-sm">PB</span>
            </div>
            <span className="font-bold text-xl">Pink Beam</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2 text-sm rounded-lg transition-colors",
                  isActive(link.href)
                    ? "text-foreground font-medium bg-muted"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Auth Actions */}
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            {/* Desktop: Log In link + Get Started button */}
            <Link
              href="/auth"
              className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
            >
              Log In
            </Link>
            <Button 
              asChild 
              size="sm" 
              variant="beam"
              className="hidden sm:flex"
            >
              <Link href="/auth">
                Get Started
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[350px]">
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-8">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600">
                      <span className="text-white font-bold text-sm">PB</span>
                    </div>
                    <span className="font-bold text-xl">Pink Beam</span>
                  </div>

                  <nav className="flex flex-col gap-2 flex-1">
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "px-4 py-3 text-base rounded-lg transition-colors",
                          isActive(link.href)
                            ? "text-foreground font-medium bg-muted"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        {link.label}
                      </Link>
                    ))}

                    <hr className="my-4 border-border" />

                    <Link
                      href="/auth"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-4 py-3 text-base text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Log In
                    </Link>
                  </nav>

                  <div className="pt-4 border-t border-border space-y-3">
                    <Button asChild className="w-full" variant="beam">
                      <Link href="/auth" onClick={() => setMobileMenuOpen(false)}>
                        Get Started
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
