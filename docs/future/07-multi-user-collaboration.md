---
title: Multi-User Collaboration
type: planning
status: concept
created: 2026-02-15
updated: 2026-02-15
owner: CEO
tags: [future, collaboration, auth]
aliases: ["Team Access", "RBAC", "Multi-User"]
---

# Multi-User Collaboration

## The Idea

Currently ARM is designed for solopreneurs (one user per tenant). This feature adds team member invitations with role-based access control (RBAC).

---

## Roles

| Role | Can View | Can Act | Can Configure |
|------|:--------:|:-------:|:-------------:|
| **Admin** | Everything | Everything | Everything |
| **Operator** | Everything | Agents, tasks, decisions | Notification prefs only |
| **Viewer** | Everything | Nothing (read-only) | Own prefs only |

---

## Key Decisions

- [ ] RBAC model within tenant (roles table, permissions matrix)
- [ ] Shared vs. personal agent views
- [ ] Per-user audit trail (who approved what)
- [ ] Notification preferences per team member
- [ ] Invite flow (email invite → accept → join tenant)
- [ ] VALIS permissions per user role (viewers can query but not act)

---

## Related

- [[visual/02-auth-flow|Auth Flow]] — current authentication system
- [[visual/03-multi-tenancy|Multi-Tenancy]] — tenant isolation model
