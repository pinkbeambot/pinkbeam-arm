---
title: Deployment Architecture
type: visual
tags: [visual, diagram, deployment, operations]
aliases: [CI/CD, DevOps]
---

# ARM Deployment Architecture

Pink Beam ARM is deployed across **Vercel** (application hosting) and **Supabase** (database, auth, realtime, file storage, background jobs). All changes flow through a **GitHub Actions CI/CD pipeline** that tests, builds, and deploys automatically.

---

## CI/CD Pipeline

Every push to GitHub triggers automated tests and builds. Merges to `main` deploy to staging; tags deploy to production.

```mermaid
graph TB
    Dev["👨‍💻 Developer"]
    Repo["GitHub Repository"]
    GHA["GitHub Actions<br/>CI Pipeline"]

    Dev -->|"git push"| Repo
    Repo -->|"webhook"| GHA

    GHA -->|"Step 1"| Lint["🔍 Lint<br/>ESLint<br/>Flat Config"]
    Lint -->|"Pass/Fail"| TypeCheck["🔍 Type Check<br/>tsc<br/>Strict Mode"]
    TypeCheck -->|"Pass/Fail"| UnitTest["🧪 Unit Tests<br/>Vitest<br/>src/**/*.test.ts"]
    UnitTest -->|"Pass/Fail"| E2E["🧪 E2E Tests<br/>Playwright<br/>Real browser"]
    E2E -->|"Pass/Fail"| Build["🔨 Build<br/>next build"]

    Build -->|"On PR"| GHCheck["GitHub Check<br/>✅ All tests pass<br/>Ready to review"]

    Build -->|"On merge to main"| Staging["Vercel Staging<br/>Auto-deploy"]
    Build -->|"On tag v*"| Prod["Vercel Production<br/>Manual tag deploy"]

    Staging -->|"Also trigger"| MigrateStaging["Supabase Migrations<br/>(if schema changed)"]
    Prod -->|"Also trigger"| MigrateProd["Supabase Migrations<br/>(if schema changed)"]

    style Dev fill:#e0e0e0
    style Repo fill:#e0e0e0
    style GHA fill:#bbdefb,stroke:#1976d2,stroke-width:2px
    style Lint fill:#fff9c4,stroke:#f57f17
    style TypeCheck fill:#fff9c4,stroke:#f57f17
    style UnitTest fill:#c8e6c9,stroke:#388e3c
    style E2E fill:#c8e6c9,stroke:#388e3c
    style Build fill:#f8bbd0,stroke:#c2185b,stroke-width:2px
    style Staging fill:#a5d6a7,stroke:#1b5e20,stroke-width:2px
    style Prod fill:#ffb74d,stroke:#e65100,stroke-width:2px
    style MigrateStaging fill:#a5d6a7
    style MigrateProd fill:#ffb74d
```

### CI Pipeline Steps

1. **Lint** — ESLint checks for code style violations (flat config, Next.js + TypeScript rules)
2. **Type Check** — TypeScript compiler validates all types in strict mode
3. **Unit Tests** — Vitest runs all `*.test.ts` and `*.test.tsx` files
4. **E2E Tests** — Playwright runs browser automation tests against a staging instance
5. **Build** — Next.js builds the production bundle; fails if any of the above steps fail

### Deployment Triggers

| Branch | Condition | Destination | Note |
|--------|-----------|-------------|------|
| `main` | Merge to main | Vercel Staging | Auto-deploy on every merge |
| Tags | `git tag v*.*.* && git push --tags` | Vercel Production | Manual tag-based deployment |
| Any | PR opened | GitHub Check | Shows pass/fail in PR UI |

---

## Infrastructure

ARM's infrastructure spans two platforms: Vercel for the application layer and Supabase for the data/auth/realtime layer.

