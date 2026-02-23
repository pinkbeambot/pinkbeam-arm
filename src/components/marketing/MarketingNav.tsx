"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/agents", label: "AI Employees" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

export function MarketingNav() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === "/" && pathname === "/") return true;
    if (href !== "/" && pathname?.startsWith(href)) return true;
    return false;
  };

  return (
    <header className={cn("fixed top-0 left-0 right-0 z-50 transition-all duration-300", isScrolled ? "bg-background/90 backdrop-blur-xl border-b border-border/50 shadow-sm" : "bg-transparent")}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 group-hover:shadow-lg group-hover:shadow-pink-500/25 transition-all duration-300">
              <span className="text-white font-bold text-sm">PB</span>
            </div>
            <span className={cn("font-bold text-xl transition-colors", isScrolled ? "text-foreground" : "text-white")}>Pink Beam</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={cn("px-4 py-2 text-sm rounded-lg transition-colors", isActive(link.href) ? "text-foreground font-medium bg-muted/80" : isScrolled ? "text-muted-foreground hover:text-foreground hover:bg-muted/50" : "text-white/70 hover:text-white hover:bg-white/10")}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/contact" className={cn("hidden sm:block text-sm transition-colors", isScrolled ? "text-muted-foreground hover:text-foreground" : "text-white/80 hover:text-white")}>Contact</Link>
            <Link href="/auth" className="hidden sm:block">
              <Button size="sm" className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-lg shadow-pink-500/30">Get Started</Button>
            </Link>

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" aria-label="Open menu" className={isScrolled ? "" : "text-white hover:bg-white/10"}>
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
                      <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} className={cn("px-4 py-3 text-base rounded-lg transition-colors", isActive(link.href) ? "text-foreground font-medium bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
                        {link.label}
                      </Link>
                    ))}
                    <hr className="my-4 border-border" />
                    <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-base rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">Contact</Link>
                  </nav>

                  <div className="pt-4 border-t border-border space-y-3">
                    <Link href="/auth" onClick={() => setMobileMenuOpen(false)} className="block w-full">
                      <Button className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-lg shadow-pink-500/30">Get Started</Button>
                    </Link>
                    <p className="text-xs text-center text-muted-foreground">Free 7-day trial • No credit card required</p>
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
