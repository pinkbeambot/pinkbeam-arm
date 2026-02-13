# Pink Beam ARM — Standup Process

**Document:** Standup Cadence & Communication  
**Owner:** CTO  
**Last Updated:** 2026-02-13

---

## Daily Async Standup

### Schedule
- **Time:** 9:00 AM PST (before deep work)
- **Channel:** #engineering (Slack/Discord)
- **Format:** Text-based, async

### Template

```
**Yesterday:**
- Completed: X, Y, Z
- In progress: A (80% done)

**Today:**
- Priority 1: [task]
- Priority 2: [task]

**Blockers:**
None / [description]

**Need help with:**
Nothing / [specific question]
```

### Rules

1. **Post by 9:30 AM PST** at the latest
2. **Be specific** - include ticket numbers, PR links
3. **Flag blockers early** - don't wait for the standup if urgent
4. **Respond to teammates** - if someone needs help, reply in thread
5. **Keep it brief** - 2-3 bullet points max per section

### Example

```
**Yesterday:**
- Completed: PR #42 - Agent spawning API (merged)
- Completed: Fixed bug ENG-123 - Auth token refresh

**Today:**
- Start: ENG-45 - Agent protocol documentation
- Review: PR #43 from ENG-FE (API contract)

**Blockers:**
None

**Need help with:**
Nothing
```

---

## Synchronous Standup

### When to Hold
- **Only if** blockers need real-time discussion
- **Called by:** CTO or blocked engineer
- **Duration:** 15 minutes maximum

### Attendees
- CTO (required)
- Blocked engineer(s) (required)
- Other engineers (optional, if related)

### Format
1. **Quick round** - What are you working on? (30 sec each)
2. **Blocker discussion** - Focus on unblocking (10 min max)
3. **Action items** - Who does what by when (2 min)

---

## Weekly Sync (Fridays 4:00 PM PST)

### Schedule
- **When:** Every Friday at 4:00 PM PST
- **Duration:** 30-45 minutes
- **Attendees:** CTO, ENG-BE, ENG-FE
- **Optional:** CEO (attend if curious)

### Agenda

```
1. What Shipped (10 min)
   - Review merged PRs from the week
   - Demo new features (if any)
   - Celebrate wins

2. Current State (10 min)
   - Active work in progress
   - Upcoming priorities
   - Pipeline health (CI, coverage, etc.)

3. Blockers & Risks (10 min)
   - Current blockers
   - Technical debt concerns
   - Upcoming architectural decisions

4. Next Week Preview (5 min)
   - Top priorities
   - Assignments
   - Dependencies between FE/BE

5. Process Improvements (5 min)
   - What's working?
   - What's not working?
   - Proposed changes
```

### Output

CTO sends summary to CEO after each weekly sync:

```
**Engineering Weekly - YYYY-MM-DD**

**Shipped This Week:**
- Feature X (v0.x.x)
- Bug fix Y
- Performance improvement Z

**In Progress:**
- ENG-BE: [task]
- ENG-FE: [task]

**Blockers:**
None / [description]

**Next Week Priorities:**
1. [Priority 1]
2. [Priority 2]

**Notes:**
[Any other relevant info]
```

---

## Communication Guidelines

### #engineering Channel Usage

| Type | Channel | Response Time |
|------|---------|---------------|
| Daily standup | #engineering | Same day |
| Blockers | #engineering + tag CTO | Within 2 hours |
| Code review requests | #engineering + PR link | Within 4 hours |
| General questions | #engineering | Within 24 hours |
| Off-topic | #random | Whenever |

### Tagging Conventions

- **@cto** - Blockers, urgent issues, deployment decisions
- **@eng-be** - Backend questions, API reviews
- **@eng-fe** - Frontend questions, UI/UX decisions
- **@eng-ux** - Design questions, user flows
- **@all** - Announcements affecting everyone

### Escalation

If a blocker isn't resolved within expected time:

```
1. Tag relevant engineer → 2 hours
2. Tag CTO → 4 hours
3. Tag CEO (if critical) → 8 hours
```

---

## First Async Standup

**Date:** 2026-02-14 (Tomorrow)  
**Time:** 9:00 AM PST  
**Channel:** #engineering

### Kickoff Message (CTO to post)

```
🚀 **Daily Async Standup - Starting Tomorrow!**

To keep our distributed team aligned, we're starting daily async standups.

**When:** Every weekday at 9:00 AM PST
**Where:** Right here in #engineering
**Format:** See pinned template below

This replaces synchronous daily standups. We'll only meet live if there's a blocker that needs real-time discussion.

**Template:**
```
**Yesterday:**
- [What you completed]

**Today:**
- [What you're working on]

**Blockers:**
[None / description]

**Need help:**
[Nothing / specific ask]
```

First standup is tomorrow (Friday 2/14). See you then!
```

---

## First Weekly Sync

**Date:** 2026-02-14 (Tomorrow)  
**Time:** 4:00 PM PST  
**Attendees:** CTO, ENG-BE, ENG-FE  
**Agenda:** Kickoff + standard weekly review

---

*Document Owner: CTO*  
*Review Schedule: Monthly*  
*Next Review: 2026-03-13*
