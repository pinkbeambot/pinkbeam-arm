---
title: "Map of Content"
type: reference
status: active
created: 2026-02-15
updated: 2026-02-15
owner: CTO
tags: [reference, core]
aliases: ["MOC", "Table of Contents", "Index"]
---

# Map of Content

Central navigation hub for the Pink Beam ARM documentation vault.

---

## Quick Navigation by Role

### Leadership (CEO / CPO)
- [[PRD]] — Product requirements, user personas, go-to-market
- [[MASTER-TASK-LIST]] — All tasks by phase with status tracking
- [[STATUS]] — Current development snapshot
- [[ENGINEERING]] — Engineering timeline and assignments

### Backend Engineering
- [[ARCHITECTURE]] — System design, multi-tenancy, event-driven patterns
- [[AGENT-PROTOCOL]] — Agent communication protocol (AAP v1.0)
- [[API]] — Complete REST API reference
- [[AUTH_IMPLEMENTATION]] — JWT auth middleware and tenant context
- [[ACTIVITY_FEED_IMPLEMENTATION]] — Event triggers, Realtime channels, pagination

### Frontend Engineering
- [[E2E-TEST-PLAN]] — Playwright E2E test strategy
- [[TESTING-STANDARDS]] — Coverage thresholds and test patterns

### DevOps / Operations
- [[CICD]] — GitHub Actions, Vercel deployment pipeline
- [[DEPLOYMENT]] — Deploy schedule, environments, hotfix process
- [[INCIDENT-RESPONSE]] — Severity levels, rollback procedures, runbooks

### Process & Standards
- [[DEVELOPMENT-PROCESS]] — Engineering workflow and process fixes
- [[REPORTING]] — Event-driven signal protocol (DONE/BLOCKED/PROGRESS)
- [[AGENT-ROLES]] — Testing enforcement per role
- [[TESTING-STANDARDS]] — Testing types, coverage thresholds, CI integration

---

## Documents by Type

### Architecture
| Document | Description |
|----------|-------------|
| [[ARCHITECTURE]] | Core system design — multi-tenancy, event-driven, agent hierarchy |
| [[AGENT-PROTOCOL]] | ARM Agent Protocol (AAP) v1.0 — lifecycle, messaging, spawning |

### Implementation
| Document | Description |
|----------|-------------|
| [[AUTH_IMPLEMENTATION]] | JWT validation, tenant context, withAuth HOC |
| [[ACTIVITY_FEED_IMPLEMENTATION]] | PostgreSQL triggers, cursor pagination, Realtime channels |
| [[API]] | REST API — all endpoints, auth, rate limiting, error codes |

### Process
| Document | Description |
|----------|-------------|
| [[DEVELOPMENT-PROCESS]] | 7 process frameworks for engineering workflow |
| [[REPORTING]] | Event-driven reporting — no standups, signal-based |
| [[AGENT-ROLES]] | Testing enforcement by role with coverage thresholds |
| [[TESTING-STANDARDS]] | Comprehensive testing guide — types, thresholds, CI |

### Operations
| Document | Description |
|----------|-------------|
| [[CICD]] | GitHub Actions + Vercel deployment pipeline |
| [[DEPLOYMENT]] | Environments, deploy schedule, hotfix process |
| [[INCIDENT-RESPONSE]] | Severity levels, rollback, post-mortems |

### Product & Planning
| Document | Description |
|----------|-------------|
| [[PRD]] | Full product requirements with user stories and wireframes |
| [[MASTER-TASK-LIST]] | 61 tasks across 8 phases with status tracking |
| [[ENGINEERING]] | Engineering status, assignments, MVP timeline |
| [[STATUS]] | Weekly development snapshot |
| [[E2E-TEST-PLAN]] | Playwright E2E test strategy for critical flows |

---

## Visual Documentation (Mermaid Diagrams)

Comprehensive visual guides with Mermaid diagrams — start here if you're new to the system.

