---
title: Future Features Index
type: reference
status: active
created: 2026-02-15
updated: 2026-02-15
owner: CEO
tags: [reference, future, roadmap]
aliases: ["Future Index", "Roadmap Index"]
---

# Future Features

Central hub for planned features beyond MVP. Each feature has its own document with full context, rationale, architecture notes, and open questions.

---

## Feature Map

| # | Feature | Priority | Phase | Status |
|---|---------|----------|-------|--------|
| 01 | [[future/01-valis-universal-interface\|VALIS Universal Interface]] | Critical | Post-MVP | Designing |
| 02 | [[future/02-multi-channel-access\|Multi-Channel Access]] | High | After VALIS Phase 1 | Concept |
| 03 | [[future/03-mobile-app\|Mobile App]] | Medium | After VALIS | Concept |
| 04 | [[future/04-agent-marketplace\|Agent Marketplace]] | Medium | Phase 3 | Concept |
| 05 | [[future/05-integrations-hub\|Integrations Hub]] | Medium | Post-MVP | Concept |
| 06 | [[future/06-advanced-analytics\|Advanced Analytics]] | Low | Phase 4 | Concept |
| 07 | [[future/07-multi-user-collaboration\|Multi-User Collaboration]] | Low | Phase 4 | Concept |

---

## Priority & Dependency Flow

```mermaid
graph TD
    MVP["🚀 MVP Complete<br/>Core agent workflows proven"]

    MVP --> V1["01: VALIS Universal Interface<br/>Phase 1: Read queries<br/>Phase 2: Action commands<br/>Phase 3: Settings + full control"]

    V1 -->|"Phase 1 done"| MC["02: Multi-Channel Access<br/>Telegram, WhatsApp,<br/>Discord, Slack, SMS"]

    V1 -->|"Phase 2 done"| Mobile["03: Mobile App<br/>React Native"]

    MVP --> Int["05: Integrations Hub<br/>CRM, email, PM tools"]
    Int -->|"enriches"| Market["04: Agent Marketplace<br/>Templates + one-click deploy"]

    MVP --> Analytics["06: Advanced Analytics<br/>Performance, costs, trends"]
    MVP --> Collab["07: Multi-User Collaboration<br/>RBAC, team access"]

    style MVP fill:#e8f5e9,stroke:#2e7d32,stroke-width:3px
    style V1 fill:#ffcdd2,stroke:#c62828,stroke-width:3px
    style MC fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style Mobile fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style Market fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style Int fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style Analytics fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    style Collab fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
```

---

## The Big Idea

The core thesis behind these features: **ARM should be controllable entirely through natural language.** The UI is the visual layer for dashboards, graphs, and complex layouts. But every action, query, and setting change should also be possible by just *talking to VALIS*.

Think of it like this:
- **ARM UI** = the cockpit with all the instruments and switches
- **VALIS** = the copilot who can flip any switch for you when you ask

You can always use the cockpit directly. But you can also just tell VALIS what you need.

---

## Related Documentation

- [[visual/13-valis-meta-agent|VALIS Architecture Diagrams]] — Current VALIS technical design
- [[PRD]] — Product requirements and user personas
- [[ARCHITECTURE]] — System architecture
- [[MASTER-TASK-LIST]] — Current development phases
