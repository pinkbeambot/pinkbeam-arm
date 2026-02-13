# Engineering Assignments

## ENG-FE (Frontend Engineer)

### 🔥 URGENT: Marketing Site Implementation (NEW PRIORITY)
**Assigned:** 2026-02-13 12:35 PST by CTO
**Context:** Portal is auth-walled; need public `/` for user acquisition

| Issue | Title | Status | Route |
|-------|-------|--------|-------|
| #34 | Migrate Components from pinkbeam | **START HERE** | `/` |
| #35 | Landing Page (/) | Open | `/` |
| #36 | Agent Detail Pages | Open | `/agents/employee/[slug]` |
| #37 | Pricing Page | Open | `/pricing` |
| #38 | Visual QA & Testing | Open | All |

**Key Requirements:**
- Reference: `~/code/pinkbeam/components/agents/sections/` for components to migrate
- Routes to implement: `/`, `/agents`, `/agents/employee/[slug]`, `/pricing`
- Keep `/portal/*` auth-walled (existing)
- Quality: Responsive (desktop-first), Lighthouse >90, visual regression testing, cross-browser
- Stack: Next.js 15 + React 19 + TypeScript + Tailwind CSS 4

**START WITH #34** - Component migration is the foundation

### Current Assignments - Phase 4: Real-time Features (PAUSED)
| Issue | Title | Status |
|-------|-------|--------|
| #27 | WebSocket Connection Manager | Open |
| #28 | Live Agent Status Indicators | Open |
| #29 | Real-time Metrics Dashboard | Open |
| #30 | Real-time Activity Feed | Open |
| #31 | Notification System | Open |
| #32 | Live Task Pipeline Updates | Open |

**Note:** Phase 4 work PAUSED pending completion of Marketing Site (#34-#38)

### Recently Completed - Phase 2: UI Deliverables
| Issue | Title | Status |
|-------|-------|--------|
| #6 | ARM-001: Agent Runtime Core | ✅ Closed |
| #7 | ARM-002: Dashboard + Agent Roster | ✅ Closed |
| #8 | ARM-003: Activity Feed UI | ✅ Closed |
| #9 | ARM-004: Task Pipeline UI | ✅ Closed |
| #10 | ARM-005: Escalation Inbox UI | ✅ Closed |
| #11 | ARM-006: Decision Log UI | ✅ Closed |
| #12 | ARM-007: Performance Dashboard UI | ✅ Closed |
| #13 | ARM-008: Agent Configuration UI | ✅ Closed |
| #14 | ARM-009: Backend API Implementation | ✅ Closed |
| #15 | ARM-010: Landing Page | ✅ Closed |
| #16 | ARM-011: Portal Layout Refactor | ✅ Closed |

### Blocked
None - ENG-FE is unblocked and ready for Phase 4 work.

---

## ENG-BE (Backend Engineer)

### Current Assignments
| Issue | Title | Status |
|-------|-------|--------|
| #20 | /api/agents CRUD Endpoints | Open |
| #21 | /api/tasks Enhancements | Open |
| #22 | /api/decisions Endpoints | Open |
| #23 | /api/escalations Endpoints | Open |
| #24 | /api/messages Endpoints | Open |
| #25 | Supabase Edge Functions - Agent Runtime | Open |
| #26 | Authentication Middleware & Tenant Context | Open |

### Recently Completed
| Issue | Title | Status |
|-------|-------|--------|
| #14 | Activity Feed API (commit 42af449) | ✅ Closed |

---

## Notes

### 2026-02-13 12:35 PST - URGENT: Marketing Site Assignment
- **NEW PRIORITY:** Marketing site implementation assigned by CEO via CTO
- Issues #34-#38 created for public marketing site (user acquisition)
- Phase 4 work (#27-#32) PAUSED until marketing site complete
- ENG-FE to start with #34 (component migration from pinkbeam)
- **Components to migrate:** Hero, ProblemSection, HowItWorks, EmployeeTabs, UseCases, TrustSignals, Testimonials, PricingSection, FAQ, FinalCTA

### 2026-02-13 12:20 PST
- Cleared Phase 2 validation backlog
- Fixed build errors in AgentConfigForm.tsx, config-utils.ts, and validation/agent-config.ts
- Build now passes successfully
- Phase 4 issues #27-#32 created and ready for ENG-FE
- ENG-FE is UNBLOCKED

