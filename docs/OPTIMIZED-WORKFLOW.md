# Optimized Development Flow

**Goal:** Maximize active work time, eliminate idle waiting, create reliable handoffs.

## Current Problems

1. **Engineers idle** waiting for assignments
2. **CTO checkins unreliable** — stale data, hallucinated status
3. **Manual spawning** — CEO has to manually trigger CTO
4. **Delayed handoffs** — engineer done → wait for CEO → spawn CTO → wait
5. **No automatic triggering** — chain of work stops at each handoff

## Proposed Solution: Event-Driven Orchestration

### Three Trigger Types

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   TIME-BASED    │     │   EVENT-BASED   │     │   DIRECT CHAIN  │
│   (Cron 15min)  │     │   (State Change)│     │   (Immediate)   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
    Check GitHub            PR opened              Engineer DONE
    Check assignments       Issue created          → Auto-spawn CTO
    Spawn if needed         Critical bug           CTO merged
                                                  → Auto-spawn next
```

### 1. Time-Based Triggers (Cron Every 15 Minutes)

**What it does:**
- Scans GitHub issues for open/unassigned work
- Scans PRs needing review
- Checks engineer idle state
- Spawns appropriate agents

**Implementation:**
```javascript
// cto-orchestrator cron (15 min)
read("assignments/ACTIVE.md");
checkGitHubIssues();        // API call
checkOpenPRs();             // API call

// Logic:
if (openCriticalIssue && !assigned) {
  spawnCTO("assign-critical");
}
if (engineerIdleDays > 0 && openWorkAvailable) {
  spawnCTO("assign-next-task");
}
if (prOpenHours > 2 && !reviewerAssigned) {
  spawnCTO("review-pr");
}
```

### 2. Event-Based Triggers (GitHub Webhooks → OpenClaw)

**What triggers it:**
- PR opened → spawn CTO for review
- Issue created → spawn CEO to triage
- PR merged → spawn CTO to assign next work
- CI failed → spawn engineer to fix

**Implementation:**
```javascript
// GitHub webhook → OpenClaw system event
// Webhook payload parsed, routes to appropriate agent

// PR opened:
sessions_spawn({
  agentId: "cto",
  task: "PR opened: eng-be/task-22. Review and merge if good.",
  label: "review-pr-22"
});

// Issue created with "critical" label:
sessions_spawn({
  agentId: "main",  // CEO
  task: "Critical issue #52 created. Triage and assign.",
  label: "triage-critical-52"
});

// PR merged:
sessions_spawn({
  agentId: "cto",
  task: "PR merged. Close issue and assign next task to engineer.",
  label: "post-merge-assign"
});
```

### 3. Direct Chain Spawning (Immediate Handoffs)

**The key insight:** When work completes, immediately trigger the next step. No waiting.

```javascript
// Engineer reports DONE
sessions_send({
  sessionKey: "agent:main:cto",
  message: "DONE #22: /api/decisions, 94% cov, PR: eng-be/task-22"
});

// CTO receives message, IMMEDIATELY:
// 1. Reviews PR (if quick)
// 2. Or spawns self for deeper review
// 3. Merges if good
// 4. Spawns next engineer immediately