```mermaid
graph TB
    subgraph Vercel["☁️ Vercel Edge Network (Global)"]
        NextApp["Next.js Application<br/>App Router<br/>Server Components<br/>API Routes"]
        API["API Routes<br/>/api/auth<br/>/api/agents<br/>/api/tasks<br/>/api/escalations<br/>... 15+ routes"]
        Static["🖼️ Static Assets<br/>CSS, JS, Images<br/>Cached globally"]
    end

    subgraph Supabase["🗄️ Supabase Cloud (Multi-Region)"]
        Auth["🔐 Supabase Auth<br/>JWT Token Generation<br/>OTP Magic Codes<br/>Session Management"]
        Postgres["🐘 PostgreSQL<br/>Primary Instance (Primary)<br/>Read Replica (Queries)<br/>22 Migrations"]
        Realtime["⚡ Supabase Realtime<br/>WebSocket Subscriptions<br/>Channel: tenant:{id}<br/>Channel: agent:{id}"]
        Storage["💾 Supabase Storage<br/>File Artifacts<br/>Agent Logs<br/>Report PDFs"]
        EdgeFns["🔧 Edge Functions<br/>Agent Runtime<br/>Webhook Handlers<br/>Scheduled Tasks"]
        Cron["⏰ pg_cron<br/>Analytics Rollup<br/>Cleanup Jobs<br/>Report Generation"]
        Queue["📬 pg_boss<br/>Background Queues<br/>Email Jobs<br/>Async Tasks"]
    end

    Vercel -->|"JWT Auth"| Auth
    Vercel -->|"Queries + Updates"| Postgres
    Vercel -->|"Real-time Subscribe"| Realtime
    Vercel -->|"Upload/Download"| Storage
    API -->|"Trigger async jobs"| Queue
    EdgeFns -->|"Read/Write"| Postgres
    Cron -->|"Scheduled runs"| Postgres
    Queue -->|"Pull & Process"| Postgres

    Client["🌍 Browser Client<br/>React 19<br/>Tailwind CSS<br/>Real-time Updates"]
    Client -->|"HTTP/HTTPS"| Vercel
    Client -->|"WebSocket"| Realtime

    style NextApp fill:#000,color:#fff
    style API fill:#000,color:#fff
    style Auth fill:#3ecf8e,color:#000
    style Postgres fill:#336791,color:#fff
    style Realtime fill:#3ecf8e,color:#000
    style Storage fill:#3ecf8e,color:#000
    style EdgeFns fill:#3ecf8e,color:#000
    style Cron fill:#3ecf8e,color:#000
    style Queue fill:#3ecf8e,color:#000
    style Client fill:#61dafb,color:#000
```

### Key Infrastructure Components

**Vercel (Edge Network)**
- Serves Next.js application globally
- Auto-scales based on traffic
- CDN for static assets
- Environment variables per deployment

**Supabase (Multi-Region)**
- PostgreSQL with automatic backups
- Read replica for scaling queries
- Real-time WebSocket pub/sub
- Built-in S3-compatible file storage
- Serverless Edge Functions (Deno runtime)
- Scheduled jobs via pg_cron
- Async job queue via pg_boss

---

## Rollback Decision Tree

If something goes wrong in production, this decision tree guides the response.

```mermaid
flowchart TD
    Start["🚨 Incident Detected"]

    Start --> ErrorRate{"Error rate > 1%<br/>for 5 minutes?"}
    ErrorRate -->|YES| RB1["ROLLBACK"]
    ErrorRate -->|NO| Critical{"Critical feature broken?<br/>auth, billing, spawning,<br/>realtime, escalations"}

    Critical -->|YES| RB2["ROLLBACK"]
    Critical -->|NO| Data{"Data integrity issue?<br/>Schema corruption,<br/>constraint violations"}

    Data -->|YES| RB3["ROLLBACK"]
    Data -->|NO| Security{"Security vulnerability<br/>detected?"}

    Security -->|YES| RB4["ROLLBACK"]
    Security -->|NO| Wait["📊 Monitor (15 min)"]
    Wait --> Stable{"Situation<br/>stabilized?"}

    Stable -->|YES| Keep["✅ Keep deployment"]
    Stable -->|NO| RB5["ROLLBACK"]

    RB1 --> Options["🔀 Rollback Options"]
    RB2 --> Options
    RB3 --> Options
    RB4 --> Options
    RB5 --> Options

    Options --> OptionA["Option A: Quick Code Rollback<br/>git revert HEAD<br/>git push<br/>Auto-deploys via Vercel"]

    Options --> OptionB["Option B: Deploy Previous Tag<br/>Vercel UI: Select v1.2.3<br/>Redeploy from commit"]

    Options --> OptionC["Option C: Database Rollback<br/>Supabase: Restore from backup<br/>Run compensating migration<br/>Check data integrity"]

    OptionA -->|"Fastest"| Success["✅ Incident Resolved"]
    OptionB -->|"Safe"| Success
    OptionC -->|"Last Resort"| Success

    style Start fill:#ffcdd2
    style RB1 fill:#ef5350
    style RB2 fill:#ef5350
    style RB3 fill:#ef5350
    style RB4 fill:#ef5350
    style RB5 fill:#ef5350
    style Options fill:#fff9c4
    style OptionA fill:#c8e6c9
    style OptionB fill:#c8e6c9
    style OptionC fill:#c8e6c9
    style Keep fill:#a5d6a7
    style Success fill:#a5d6a7
```

