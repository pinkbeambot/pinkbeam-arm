# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pink Beam ARM (Agent Relationship Management) — a command center for managing AI agent workforces. Built for solopreneurs running AI-native businesses. Multi-tenant, event-driven, with hierarchical agent spawning and real-time activity feeds.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint (flat config, Next.js + TypeScript rules)
```

```bash
npm run test                # Vitest (unit tests)
npm run test:watch          # Vitest watch mode
npm run test:coverage       # Vitest with coverage report
npm run test:e2e            # Playwright e2e tests
npm run test:e2e:ui         # Playwright UI mode (debugging)
npm run test:e2e:headed     # Playwright with visible browser
npm run test:visual         # Visual regression tests
npm run test:visual:update  # Update visual baselines
npm run lighthouse          # Performance audits
npm run analyze             # Bundle size analysis
```

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5** (strict mode)
- **Tailwind CSS 4** via `@tailwindcss/postcss`
- **Supabase**: PostgreSQL (33 migrations with RLS), Auth (OTP magic code), Realtime (WebSocket), Edge Functions, Storage
- **Resend**: Transactional emails. Client at `src/lib/resend.ts`, templates in `src/lib/emails/`. Server-side only (`RESEND_API_KEY`, no `NEXT_PUBLIC_` prefix).
- **UI**: 52 shadcn/ui components in `src/components/ui/` with barrel export at `src/components/ui/index.ts`
- **Testing**: Vitest (unit) + Playwright (e2e + visual regression)

## Architecture

### Multi-Tenancy

Every database table has `tenant_id`. RLS policies enforce tenant isolation via `current_setting('app.current_tenant')`. Service role key bypasses RLS for Edge Functions. Context is set via `set_tenant_context(tenant_id)` stored procedure.

### Agent Hierarchy

Agents form a tree: humans are root (depth 0), agents spawn child agents. Roles: `ceo | manager | worker | specialist | system`. Each role has specific capabilities (`spawn`, `delegate`, `decide`, `escalate`, `access_external`, `modify_config`). See `docs/AGENT-PROTOCOL.md` for the full AAP spec.

### Event-Driven Design

All state changes on agents, tasks, decisions, and escalations fire the `log_activity()` trigger, creating records in the `activities` table. Supabase Realtime publishes changes on channels like `tenant:{id}`, `tenant:{id}:agents`, `agent:{id}`.

### Database Schema

Core tables: `tenants`, `users`, `agents`, `tasks`, `task_dependencies`, `decisions`, `escalations`, `activities`, `messages`, `agent_sessions`, `analytics_daily`, `files`, `agent_presence`. Migrations live in `supabase/migrations/` (33 migrations total). Key stored functions: `get_agent_descendants()`, `get_task_chain()`, `rollup_daily_analytics()`, `calculate_escalation_sla()`.

### Key Enums

- `agent_status`: initializing, idle, active, paused, blocked, error, escaped, terminated
- `task_status`: queued, in_progress, blocked, review, completed, failed, cancelled
- `task_priority`: low, normal, high, urgent
- `decision_status`: proposed, approved, rejected, overridden, executed
- `escalation_urgency`: low, normal, high, critical

## Code Conventions

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

### Styling

Use `cn()` from `@/lib/utils` for conditional class merging (clsx + tailwind-merge). The Button component has a custom `beam` variant with Pink Beam branding (`shadow-beam`, `shadow-glow-pink-md`). Global CSS vars `--background` and `--foreground` support light/dark mode via `prefers-color-scheme`.

### Component Patterns

- Import UI components from `@/components/ui` (barrel export)
- Utility functions in `@/lib/utils.ts`: `cn()`, `formatCurrency()`, `formatDate()`, `formatDuration()`
- Component directories: `components/dashboard/`, `components/agents/`, `components/tasks/`, `components/chat/`, `components/escalations/`

### Auth Flow

OTP-based (no magic links). User enters email → receives 6-digit code → enters code in same tab → session created client-side → `/api/auth/initialize` creates tenant + user for new signups. Auth provider at `src/components/auth/AuthProvider.tsx`.

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Client-side (RLS-enforced)
SUPABASE_SERVICE_ROLE_KEY      # Server-side (bypasses RLS)
NEXT_PUBLIC_APP_URL            # App URL (default: http://localhost:3000)
RESEND_API_KEY                 # Server-side only — transactional emails
STRIPE_SECRET_KEY              # Stripe API key (test: sk_test_...)
STRIPE_WEBHOOK_SECRET          # Stripe webhook signing secret
DEV_AUTH_BYPASS                # Local dev convenience — bypasses auth in middleware (NEVER in production)
```

## Key Documentation

- `docs/ARCHITECTURE.md` — System architecture, data flow, technology choices
- `docs/AGENT-PROTOCOL.md` — AAP spec: agent identity, lifecycle states, message types, decision authority matrix
- `docs/PRD.md` — Full product requirements, personas, feature phases
- `docs/STATUS.md` — Current development status and engineering queue

### API Route Pattern

All protected API routes use `authenticateRequest()` from `@/lib/api/auth`. Returns `{ tenantId, userId, supabase }` (service role client). Always filter queries by `tenant_id`. Validate request bodies with Zod.

## Testing

### E2E Testing

E2E tests authenticate via the real Supabase OTP flow using Playwright's setup project pattern. The `setup` project (`src/__tests__/e2e/auth.setup.ts`) runs first, authenticates a persistent test user (`e2e-test@pinkbeam-test.com`) via `admin.generateLink()`, and saves session cookies to `.playwright/.auth/user.json`. Other test projects declare `dependencies: ['setup']` and use the `authenticatedPage` fixture which loads this storageState. Requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables.

## Development Status

Foundation phase complete (schema, migrations, UI components, auth). Currently building toward Phase 2: dashboard shells, agent roster, activity feed, and email notifications.
