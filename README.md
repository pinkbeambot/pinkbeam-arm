# Pink Beam ARM — Agent Relationship Management Platform

> **The command center for AI-native businesses.** Built with Next.js 15, Supabase, and VALIS.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)

---

## 🎯 Overview

Pink Beam ARM is a native **Agent Relationship Management** platform designed for solopreneurs and small teams running AI-native businesses. Manage your AI agent workforce with hierarchical spawning, real-time activity feeds, comprehensive decision logging, and an intuitive dashboard interface.

### Key Features

- 🤖 **Agent Management** — Create, configure, and manage AI agents with hierarchical relationships
- 📋 **Task Pipeline** — Kanban-style task management with dependencies and progress tracking
- ⚡ **Real-Time Activity** — Live activity feed with WebSocket-powered updates
- 📊 **Decision Audit Trail** — Every decision logged with reasoning for full transparency
- 🚨 **Escalation Inbox** — Human-in-the-loop for critical decisions and edge cases
- 💬 **Agent Messaging** — A2A (agent-to-agent) communication protocol
- 📈 **Analytics Dashboard** — Performance metrics, cost tracking, and ROI analysis
- 🔐 **Multi-Tenancy** — Secure workspace isolation with row-level security

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ 
- npm 10+
- Git
- Supabase account (free tier works)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/pinkbeam/arm.git
cd arm

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local

# 4. Edit .env.local with your Supabase credentials
#    Get these from your Supabase project dashboard
```

### Environment Setup

Get your Supabase credentials from [Supabase Dashboard](https://supabase.com/dashboard):

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Setup

```bash
# Run migrations (using Supabase CLI)
supabase migration up

# Or apply migrations via Supabase Dashboard
# Go to: SQL Editor → New Query → Paste migration files
```

### Development Server

```bash
# Start the development server
npm run dev

# Open http://localhost:3000
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [User Guide](./docs/USER-GUIDE.md) | Getting started, feature walkthroughs, FAQ |
| [API Documentation](./docs/API.md) | Complete REST API reference |
| [Developer Guide](./docs/DEVELOPER-GUIDE.md) | Contributing, code style, testing |
| [Architecture](./docs/ARCHITECTURE.md) | System architecture and data flows |
| [Deployment](./docs/DEPLOYMENT.md) | Production deployment procedures |
| [Environment Variables](./docs/ENVIRONMENT.md) | Complete environment variable reference |
| [Database Setup](./docs/DATABASE.md) | Database schema and setup guide |

---

## 🏗️ Project Structure

```
arm/
├── app/                        # Next.js App Router
│   ├── (dashboard)/            # Dashboard layout & pages
│   ├── (auth)/                 # Authentication pages
│   └── api/                    # API routes
│       ├── agents/             # Agent management endpoints
│       ├── tasks/              # Task management endpoints
│       ├── decisions/          # Decision logging endpoints
│       ├── escalations/        # Escalation endpoints
│       ├── activities/         # Activity feed endpoints
│       └── analytics/          # Analytics endpoints
├── src/
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitives (52 components)
│   │   ├── animations/         # Framer Motion wrappers
│   │   ├── layout/             # Layout components
│   │   ├── dashboard/          # Dashboard-specific components
│   │   ├── agents/             # Agent components
│   │   ├── tasks/              # Task components
│   │   ├── chat/               # Chat interface components
│   │   └── escalations/        # Escalation components
│   ├── lib/
│   │   ├── supabase/           # Supabase clients
│   │   ├── utils.ts            # Utility functions
│   │   └── auth/               # Authentication utilities
│   ├── hooks/                  # Custom React hooks
│   └── types/                  # TypeScript types
├── supabase/
│   ├── migrations/             # Database migrations
│   ├── functions/              # Edge Functions
│   └── seed/                   # Seed data
├── docs/                       # Documentation
└── src/__tests__/              # Test suite
    ├── unit/                   # Unit tests
    ├── integration/            # Integration tests
    ├── e2e/                    # E2E tests
    └── visual/                 # Visual regression tests
```

---

## 🧪 Testing

```bash
# Run all tests
npm run test

# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui

# Visual regression tests
npm run test:visual

# Coverage report
npm run test:coverage

# Lighthouse performance audit
npm run lighthouse
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, React 19, TypeScript 5 |
| **Styling** | Tailwind CSS 4, Framer Motion |
| **UI Components** | shadcn/ui (52 primitives) |
| **Backend** | Next.js API Routes, Supabase Edge Functions |
| **Database** | PostgreSQL 15 (Supabase) |
| **Auth** | Supabase Auth (OTP-based) |
| **Realtime** | Supabase Realtime (WebSocket) |
| **Testing** | Vitest, Playwright, React Testing Library |
| **Hosting** | Vercel |

---

## 🔐 Authentication

Pink Beam uses OTP (One-Time Password) authentication:

1. Enter your email on the login page
2. Receive a 6-digit code via email
3. Enter the code to authenticate
4. Session is created and stored securely

For local development, you can enable `DEV_AUTH_BYPASS=true` (never in production).

---

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:e2e:ui` | Run E2E tests with UI |
| `npm run test:visual` | Run visual regression tests |
| `npm run lighthouse` | Run Lighthouse performance audit |
| `npm run analyze` | Analyze bundle size |

---

## 🚢 Deployment

### Staging (Auto-Deploy)
- Every merge to `main` auto-deploys to staging
- URL: `https://staging.pinkbeam-arm.vercel.app`

### Production (Manual)
- Tagged releases deploy to production
- URL: `https://pinkbeam-arm.vercel.app`
- Only CTO can deploy to production

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed procedures.

---

## 🤝 Contributing

We welcome contributions! Please see our [Developer Guide](./docs/DEVELOPER-GUIDE.md) for:
- Code style guidelines
- Testing requirements
- Pull request process
- Development workflow

---

## 📝 License

Proprietary — Pink Beam

---

## 💬 Support

- 📧 Email: support@pinkbeam.ai
- 📖 Documentation: [docs/](./docs/)
- 🐛 Issues: [GitHub Issues](https://github.com/pinkbeam/arm/issues)

---

## 🔗 Quick Links

- [Architecture Overview](./docs/ARCHITECTURE.md)
- [API Reference](./docs/API.md)
- [Agent Protocol](./docs/AGENT-PROTOCOL.md)
- [Product Requirements](./docs/PRD.md)
- [Testing Standards](./docs/TESTING-STANDARDS.md)

---

<p align="center">
  Built with ❤️ by the Pink Beam team
</p>