// Chain example:
// ENG-BE done #22
// → CTO spawned (reviews #22)
// → CTO merges #22
// → CTO spawns ENG-BE for #25 (next in queue)
// All within 2 minutes, no human intervention
```

## New Workflow Patterns

### Pattern A: Standard Feature Development

```
GitHub Issue created (#48 Chat Interface)
    ↓
[EVENT] CEO spawned → assigns to ENG-FE
    ↓
ENG-FE works → reports DONE with PR
    ↓
[CHAIN] Auto-spawns CTO for review
    ↓
CTO reviews → merges → closes issue
    ↓
[CHAIN] Auto-spawns CTO to assign next
    ↓
CTO assigns ENG-FE #50 (Unified navbar)
    ↓
[TIME] Cron confirms work assigned, no action needed
```

### Pattern B: Critical Bug (Current #52)

```
Issue #52 created (critical auth bug)
    ↓
[EVENT] CEO spawned immediately (critical label)
    ↓
CEO spawns ENG-BE with "stop everything, fix this"
    ↓
ENG-BE fixes → tests personally → reports DONE
    ↓
[CHAIN] Auto-spawns CTO
    ↓
CTO verifies PERSONALLY (clicks magic link)
    ↓
CTO merges → closes issue
    ↓
[CHAIN] Auto-spawns CEO to confirm fix
    ↓
CEO confirms → normal workflow resumes
```

### Pattern C: Review Queue

```
ENG-BE submits PR #22
    ↓
[EVENT] CTO spawned for review
    ↓
CTO reviews → requests changes
    ↓
ENG-BE fixes → pushes
    ↓
[EVENT] CTO re-spawned (new commit)
    ↓
CTO approves → merges
    ↓
[CHAIN] Next task assigned automatically
```

## State Machine

```
┌─────────┐    create     ┌─────────────┐    assign     ┌─────────────┐
│   TODO  │ ─────────────→│  ASSIGNED   │ ────────────→│ IN_PROGRESS │
└─────────┘               └─────────────┘              └──────┬──────┘
     ↑                                                        │
     │                      ┌─────────────┐                   │
     └──────────────────────┤    DONE     │←──────────────────┘
       close issue          └──────┬──────┘   submit PR
                                  │
                    ┌─────────────┼─────────────┐
                    ↓             ↓             ↓
              ┌─────────┐   ┌─────────┐   ┌─────────┐
              │ REVIEW  │   │ CHANGES │   │ MERGED  │
              └────┬────┘   └────┬────┘   └────┬────┘
                   │             │             │
              approve       fix & push    assign next
                   └─────────────┘             │
                                               ↓
                                          ┌─────────┐
                                          │  TODO   │ (next task)
                                          └─────────┘

State transitions trigger agent spawns automatically.
```

## Implementation Plan

### Phase 1: Direct Chain Spawning (Immediate)

**What to implement now:**

1. **Engineer reports DONE → immediate CTO spawn**
   ```javascript
   // In engineer's exit:
   if (status === "DONE") {
     sessions_spawn({
       agentId: "cto",
       task: `Review and merge: ${prBranch}. Issue #${issueNum}`,
       label: `review-${issueNum}`
     });
   }
   ```

2. **CTO merges → immediate next assignment**
   ```javascript
   // In CTO's workflow:
   if (merged) {
     // Assign next task immediately
     sessions_spawn({
       agentId: nextEngineer,
       task: `Next: #${nextIssue}. Previous #${justMerged} complete.`,
       label: `task-${nextIssue}`
     });
   }
   ```

3. **Critical issues → immediate CEO + engineer spawn**
   ```javascript
   // When critical issue created:
   sessions_spawn({ agentId: "main", task: "Triage critical", label: "triage" });
   // CEO immediately spawns engineer:
   sessions_spawn({ agentId: "eng-be", task: "Critical bug fix", label: "critical" });
   ```

### Phase 2: GitHub Webhooks (Next Week)

**Setup:**
- Configure GitHub webhook to OpenClaw
- Webhook handler parses payload
- Routes to appropriate agent spawn

**Events to handle:**
- `pull_request.opened` → spawn CTO
- `pull_request.closed` (merged) → spawn CTO for next assignment
- `issues.opened` (critical label) → spawn CEO
- `issues.assigned` → spawn engineer
- `check_run.failed` → spawn engineer to fix

### Phase 3: Smart Cron (Next Week)

**Replace unreliable checkin with focused orchestrator:**
- Every 15 minutes
- Check only: idle engineers, stale PRs, unassigned critical issues
- Spawn agents only when needed
- Don't spawn if work already in progress

**Pseudocode:**
```javascript
// cto-orchestrator (15 min cron)
const idleEngineers = getIdleEngineers();
const unassignedCritical = getUnassignedCriticalIssues();
const stalePRs = getPRsWithoutReview(2); // hours

if (unassignedCritical.length > 0) {
  spawnCEO("assign-critical");
}

if (idleEngineers.length > 0) {
  const work = getNextWorkQueue();
  if (work.length > 0) {
    spawnCTO("assign-work");
  }
}

if (stalePRs.length > 0) {
  spawnCTO("review-stale-prs");
}
```

## Communication Protocol (Updated)

### Engineer → CTO

```
DONE #22: /api/decisions | 94% cov | PR: eng-be/task-22
[Auto-triggers CTO review spawn]

BLOCKED #25: Need webhook secret | Tried env, docs
[Auto-triggers CTO unblock attempt]

PROGRESS #48: Chat UI 60% | Side panel done, wiring next
[No auto-trigger, FYI only]
```

### CTO → Engineer

```
#22 APPROVED: Merged. Next: #25 webhook handler.
[Immediate spawn of engineer with #25]

#22 CHANGES: Fix error handling per comments
[Immediate spawn of engineer with changes]

#52 PRIORITY: Stop current work. Fix auth bug.
[Immediate spawn, interrupts current work]
```

### CTO → CEO

```
Daily: Merged 3 PRs, 2 engineers active, 0 blockers
[Scheduled daily report]

URGENT: #52 auth bug. ENG-BE fixing. ETA 2hrs.
[Immediate on critical issues]

BLOCKED: Need Stripe credentials for #25
[When CTO cannot unblock]
```

## Benefits

| Metric | Before | After |
|--------|--------|-------|
| Idle time between tasks | Hours (wait for CEO) | Minutes (auto-chain) |
| Time to review PR | Hours/days | Minutes (event-triggered) |
| Critical bug response | Variable | Immediate (auto-triage) |
| Manual CEO interventions | 10+ per day | 2-3 (strategic only) |
| Engineer context switching | High (long gaps) | Low (continuous flow) |

## Key Principles

1. **Don't wait, chain immediately** — DONE → Review → Merge → Next task in one flow
2. **Critical issues interrupt** — Stop everything, fix it, resume
3. **CEO is strategic only** — Triage, priority calls, blockers — not operational
4. **CTO owns the queue** — Assignment, review, merge — fully autonomous
5. **Engineers own execution** — Code, test, report DONE — fully autonomous
6. **Events drive everything** — No polling, no waiting, immediate response

## Files to Create

1. `workspace-cto/WORKFLOW-ORCHESTRATOR.md` — Full orchestration spec
2. `workspace-cto/assignments/STATE-MACHINE.md` — State definitions
3. GitHub webhook handler (OpenClaw config)
4. Updated cron: `cto-orchestrator` (replaces `cto-checkin`)

## Immediate Actions (Tonight)

1. ✅ Update agent SOUL.md files (just completed)
2. ⏳ Implement direct chain spawning in agent exits
3. ⏳ Test with #52 auth bug — measure time from report to fix
4. ⏳ Document state machine in assignments/

## Success Metrics

- **Cycle time:** Issue created → merged (target: < 4 hours for standard tasks)
- **Review latency:** PR submitted → review started (target: < 15 minutes)
- **Idle time:** Engineer between tasks (target: < 5 minutes)
- **Critical response:** Critical issue → engineer working (target: < 2 minutes)

---

**Next step:** Implement direct chain spawning first (Phase 1), then webhooks, then smart cron.

*Document version: 2026-02-14*
*Status: Proposed, awaiting approval*