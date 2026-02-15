---
title: "Development Process"
type: process
status: active
created: 2026-02-13
updated: 2026-02-15
owner: CTO
tags: [process, core]
aliases: ["Dev Process", "Engineering Process"]
---

# Pink Beam ARM — Development Process Fixes

**Documented:** 2026-02-13  
**Status:** Active process definitions

---

## 1. Testing Ownership

**Problem:** No clear owner for test coverage. CI runs tests but who ensures coverage doesn't drop?

**Solution:**
- **Owner:** ENG-BE (backend), ENG-FE (frontend) write tests; **CTO validates coverage on PR review**
- **Thresholds:**
  - Backend API routes: 80% coverage minimum
  - Frontend components: 60% coverage minimum  
  - Critical paths (auth, billing, agent spawning): 90% coverage
- **Process:**
  1. PRs include tests for new code
  2. CI fails if coverage drops below threshold
  3. CTO reviews coverage report in PR
  4. Exceptions require Richard approval (rare)

**Files:**
- `~/code/arm/vitest.config.ts` - coverage thresholds
- CI workflow - coverage check step

---

## 2. Frontend/Backend Contract Sync

**Problem:** Backend lands API changes, frontend adapts reactively. Contract drift.

**Solution:**
- **API Review Gate:** ENG-FE must approve all `/api/*` PRs before merge
- **Contract Documentation:** 
  - OpenAPI spec in `~/code/arm/docs/openapi.yaml` (issue #19)
  - Types shared in `~/code/arm/src/types/api.ts`
- **Process:**
  1. ENG-BE opens API PR with updated types + OpenAPI
  2. ENG-FE reviews for frontend compatibility
  3. ENG-FE approves or requests changes
  4. CTO merges only after ENG-FE approval
- **Breaking Changes:** Require major version bump + migration guide

---

## 3. Deployment Decision

**Problem:** Who decides "deploy to prod now"? Auto-merge? Manual?

**Solution:**
- **Staging Auto-Deploy:** Every merge to `main` auto-deploys to staging
- **Prod Deploy:** **CTO discretion** with these rules:
  - Daily at 4pm PST if tests pass and no critical bugs
  - Immediate hotfix deploy for security/critical bugs (CTO decides)
  - No Friday afternoon prod deploys (unless emergency)
- **Release Rhythm:** 
  - Daily micro-releases (features/fixes)
  - Weekly summary to Richard (what shipped)
  - Monthly changelog for users
- **Process:**
  1. CTO reviews staging after merge
  2. If good, `git tag v0.x.x && git push origin v0.x.x` triggers prod deploy
  3. Monitor Vercel deploy logs for 10 min post-deploy

---

## 4. Rollback Process

**Problem:** No staging environment. Database migrations are one-way. No recovery plan.

**Solution:**
- **Staging Environment:** `staging.pinkbeam-arm.vercel.app` (auto-deploy from `main`)
- **Database Safety:**
  - All migrations must be **backwards compatible** (add columns, don't remove)
  - Destructive changes require: 1) backup, 2) new migration, 3) cleanup migration later
  - Use `supabase db dump` before risky migrations
- **Rollback Triggers:**
  - Error rate >1% for 5 minutes
  - Critical feature broken (login, billing, agent spawn)
  - CEO/CTO decision
- **Rollback Process:**
  1. CTO decides rollback needed
  2. `git revert HEAD` or deploy previous tag
  3. Database: if migration ran, run compensating migration (pre-written)
  4. Notify Richard with incident summary
  5. Post-mortem within 24 hours

**Files:**
- `~/code/arm/docs/INCIDENT-RESPONSE.md` (create this)
- `~/code/arm/scripts/rollback.sh` (create this)

---

## 5. Documentation Sync

**Problem:** ARCHITECTURE.md, AGENT-PROTOCOL.md drift from code reality.

**Solution:**
- **Doc Ownership:**
  - `ARCHITECTURE.md`: CTO keeps current (system changes)
  - `AGENT-PROTOCOL.md`: CTO keeps current (protocol changes)
  - `PRD.md`: CPO owns (product changes)
  - OpenAPI spec: ENG-BE auto-generates from code
  - `CLAUDE.md`: Auto-generated or ENG-FE maintains
- **Process:**
  1. PRs that change architecture include doc updates
  2. CTO reviews "docs updated?" checkbox on all PRs
  3. Monthly doc audit (CTO reviews all docs vs. code)
  4. Outdated docs = technical debt item

---

## 6. Event-Driven Reporting

**Problem:** Daily standups are designed for humans (8-hour cycles). Agents work in hours, not days. Forced cadence creates noise and delays blocker resolution.

**Solution:**
- **Event-Driven Reporting:** Agents report ONLY on state changes, not time intervals
- **No scheduled standups:** CTO responds to signals, not calendar

**Agent Signal Protocol:**

