# Pink Beam ARM — Event-Driven Reporting

**Document:** Reporting Protocol  
**Owner:** CTO  
**Last Updated:** 2026-02-13

---

## Philosophy

Agents work in hours, not days. Scheduled standups create noise and delay blocker resolution. This protocol matches agent speed and surfaces issues immediately.

**No scheduled standups.** The CTO responds to signals, not calendar.

---

## Agent Signal Protocol

Agents report ONLY on state changes:

### 1. DONE #[issue]: [summary]

Task or issue is complete. Triggers validation/closure workflow.

**Format:**
```
DONE #[issue-number]: [1-sentence summary of what was accomplished]
```

**Example:**
```
DONE #20: /api/agents CRUD endpoints with 94% coverage
```

**CTO Response:**
- Validate work against acceptance criteria
- Run tests / verify coverage
- Close issue with summary comment
- Assign next work if applicable

---

### 2. BLOCKED #[issue]: [what's needed]

Cannot proceed without help. Triggers immediate unblocking action.

**Format:**
```
BLOCKED #[issue-number]: [specific blocker + exactly what's needed]
```

**Example:**
```
BLOCKED #22: Need schema decision on decision_logs table structure
```

**CTO Response:**
- Respond immediately (within reason)
- Provide decision, resource, or escalation
- Escalate to CEO if CTO cannot unblock
- Do not let blockers sit overnight

---

### 3. PROGRESS #[issue]: [milestone]

Optional. Use sparingly for long-running issues or significant milestones.

**Format:**
```
PROGRESS #[issue-number]: [what's working + current state]
```

**Example:**
```
PROGRESS #25: Edge function scaffold complete, runtime wiring in progress
```

**CTO Response:**
- Acknowledge receipt
- No action required
- Use for awareness only

---

## Signal Channels

| Signal | Channel | Urgency |
|--------|---------|---------|
| DONE | #engineering | Normal |
| BLOCKED | #engineering + tag @cto | High |
| PROGRESS | #engineering | Low |

---

## CTO Response Protocol

| Signal | Action | Timeline |
|--------|--------|----------|
| **DONE** | Validate → Test → Close → Summarize | Within 4 hours |
| **BLOCKED** | Unblock immediately → Escalate if needed | Within 1 hour |
| **PROGRESS** | Acknowledge → No action | Within 24 hours |

---

## What NOT To Do

❌ **No daily "what I'm working on" updates**  
❌ **No "no blockers today" reports**  
❌ **No weekly sync meetings**  
❌ **No recurring calendar invites**

---

## Examples in Practice

### Good Signals

```
DONE #18: Agent spawn endpoint with validation and 87% test coverage
```

```
BLOCKED #24: Need Stripe test key to finish billing webhook tests
```

```
PROGRESS #30: Database migration written, testing against staging now
```

### Bad Signals (Don't Do This)

```
Today I'm going to work on the agent API
```
→ **Why:** No state change. Not actionable.

```
No blockers, making progress
```
→ **Why:** Noise. Only report when blocked.

```
Weekly update: finished 3 things this week
```
→ **Why:** Batching hides signal timing. Report as DONE when each finishes.

---

## Rationale

**Why event-driven works for agents:**

1. **Speed:** Agents complete work in hours. Daily standups are 8-hour cycles—too slow.
2. **Signal-to-noise:** Only meaningful state changes are reported.
3. **Blockers surface fast:** No waiting for "the next standup" to unblock.
4. **CTO efficiency:** Respond to actual events, not scheduled interruptions.

**Traditional standups are for humans.** This protocol is designed for agent throughput.

---

*Document Owner: CTO*  
*Review Schedule: As needed*  
*Questions: Tag @cto in #engineering*
