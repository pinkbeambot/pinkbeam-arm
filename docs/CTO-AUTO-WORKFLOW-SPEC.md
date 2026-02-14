# CTO Auto-Workflow Cron (20-Minute Cycle)

**Objective:** Automate issue triage, engineer assignment, and PR review/merge cycles.

## ⚠️ CRITICAL WARNINGS

**This workflow has significant risks. Review carefully before enabling:**

1. **AUTO-MERGING IS DANGEROUS** — Code without review can break production
2. **COST SPIRAL** — Spawning engineers every 20 minutes = $$$$
3. **INFINITE WORK** — System may generate unlimited PRs/issues
4. **NO HUMAN GATE** — Quality control bypassed

## Workflow Steps (Each 20-Min Cycle)

### Phase 1: PR Review & Merge (5 minutes)

```javascript
// 1. Fetch open PRs
const openPRs = await gh.pr.list({ state: 'open' });

// 2. For each PR:
for (const pr of openPRs) {
  // Check if ready for review
  if (pr.draft) continue; // Skip drafts
  if (pr.mergeStateStatus === 'BLOCKED') continue; // Skip blocked
  
  // Review checklist (automated):
  const checks = {
    ciPassing: pr.checks.ci?.conclusion === 'success',
    noConflicts: pr.mergeable === 'MERGEABLE',
    buildPasses: await runBuildCheck(pr.branch),
    testsPass: await runTestCheck(pr.branch),
    reviewedByCTO: false // Always false for auto-review
  };
  
  // ⚠️ AUTO-MERGE DECISION
  if (checks.ciPassing && checks.noConflicts && checks.buildPasses) {
    // DANGER: Merging without human code review
    await gh.pr.merge(pr.number, { squash: true });
    log(`Auto-merged PR #${pr.number}`);
  }
}
```

**PROBLEMS WITH PHASE 1:**
- ❌ No code quality review (security, logic, edge cases)
- ❌ No verification that feature actually works
- ❌ Could merge broken code that passes CI but fails in production
- ❌ No learning/feedback loop for engineers

### Phase 2: Issue Selection (3 minutes)

```javascript
// 1. Fetch open issues
const openIssues = await gh.issue.list({ state: 'open' });

// 2. Filter for "auto-doable" issues:
const autoDoable = openIssues.filter(issue => {
  // EXCLUDE if contains external service keywords:
  const externalServices = [
    'resend', 'sendgrid', 'smtp', 'email',
    'stripe', 'payment', 'billing',
    'vercel', 'deploy', 'production',
    'supabase config', 'database migration',
    'api key', 'secret', 'env var',
    'webhook', 'oauth', 'auth provider'
  ];
  
  const hasExternalService = externalServices.some(service => 
    issue.body.toLowerCase().includes(service) ||
    issue.title.toLowerCase().includes(service)
  );
  
  // EXCLUDE if assigned to someone
  if (issue.assignees.length > 0) return false;
  
  // EXCLUDE if has 'blocked', 'needs-discussion', 'question' labels
  const blockedLabels = ['blocked', 'needs-discussion', 'question', 'wontfix'];
  if (issue.labels.some(l => blockedLabels.includes(l.name))) return false;
  
  // EXCLUDE if critical/priority labels (needs human judgment)
  const criticalLabels = ['critical', 'security', 'breaking-change'];
  if (issue.labels.some(l => criticalLabels.includes(l.name))) return false;
  
  // INCLUDE only if:
  return !hasExternalService && 
         issue.labels.some(l => ['bug', 'feature', 'frontend', 'backend'].includes(l.name));
});
```

### Phase 3: Overlap Detection (2 minutes)

```javascript
// Detect overlapping issues to avoid conflicts:
const issueGroups = groupByOverlap(autoDoable);

