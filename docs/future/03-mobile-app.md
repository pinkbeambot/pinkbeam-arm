---
title: Mobile App
type: planning
status: concept
created: 2026-02-15
updated: 2026-02-15
owner: CEO
tags: [future, mobile]
aliases: ["React Native App", "iOS App", "Android App"]
---

# Mobile App

## The Idea

Native mobile app for on-the-go agent management. Push notifications for escalations, quick task approvals, VALIS chat, and agent status overview.

---

## Key Features

- **Push notifications** — escalations, blocked tasks, decision requests
- **Quick actions** — approve/reject decisions, resolve escalations with one tap
- **VALIS chat** — same NL interface as web, optimized for mobile
- **Agent status** — at-a-glance overview of workforce health
- **Activity feed** — scrollable, real-time event stream

---

## What It's Not

The mobile app is **not** a full replacement for the ARM dashboard. Complex workflows, detailed analytics charts, Kanban drag-and-drop, and agent configuration stay on the web. Mobile is for:
- Quick responses (approve this, pause that)
- Status checks (what's happening?)
- VALIS conversations
- Notifications

---

## Implementation Notes

- **React Native + Expo** for cross-platform (iOS + Android)
- Shares API layer with web (same REST endpoints)
- Supabase Realtime for push via WebSocket
- VALIS chat uses same engine as web and multi-channel

---

## Depends On

- [[future/01-valis-universal-interface|VALIS Universal Interface]] Phase 2

## Related

- [[future/02-multi-channel-access|Multi-Channel Access]] — alternative mobile access via messaging apps
- [[ARCHITECTURE]] — System architecture
