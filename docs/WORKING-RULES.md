# Development Working Rules

## Rule 1: No Direct Code Changes on Feedback
**Established:** 2026-02-13

**Rule:** When Richard (Founder) gives feedback or requests changes, NEVER modify code directly.

**Process:**
1. Create GitHub issue to track the feedback
2. Assign appropriate engineer (ENG-FE, ENG-BE, etc.)
3. Engineer implements fix on feature branch
4. CTO reviews and merges to main
5. Validate fix after merge

**Why:**
- Prevents conflicts with active engineer work
- Ensures proper branch hygiene
- Maintains CTO as quality gate
- Avoids working on wrong branch (eng-fe/pink-branding vs main)
- Keeps audit trail of all changes

**Applies to:**
- UI feedback ("change color", "remove button", "fix layout")
- Bug reports
- Feature requests
- Content changes
- Any Richard-directed work

**Exceptions:**
- Emergency hotfixes (production broken)
- Configuration changes (.env, CI/CD)
- Documentation updates (README, docs/)

---

## Rule 2: Stateless Agent Architecture
**Established:** Earlier in project

Engineers are spawned for single tasks, report DONE/BLOCKED, session ends. No persistent long-running sessions.

## Rule 3: CTO as Quality Gate
**Established:** Earlier in project

All merges to main must go through CTO review. Engineers cannot self-certify.

## Rule 4: Fresh Branches
**Established:** Earlier in project

Each task gets new branch, merged to main, branch deleted.