function groupByOverlap(issues) {
  const groups = [];
  
  for (const issue of issues) {
    // Extract file paths mentioned in issue
    const mentionedFiles = extractFilePaths(issue.body);
    
    // Check if overlaps with existing group
    let added = false;
    for (const group of groups) {
      const groupFiles = group.flatMap(i => extractFilePaths(i.body));
      const overlap = mentionedFiles.some(f => groupFiles.includes(f));
      
      if (!overlap) {
        group.push(issue);
        added = true;
        break;
      }
    }
    
    if (!added) {
      groups.push([issue]);
    }
  }
  
  // Return one issue from each non-overlapping group
  return groups.map(g => g[0]).slice(0, 3); // Max 3 issues per cycle
}
```

**PROBLEMS WITH OVERLAP DETECTION:**
- ❌ Imprecise — issues may affect same code without mentioning file paths
- ❌ Misses semantic overlaps (e.g., two issues changing same behavior)
- ❌ May select issues that conflict at runtime

### Phase 4: Engineer Spawning (5 minutes)

```javascript
// Spawn engineers for selected issues:
for (const issue of selectedIssues) {
  // Determine domain:
  const domain = detectDomain(issue); // 'frontend' | 'backend' | 'ui/ux'
  
  // Select engineer:
  const engineer = selectEngineer(domain); // ENG-FE | ENG-BE | ENG-UX
  
  // Create branch:
  const branchName = `${engineer}/task-${issue.number}-${slugify(issue.title)}`;
  
  // Spawn engineer:
  sessions_spawn({
    agentId: engineer,
    task: `Implement #${issue.number}: ${issue.title}\n\n` +
          `Acceptance Criteria:\n${extractCriteria(issue.body)}\n\n` +
          `Requirements:\n` +
          `- Create branch: ${branchName}\n` +
          `- Write code WITH tests (80% BE, 60% FE coverage)\n` +
          `- Set git user.name/email before committing\n` +
          `- Test personally before reporting DONE\n` +
          `- Create PR when ready\n\n` +
          `Report: DONE #${issue.number}: <summary> or BLOCKED #${issue.number}: <reason>`,
    label: `task-${issue.number}`
  });
}
```

### Phase 5: Exit (5 minutes buffer)

```javascript
// CTO exits, waits for next cycle
// Engineers work asynchronously
// Next cycle (20 min) will pick up any completed PRs
```

## RISK ANALYSIS

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Auto-merge breaks production** | 🔴 CRITICAL | Don't auto-merge; require CTO review |
| **Unlimited cost spiral** | 🔴 CRITICAL | Cap engineers per cycle (max 3) |
| **Low quality code** | 🟡 HIGH | Require test coverage thresholds |
| **Conflicting PRs** | 🟡 HIGH | Better overlap detection needed |
| **External service issues** | 🟡 HIGH | Keyword filter may miss edge cases |
| **No learning feedback** | 🟢 MEDIUM | Human review needed for growth |

## RECOMMENDED MODIFICATIONS

### Instead of Auto-Merge:
```javascript
// QUEUE for review, don't merge:
const prQueue = openPRs.filter(pr => pr.readyForReview);
if (prQueue.length > 0) {
  sessions_send({
    sessionKey: "agent:main:cto",
    message: `🚨 ${prQueue.length} PRs need review: ${prQueue.map(p => '#' + p.number).join(', ')}`
  });
}
```

### Instead of Auto-Assign All Issues:
```javascript
// Only assign if engineer is IDLE:
const idleEngineers = getIdleEngineers();
const issuesToAssign = Math.min(idleEngineers.length, 2); // Max 2 per cycle
```

### Add Cost Control:
```javascript
const DAILY_BUDGET = 10; // Max engineer spawns per day
const todaySpawns = getTodaySpawnCount();
if (todaySpawns >= DAILY_BUDGET) {
  log('Daily engineer budget exhausted');
  return;
}
```

## ALTERNATIVE: Safer Workflow

**Every 20 minutes:**
1. **Check PRs** → Queue for CTO review (don't auto-merge)
2. **Check issues** → Identify 1-2 "safe" issues
3. **Check engineer status** → Only spawn if engineers are idle
4. **Notify CEO** → Report what was queued/assigned

**Human checkpoints:**
- CEO approves issue selection
- CTO reviews PRs before merge
- Daily budget caps enforced

## IMPLEMENTATION CHECKLIST

- [ ] Create cron job: `cto-orchestrator` (20 min)
- [ ] Add cost tracking (daily spawn limits)
- [ ] Improve overlap detection (semantic analysis)
- [ ] Build PR queue system (no auto-merge)
- [ ] Add "external service" keyword detection
- [ ] Create engineer idle detection
- [ ] Add daily budget alerts
- [ ] Test on non-critical issues first

## VERDICT

**Current plan is TOO RISKY for production.**

**Recommended:** Use modified "Safer Workflow" above with human checkpoints.
