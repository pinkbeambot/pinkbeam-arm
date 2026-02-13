import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600">
                <span className="text-white font-bold text-sm">PB</span>
              </div>
              <span className="font-bold text-xl">Pink Beam</span>
            </div>
            <nav className="flex items-center gap-4">
              <Link href="/portal" className="text-sm text-muted-foreground hover:text-foreground">
                Portal
              </Link>
              <Button asChild>
                <Link href="/portal">Enter Portal</Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section className="py-20 md:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
              </span>
              Powered by VALIS
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Your AI Workforce,
              <br />
              <span className="text-gradient-beam">Managed.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Deploy, monitor, and scale your AI agent workforce from a single command center. 
              The future of work is autonomous.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/portal">Enter the Portal</Link>
              </Button>
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 bg-muted/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-6 bg-card rounded-xl border">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-primary font-bold">01</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Agent Roster</h3>
                <p className="text-muted-foreground">Manage your entire AI workforce from one dashboard.</p>
              </div>
              <div className="p-6 bg-card rounded-xl border">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-primary font-bold">02</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Task Pipeline</h3>
                <p className="text-muted-foreground">Orchestrate complex workflows across multiple agents.</p>
              </div>
              <div className="p-6 bg-card rounded-xl border">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-primary font-bold">03</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Real-time Monitor</h3>
                <p className="text-muted-foreground">Watch your agents work with live activity feeds.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600">
                <span className="text-white font-bold text-xs">PB</span>
              </div>
              <span className="font-semibold text-sm">Pink Beam</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 Pink Beam. Powered by VALIS.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
