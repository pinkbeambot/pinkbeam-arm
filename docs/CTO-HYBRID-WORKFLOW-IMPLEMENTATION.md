# CTO Hybrid Workflow System

**Implemented:** 2026-02-14
**Schedule:** Event-driven + 30-minute heartbeat
**Goal:** Minimize idle time, catch timeouts, maintain quality

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   WEBHOOKS      │     │   MESSAGES      │     │   CRON (30min)  │
│  (Real-time)    │     │  (Real-time)    │     │  (Heartbeat)    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ PR opened       │     │ Engineer DONE   │     │ Stuck detection │
│ Issue created   │     │ Engineer BLOCKED│     │ Orphaned PRs    │
│ PR updated      │     │                 │     │ Daily summary   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────┐
                    │   SPAWN CTO AGENT   │
                    │  (Review/Triage/    │
                    │   Assign/Check)     │
                    └─────────────────────┘
```

## 1. Webhook Handlers (Immediate Response)

### PR Opened/Updated
```javascript
// .github/workflows/openclaw-pr-review.yml (existing)
on:
  pull_request:
    types: [opened, synchronize, ready_for_review]
    
// Triggers:
sessions_spawn({
  agentId: "cto",
  task: `Review PR #${pr.number}: ${pr.title}\n\n` +
        `Branch: ${pr.headRefName}\n` +
        `Author: ${pr.author}\n\n` +
        `ACTION:\n` +
        `1. Checkout branch: ${pr.headRefName}\n` +
        `2. Run: npm run build && npm run test\n` +
        `3. Review code per checklist:\n` +
        `   - Correctness, security, performance\n` +
        `   - Type safety, tests, coverage\n` +
        `   - Commit attribution\n` +
        `4. Decision:\n` +
        `   APPROVE: gh pr review ${pr.number} --approve && gh pr merge ${pr.number} --squash\n` +
        `   CHANGES: gh pr review ${pr.number} --request-changes -b "<specific issues>"\n` +
        `5. Report: DONE #${pr.number}: merged (or CHANGES: <issues>)`,
  label: `review-pr-${pr.number}`,
  timeoutSeconds: 1800 // 30 min for review
});
```

### Issue Created
```javascript
// .github/workflows/openclaw-issue-triage.yml (existing)
on:
  issues:
    types: [opened]

// Triggers:
sessions_spawn({
  agentId: "cto",
  task: `Triage Issue #${issue.number}: ${issue.title}\n\n` +
        `Body: ${issue.body.substring(0, 500)}...\n\n` +
        `ACTION:\n` +
        `1. Read full issue\n` +
        `2. Determine domain: frontend/backend/infra/ui\n` +
        `3. Check if auto-doable:\n` +
        `   - NO external services (Resend, Stripe, etc.)\n` +
        `   - NO critical/security labels\n` +
        `   - NO assigned already\n` +
        `4. If auto-doable AND engineer idle:\n` +
        `   - Add label\n` +
        `   - Spawn appropriate engineer\n` +
        `5. Report: TRIAGED #${issue.number}: assigned to <engineer> (or QUEUED for manual)`,
  label: `triage-${issue.number}`,
  timeoutSeconds: 300 // 5 min for triage
});
```

## 2. Message Handlers (Engineer Lifecycle)

### Engineer Reports DONE
```javascript
// When engineer sends: "DONE #48: Chat Interface, 65% cov, PR #58"

// Parse message
const { issueNum, summary, prNum } = parseDoneMessage(message);

// Actions:
1. Update assignment tracking (ACTIVE.md → COMPLETED.md)
2. Close GitHub issue #issueNum
3. Check if engineer has next task:
   const nextIssue = getNextAssignableIssue(engineer.domain);
   if (nextIssue && !hasOverlappingFiles(nextIssue, activeIssues)) {
     sessions_spawn({
       agentId: engineer.id,
       task: `Next: #${nextIssue.number} ${nextIssue.title}\n` +
             `Previous #${issueNum} complete.`,
       label: `task-${nextIssue.number}`
     });
   } else {
     notifyCEO(`${engineer.id} idle — no suitable issues`);
   }
```

### Engineer Reports BLOCKED
```javascript
// When engineer sends: "BLOCKED #25: Missing webhook secret"

// Actions:
1. Log blocker in BLOCKERS/
2. Attempt to unblock:
   - Check if resource exists (env var, config, etc.)
   - If found: provide to engineer, mark unblocked
   - If not found: escalate to CEO
3. If can't unblock in 5 min → escalate
```

## 3. Cron: CTO Orchestrator (Every 30 Minutes)

```javascript
// cron: cto-orchestrator (30 min)
// NOT for regular work — only for:
// - Timeout detection
// - Orphaned PR detection  
// - Daily summary

