---
title: Visual Documentation Index
type: visual
tags:
  - visual
  - reference
  - index
created: 2026-02-15
---

# Visual Documentation Index

## What is Pink Beam ARM?

**Pink Beam ARM** (Agent Relationship Management) is a command center for managing AI agent workforces. Built for solopreneurs running AI-native businesses, ARM provides a multi-tenant, event-driven platform where humans can spawn hierarchical teams of AI agents, delegate work, make decisions collectively, and track everything through real-time activity feeds.

Think of it like Slack for AI agents—where humans are the CEOs and can spawn managers, workers, and specialists who collaborate to complete complex tasks.

## How to Use This Documentation

Start at the **System Overview** to understand the big picture, then follow the reading order below. Each document builds on the previous one.

### Recommended Reading Order

1. **[[01-system-overview|System Overview]]** — The 4-layer architecture (client, API, service, data)
2. **[[02-auth-flow|Authentication Flow]]** — How users log in via OTP
3. **[[03-multi-tenancy|Multi-Tenancy Architecture]]** — How data is isolated per customer
4. **[[04-agent-hierarchy|Agent Hierarchy]]** — How agents are organized in a tree
5. **[[05-agent-lifecycle|Agent Lifecycle]]** — Agent states from creation to termination
6. **[[06-data-model|Data Model]]** — Core database schema and relationships
7. **[[07-task-pipeline|Task Pipeline]]** — How tasks flow through the system
8. **[[08-decision-flow|Decision Flow]]** — How agents make collective decisions
9. **[[09-escalation-system|Escalation System]]** — Escalation urgency and SLA tracking
10. **[[10-event-system|Event System]]** — Real-time activity feeds and Realtime subscriptions
11. **[[11-api-architecture|API Architecture]]** — Request handling and auth middleware
12. **[[12-agent-protocol|Agent Protocol (AAP)]]** — Message types and decision authority matrix
13. **[[13-valis-system|VALIS System]]** — Agent persona, knowledge, and behavior
14. **[[14-deployment|Deployment & Infrastructure]]** — Hosting, Edge Functions, and scaling

---

## Visual Documentation Map

| # | Document | Diagram Type | What It Shows |
|---|----------|--------------|---------------|
| 1 | **System Overview** | Graph (LR + TB) | 4-layer architecture, request flow, component relationships |
| 2 | **Authentication Flow** | Sequence Diagram | OTP login flow, session creation, tenant setup |
| 3 | **Multi-Tenancy Architecture** | Graph + Table | Tenant isolation, RLS policies, data boundaries |
| 4 | **Agent Hierarchy** | Tree Diagram | Agent tree structure, roles, relationships |
| 5 | **Agent Lifecycle** | State Diagram | Agent states (initializing → idle → active → terminated) |
| 6 | **Data Model** | Entity Diagram | Database tables, relationships, key fields |
| 7 | **Task Pipeline** | Flow Diagram | Task states, transitions, dependency handling |
| 8 | **Decision Flow** | Sequence Diagram | Decision creation, voting, execution |
| 9 | **Escalation System** | Flow + State Diagram | Escalation urgency levels, SLA calculations |
| 10 | **Event System** | Graph | Realtime subscriptions, event broadcasting, listeners |
| 11 | **API Architecture** | Layer Diagram | Request handling, middleware stack, error handling |
| 12 | **Agent Protocol (AAP)** | Class Diagram | Message types, decision matrix, capabilities |
| 13 | **VALIS System** | Component Diagram | Agent persona, knowledge bases, behavior rules |
| 14 | **Deployment & Infrastructure** | Deployment Diagram | Vercel, Supabase, Edge Functions, databases |

---

## Quick Links by Topic

### Core Concepts
- [[01-system-overview|How the system is organized]]
- [[03-multi-tenancy|How data is isolated per tenant]]
- [[04-agent-hierarchy|How agents form teams]]

### User Flows
- [[02-auth-flow|How users sign up and log in]]
- [[07-task-pipeline|How work gets assigned and completed]]
- [[08-decision-flow|How agents vote and make decisions]]

### System Mechanics
- [[05-agent-lifecycle|Agent lifecycle states]]
- [[10-event-system|Real-time activity updates]]
- [[09-escalation-system|When things need human attention]]

### Technical Details
- [[06-data-model|Database schema]]
- [[11-api-architecture|API design]]
- [[12-agent-protocol|Message protocols]]
- [[13-valis-system|Agent AI behavior]]
- [[14-deployment|Infrastructure]]

---

## Key Technologies

- **Frontend**: Next.js 16, React 19, TypeScript 5, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL 22 migrations), Edge Functions
- **Auth**: Supabase Auth with OTP
- **Realtime**: Supabase Realtime (WebSocket)
- **Email**: Resend
- **Deployment**: Vercel
- **Testing**: Vitest + Playwright
- **LLMs**: Claude, GPT-4, Gemini, local models

---

## For Someone New to ARM

If you're completely new to this system, **start here**:

1. Read the first 2 paragraphs above (what ARM is)
2. Open **[[01-system-overview|System Overview]]** and look at the first diagram
3. Open **[[04-agent-hierarchy|Agent Hierarchy]]** to see how agents work together
4. Open **[[02-auth-flow|Authentication Flow]]** to see how users get started

Then you'll understand the basics. Everything else is details.

---

## Document Status

All diagrams are accurate as of **February 15, 2026**.

Last updated: 2026-02-15
