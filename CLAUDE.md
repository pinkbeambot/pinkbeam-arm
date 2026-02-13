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

No test framework is configured yet.

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5** (strict mode)
- **Tailwind CSS 4** via `@tailwindcss/postcss`
- **Supabase**: PostgreSQL (14 tables with RLS), Auth, Realtime (WebSocket), Edge Functions, Storage
- **UI**: 52 shadcn/ui components in `src/components/ui/` with barrel export at `src/components/ui/index.ts`

## Architecture

### Multi-Tenancy

Every database table has `tenant_id`. RLS policies enforce tenant isolation via `current_setting('app.current_tenant')`. Service role key bypasses RLS for Edge Functions. Context is set via `set_tenant_context(tenant_id)` stored procedure.

### Agent Hierarchy

Agents form a tree: humans are root (depth 0), agents spawn child agents. Roles: `ceo | manager | worker | specialist | system`. Each role has specific capabilities (`spawn`, `delegate`, `decide`, `escalate`, `access_external`, `modify_config`). See `docs/AGENT-PROTOCOL.md` for the full AAP spec.

### Event-Driven Design

All state changes on agents, tasks, decisions, and escalations fire the `log_activity()` trigger, creating records in the `activities` table. Supabase Realtime publishes changes on channels like `tenant:{id}`, `tenant:{id}:agents`, `agent:{id}`.

### Database Schema (14 tables)

Core tables: `tenants`, `users`, `agents`, `tasks`, `task_dependencies`, `decisions`, `escalations`, `activities`, `messages`, `agent_sessions`, `analytics_daily`, `files`, `agent_presence`. Migrations live in `supabase/migrations/001-005`. Key stored functions: `get_agent_descendants()`, `get_task_chain()`, `rollup_daily_analytics()`, `calculate_escalation_sla()`.

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

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Client-side (RLS-enforced)
SUPABASE_SERVICE_ROLE_KEY      # Server-side (bypasses RLS)
NEXT_PUBLIC_APP_URL            # App URL (default: http://localhost:3000)
```

## Key Documentation

- `docs/ARCHITECTURE.md` — System architecture, data flow, technology choices
- `docs/AGENT-PROTOCOL.md` — AAP spec: agent identity, lifecycle states, message types, decision authority matrix
- `docs/PRD.md` — Full product requirements, personas, feature phases
- `docs/STATUS.md` — Current development status and engineering queue

## Development Status

Foundation phase complete (schema, migrations, UI components). Currently building toward Phase 2: dashboard shells, agent roster, activity feed, and auth integration.