cron.add({
  name: "cto-orchestrator",
  schedule: "*/30 * * * *", // Every 30 min
  sessionTarget: "isolated",
  payload: {
    kind: "agentTurn",
    message: `CTO ORCHESTRATOR — 30 Min Check

TASKS:
1. STUCK ENGINEER DETECTION
   - Check all active engineer sessions
   - If lastActivity > 60 minutes → SPAWN CTO to investigate
   - If timed out → Restart or reassign

2. ORPHANED PR DETECTION
   - Check PRs open > 2 hours with no review
   - Queue for immediate CTO review

3. DAILY SUMMARY (if 6 AM local time)
   - Merged PRs count
   - Open issues count
   - Engineer utilization
   - Blockers list

4. COST CHECK
   - If daily spend > $X → Alert CEO
   - If > $Y → Pause new spawns

Report: ORCHESTRATOR: <stuck count> stuck, <orphan count> orphaned, <summary>`,
    timeoutSeconds: 600 // 10 min for orchestrator
  }
});
```

## 4. Smart Assignment Logic

```typescript
interface AssignmentCriteria {
  // Only assign if:
  engineerIdle: boolean;           // Engineer has no active task
  noOverlappingFiles: boolean;     // Issue doesn't conflict with active work
  noExternalServices: boolean;     // No Resend/Stripe/etc needed
  skillMatch: boolean;             // Issue matches engineer domain
  priorityAppropriate: boolean;    // P0 issues get priority
}

function shouldAutoAssign(issue: Issue, engineer: Engineer): boolean {
  // Check external services
  const externalKeywords = [
    'resend', 'sendgrid', 'smtp', 'email',
    'stripe', 'payment', 'billing', 'subscription',
    'vercel', 'deploy', 'production deploy',
    'supabase config', 'database migration',
    'api key', 'secret', 'env var', 'webhook',
    'oauth', 'auth provider', 'sso'
  ];
  
  const hasExternal = externalKeywords.some(kw => 
    issue.title.toLowerCase().includes(kw) ||
    issue.body.toLowerCase().includes(kw)
  );
  
  // Check overlapping files
  const issueFiles = extractMentionedFiles(issue.body);
  const activeFiles = getActiveIssueFiles();
  const hasOverlap = issueFiles.some(f => activeFiles.includes(f));
  
  // Check skill match
  const domain = detectDomain(issue);
  const skillMatch = engineer.domain === domain;
  
  return !hasExternal && !hasOverlap && skillMatch && engineer.idle;
}
```

## 5. File Structure

```
workspace-cto/
├── assignments/
│   ├── ACTIVE.md              # Current work
│   ├── COMPLETED.md           # Finished work
│   └── BLOCKERS/              # Current blockers
├── GITHUB-HOOKS.md            # Webhook handler playbooks
├── WORKFLOW-ORCHESTRATOR.md   # This file
└── cron/
    └── cto-orchestrator.json  # Cron config
```

## 6. Cost Controls

```javascript
const DAILY_LIMITS = {
  maxEngineerSpawns: 45,        // Max per day (~2 per hour)
  maxCTOSpawns: 50,             // CTO reviews + orchestrator
  maxCostUSD: 15.00,            // Alert threshold
  hardStopCostUSD: 30.00        // Pause new work
};

function checkDailyBudget(): boolean {
  const today = getTodaySpawns();
  const cost = getTodayCost();
  
  if (cost > DAILY_LIMITS.hardStopCostUSD) {
    alertCEO(`🚨 DAILY BUDGET EXCEEDED: $${cost}. Pausing new work.`);
    return false;
  }
  
  if (cost > DAILY_LIMITS.maxCostUSD) {
    alertCEO(`⚠️ Daily cost at $${cost}/${DAILY_LIMITS.maxCostUSD}. Approaching limit.`);
  }
  
  return today.engineer < DAILY_LIMITS.maxEngineerSpawns;
}
```

## 7. Implementation Steps

1. **Update cron schedule** (30 min instead of 20)
2. **Verify webhooks** (PR review + issue triage)
3. **Create message handlers** (DONE, BLOCKED)
4. **Add cost tracking**
5. **Test on 1-2 issues** before full deployment

## Success Metrics

- **Idle time:** < 10% (engineers always have work or clear reason for idle)
- **PR review time:** < 1 hour (webhook immediate + orphaned detection)
- **Stuck engineer detection:** < 60 minutes
- **Cost:** Predictable daily budget
- **Quality:** CTO reviews all PRs (no auto-merge)

---
*Status: Ready for implementation*