| Document | Diagram Type | What It Shows |
|----------|-------------|---------------|
| [[visual/00-index\|Visual Index]] | — | Navigation hub for all visual docs |
| [[visual/01-system-overview\|System Overview]] | `graph LR` | Client → API → Services → Data architecture layers |
| [[visual/02-auth-flow\|Auth Flow]] | `sequenceDiagram` | OTP email → code → verify → session → tenant init |
| [[visual/03-multi-tenancy\|Multi-Tenancy]] | `graph TB` | Tenant isolation, RLS enforcement, data boundaries |
| [[visual/04-agent-hierarchy\|Agent Hierarchy]] | `graph TD` | CEO → Manager → Worker tree, role capabilities |
| [[visual/05-agent-lifecycle\|Agent Lifecycle]] | `stateDiagram-v2` | 8 agent states with transitions |
| [[visual/06-data-model\|Data Model]] | `erDiagram` | 13+ tables with relationships |
| [[visual/07-task-pipeline\|Task Pipeline]] | `stateDiagram-v2` | Kanban columns, task dependencies DAG |
| [[visual/08-decision-flow\|Decision Flow]] | `flowchart TD` | Authority matrix, decision approval chain |
| [[visual/09-escalation-workflow\|Escalation Workflow]] | `flowchart TD` | 5 types, 4 urgencies, SLA resolution |
| [[visual/10-event-system\|Event System]] | `sequenceDiagram` | DB triggers → activities → Realtime → UI |
| [[visual/11-api-architecture\|API Architecture]] | `graph TB` | Middleware chain, 70+ route groups |
| [[visual/12-agent-protocol\|Agent Protocol]] | `sequenceDiagram` | AAP message types, A2A communication |
| [[visual/13-valis-meta-agent\|VALIS Meta-Agent]] | `graph TD` | 3-phase NLI roadmap, query flow |
| [[visual/14-deployment\|Deployment]] | `graph LR` | GitHub → Actions → Vercel + Supabase, rollback |

---

## Dependency Map

Reading order for onboarding — start at the top, follow arrows down.

```
PRD (product vision)
 │
 ├──► ARCHITECTURE (system design)
 │     │
 │     ├──► AGENT-PROTOCOL (agent communication)
 │     ├──► API (REST endpoints)
 │     ├──► AUTH_IMPLEMENTATION (auth middleware)
 │     └──► ACTIVITY_FEED_IMPLEMENTATION (event system)
 │
 ├──► MASTER-TASK-LIST (task breakdown)
 │     └──► ENGINEERING (status & assignments)
 │           └──► STATUS (weekly snapshot)
 │
 └──► DEVELOPMENT-PROCESS (how we work)
       │
       ├──► TESTING-STANDARDS ◄──► AGENT-ROLES
       │     └──► E2E-TEST-PLAN
       │
       ├──► DEPLOYMENT ◄──► INCIDENT-RESPONSE
       │
       ├──► CICD
       │
       └──► REPORTING
```

---

## Tag Reference

### By Function
| Tag | Documents |
|-----|-----------|
| `#architecture` | [[ARCHITECTURE]], [[AGENT-PROTOCOL]] |
| `#implementation` | [[AUTH_IMPLEMENTATION]], [[ACTIVITY_FEED_IMPLEMENTATION]] |
| `#testing` | [[TESTING-STANDARDS]], [[AGENT-ROLES]], [[E2E-TEST-PLAN]] |
| `#process` | [[DEVELOPMENT-PROCESS]], [[REPORTING]], [[AGENT-ROLES]], [[TESTING-STANDARDS]] |
| `#operations` | [[CICD]], [[DEPLOYMENT]], [[INCIDENT-RESPONSE]] |
| `#planning` | [[MASTER-TASK-LIST]], [[ENGINEERING]], [[STATUS]], [[E2E-TEST-PLAN]] |
| `#product` | [[PRD]] |

### By Domain
| Tag | Documents |
|-----|-----------|
| `#agents` | [[AGENT-PROTOCOL]], [[ARCHITECTURE]], [[AGENT-ROLES]] |
| `#auth` | [[AUTH_IMPLEMENTATION]], [[API]] |
| `#realtime` | [[ACTIVITY_FEED_IMPLEMENTATION]], [[ARCHITECTURE]] |
| `#database` | [[ARCHITECTURE]], [[ACTIVITY_FEED_IMPLEMENTATION]] |
| `#api` | [[API]], [[AUTH_IMPLEMENTATION]] |
| `#frontend` | [[E2E-TEST-PLAN]] |
| `#backend` | [[API]], [[AUTH_IMPLEMENTATION]], [[ACTIVITY_FEED_IMPLEMENTATION]] |
| `#deployment` | [[CICD]], [[DEPLOYMENT]], [[INCIDENT-RESPONSE]] |

### By Priority
| Tag | Documents |
|-----|-----------|
| `#critical` | [[ARCHITECTURE]], [[AGENT-PROTOCOL]], [[API]], [[AUTH_IMPLEMENTATION]], [[PRD]], [[CICD]], [[DEPLOYMENT]], [[INCIDENT-RESPONSE]], [[TESTING-STANDARDS]] |
| `#core` | [[DEVELOPMENT-PROCESS]], [[AGENT-ROLES]], [[MASTER-TASK-LIST]] |
| `#reference` | [[ENGINEERING]], [[STATUS]], [[API]] |
| `#visual` | [[visual/00-index\|Visual Index]] and all 14 visual documentation files in `docs/visual/` |