| Signal | Format | Triggers |
|--------|--------|----------|
| **DONE** | `DONE #[issue]: [summary]` | CTO validates, tests, closes issue |
| **BLOCKED** | `BLOCKED #[issue]: [what's needed]` | Immediate CTO unblocking action |
| **PROGRESS** | `PROGRESS #[issue]: [milestone]` | Optional, acknowledge only |

**Examples:**
```
DONE #20: /api/agents CRUD endpoints with 94% coverage
BLOCKED #22: Need schema decision on decision_logs table structure
PROGRESS #25: Edge function scaffold complete, runtime wiring in progress
```

**CTO Response Protocol:**
- On **DONE** → Validate, test, close issue with summary comment
- On **BLOCKED** → Unblock immediately, escalate to CEO if needed
- On **PROGRESS** → Acknowledge, no action required

**Full documentation:** See `docs/REPORTING.md`

**Why This Works:**
- Matches agent speed (hours, not days)
- Blockers surface immediately
- No wasted "nothing to report" updates
- CTO responds to actual events, not scheduled interruptions

---

## 7. Stateless Agent Architecture

**Problem:** Persistent agents (CTO, ENG-BE, ENG-FE) experiencing timeouts on long-running tasks.

**Solution:** Stateless, fire-and-forget agent sessions.

### CEO as Orchestrator
- **VALIS (CEO)** reads signals and decides what needs to happen
- **Spawns stateless CTO/ENG-BE/ENG-FE sessions** for specific, bounded tasks
- **Each session does ONE thing, reports back, ends**
- **No persistent agents** running for hours

### Stateless CTO Sessions
**Pattern:**
```
VALIS: "CTO — validate #20-#21, report back"
→ CTO spawns, validates, reports DONE, session ends

VALIS: "CTO — spawn ENG-BE on #22, report back"  
→ CTO spawns, assigns, reports DONE, session ends

VALIS: "CTO — merge PR #123, report back"
→ CTO merges, reports DONE, session ends
```

**Benefits:**
- No context overflow (sessions <5 minutes)
- No blocking operations accumulation
- Clear audit trail (each spawn is a decision point)
- Easy recovery (respawn with same task if timeout)

### Stateless Engineer Sessions
**ENG-BE/ENG-FE:** Spawned for single tasks, report DONE/BLOCKED, session ends

**Pattern:**
```
CTO (on behalf of VALIS): "ENG-BE — implement #20, report when done"
→ ENG-BE works, reports DONE #20, session ends

VALIS: "ENG-FE — migrate components #34, report when done"
→ ENG-FE works, reports DONE #34, session ends
```

### No Automatic Spawning
- No cron jobs spawning agents
- No timers
- **Only VALIS decides when to spawn**
- Each spawn has explicit task and expected output

### Recovery from Timeout
If any session times out:
1. VALIS detects (no report received)
2. VALIS respawns same agent with same task
3. Agent starts fresh (no context from failed session)
4. If work was partially done, it shows in git/GitHub state

### Example Flow
```
10:00 — ENG-BE reports: DONE #20
10:00 — VALIS spawns CTO: "Validate #20"
10:05 — CTO reports: #20 validated and closed
10:05 — VALIS spawns CTO: "Assign ENG-BE to #21"
10:10 — CTO reports: ENG-BE spawned on #21
10:10 — VALIS waits (no action until ENG-BE signals)
...
11:30 — ENG-BE reports: DONE #21
11:30 — VALIS spawns CTO: "Validate #21"
...
```

---

## Summary Table

| Problem | Owner | Fix | When |
|---------|-------|-----|------|
| Testing | CTO | Coverage thresholds, CI enforcement | Now |
| API Contracts | ENG-FE + CTO | FE review on API PRs | Now |
| Deployment | CTO | Staging auto, prod daily @4pm | Now |
| Rollback | CTO | Staging env, backwards compat migrations | This week |
| Documentation | CTO | PR checklist, monthly audit | Now |
| Reporting | Agents | Event-driven (done/blocked signals) | Now |
| CTO Timeouts | VALIS | Batch limits, checkpoint pattern, 30min sessions | Now |

---

## Files to Create/Update

1. `~/code/arm/docs/DEVELOPMENT-PROCESS.md` — This document ✅ Created
2. `~/code/arm/docs/INCIDENT-RESPONSE.md` — Rollback procedures
3. `~/code/arm/scripts/rollback.sh` — Rollback automation
4. `~/code/arm/vitest.config.ts` — Add coverage thresholds
5. `.github/workflows/ci.yml` — Add coverage check
6. Update CTO workflow message — Include these processes (resilience patterns added)

---

*Documented by: VALIS (CEO)*
*Next review: After CTO implements*

---

## Related Documentation

- [[TESTING-STANDARDS]] — Testing standards enforced by this process
- [[DEPLOYMENT]] — Deployment procedures and schedule
- [[INCIDENT-RESPONSE]] — Incident response and rollback
- [[CICD]] — CI/CD pipeline configuration
- [[REPORTING]] — Event-driven reporting protocol
- [[AGENT-ROLES]] — Agent roles with testing enforcement
- [[ARCHITECTURE]] — System architecture guiding development
