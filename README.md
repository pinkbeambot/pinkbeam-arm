# Pink Beam — Agent Relationship Management

> The command center for AI-native businesses. Built with Next.js 15, Supabase, and VALIS.

## Brand
- **Platform:** Pink Beam
- **AI Engine:** VALIS (Vast Active Living Intelligence System)

## Stack
- **Frontend:** Next.js 15, React 19, Tailwind CSS 4, TypeScript
- **Backend:** Supabase (PostgreSQL, Auth, Realtime WebSockets, Edge Functions)
- **AI Runtime:** Native agent runtime with nested spawning
- **Hosting:** Vercel

## Project Structure
```
arm/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Main ARM dashboard
│   ├── (auth)/             # Sign in/up
│   └── api/                # API routes
├── src/
│   ├── components/
│   │   ├── ui/             # shadcn/ui primitives
│   │   ├── animations/     # Framer Motion wrappers
│   │   ├── layout/         # Container, Section, etc.
│   │   ├── dashboard/      # Dashboard-specific components
│   │   ├── agents/         # Agent-related components
│   │   ├── tasks/          # Task pipeline components
│   │   ├── chat/           # Chat interface components
│   │   └── escalations/    # Escalation inbox components
│   ├── lib/
│   │   ├── supabase/       # Supabase clients
│   │   ├── utils.ts        # Utilities (cn, etc.)
│   │   └── ...
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript types
│   └── utils/              # Helper functions
├── supabase/
│   ├── migrations/         # Database migrations
│   ├── functions/          # Edge Functions
│   └── seed/               # Seed data
├── docs/                   # Documentation
└── tests/                  # Test suite
```

## Getting Started
```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with Supabase credentials

# Run dev server
npm run dev
```

## Development Status
🚀 **Active Development** — See project status in agent workspaces

## License
Proprietary — Pink Beam