---

## Environments

ARM operates across three environments, each with distinct purposes and deployment triggers.

### Local (Development)

```
npm run dev
Runs on: http://localhost:3000
Database: Local Supabase instance (Docker)
Auth: Local OTP flow
Realtime: Local WebSocket
Used for: Feature development, debugging
```

### Staging

```
URL: arm-staging.vercel.app
Database: Supabase staging project
Deployment: Auto-deploys on merge to main
Lifespan: Every commit
Purpose: Pre-production testing, E2E tests run here
Cleanup: 7-day retention for data
```

### Production

```
URL: arm.pink-beam.com (custom domain)
Database: Supabase production project
Deployment: Manual tag-based deployment (v*.*.*)
Lifespan: Stays until replaced by new tag
Purpose: Live users, real data, SLA'd uptime
Backups: Hourly backups, 30-day retention
```

---

## Environment Variables

All three environments share these variable names but different values:

### Client-Side (Public)

These are visible in the browser and included in the bundle:

```
NEXT_PUBLIC_SUPABASE_URL
  → Project URL from Supabase dashboard
  → e.g., https://abcdefg.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY
  → Publishable key (row-level security enforced)
  → e.g., eyJ... (starts with 'sb_')

NEXT_PUBLIC_APP_URL
  → Application URL for auth redirects
  → dev: http://localhost:3000
  → staging: https://arm-staging.vercel.app
  → prod: https://arm.pink-beam.com
```

### Server-Side (Secret)

These are never exposed to the browser:

```
SUPABASE_SERVICE_ROLE_KEY
  → Bypasses RLS (use in API routes only)
  → e.g., eyJ... (starts with 'sbprivate_')
  → Stored in Vercel environment settings (encrypted)
  → Never committed to git

RESEND_API_KEY
  → Transactional email API key
  → e.g., re_abc123...
  → Used only in server-side email functions
  → Stored in Vercel environment settings (encrypted)
```

---

## Monitoring & Observability

### Key Metrics

- **Error rate** — % of requests that fail (threshold: 1%)
- **Response time** — P95 latency (target: < 500ms)
- **Agent spawning latency** — Time from spawn.request to spawn.response (target: < 2s)
- **Realtime latency** — Time from event fire to subscription update (target: < 100ms)
- **Database query P95** — Query latency (target: < 100ms)

### Logs

Logs are accessible via Supabase dashboard:

- **API Logs** — All HTTP requests to `/api/*`
- **Postgres Logs** — Database queries, slow queries, errors
- **Edge Function Logs** — Async job execution, webhooks
- **Auth Logs** — Login attempts, token generation, errors

---

## Deployment Checklist

Before deploying to production, verify:

- [ ] All CI checks pass (lint, type, tests, build)
- [ ] Code reviewed and approved (GitHub)
- [ ] Database migrations tested on staging
- [ ] E2E tests pass against staging
- [ ] No breaking API changes to agent protocol
- [ ] Rollback plan documented in incident response
- [ ] Team notified via Slack/email
- [ ] Tag created: `git tag v*.*.* && git push --tags`

---

## Related Concepts

- **[[11-api-architecture]]** — API route structure and patterns
- **[[01-system-overview]]** — System components and data flow
- **[[CICD]]** — Detailed CI/CD configuration
- **[[INCIDENT-RESPONSE]]** — Procedures for handling production incidents

---

*Last updated: 2026-02-15*
*Deployment: Vercel + Supabase | CI: GitHub Actions*
