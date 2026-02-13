# Pink Beam ARM — Incident Response

**Document:** Incident Response & Rollback Procedures  
**Owner:** CTO  
**Last Updated:** 2026-02-13

---

## Severity Levels

| Level | Name | Criteria | Response Time | Examples |
|-------|------|----------|---------------|----------|
| SEV-1 | Critical | Complete service outage, data loss, security breach | Immediate | Database down, auth broken, billing compromised |
| SEV-2 | High | Major feature broken, significant user impact | 30 minutes | Agent spawning failing, sync broken |
| SEV-3 | Medium | Partial degradation, workaround available | 2 hours | Performance degraded, non-critical bug |
| SEV-4 | Low | Minor issue, cosmetic | Next business day | UI glitch, typo |

---

## Rollback Triggers

Immediate rollback is required when:

1. **Error rate >1% for 5 consecutive minutes**
2. **Critical feature broken:**
   - Authentication/login
   - Billing/subscription
   - Agent spawning/management
   - Real-time sync (if user-facing)
3. **Data integrity issues**
4. **Security vulnerability**
5. **CEO/CTO decision**

---

## Rollback Process

### 1. Decision (CTO)
```
DECIDE: Is rollback necessary?
├── YES → Execute rollback (go to step 2)
└── NO → Monitor and document decision
```

### 2. Execute Rollback

```bash
# Option A: Revert last commit (if not tagged)
git revert HEAD --no-edit
git push origin main

# Option B: Deploy previous tag (if tagged)
git tag  # find previous tag
git checkout v0.x.x  # previous stable version
vercel --prod  # or trigger via GitHub Actions

# Use the automated rollback script
./scripts/rollback.sh [OPTIONAL_TAG]
```

### 3. Database Rollback (if migration ran)

**CRITICAL:** All migrations must be backwards-compatible.

```bash
# If destructive migration was deployed:
# 1. Restore from backup (if needed)
supabase db dump --db-url $STAGING_DB_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run compensating migration (pre-written)
supabase migration up

# 3. Verify data integrity
npm run test:db:integrity
```

### 4. Verify Rollback

- [ ] Staging deployment successful
- [ ] Error rate back to baseline
- [ ] Critical features functional
- [ ] No new errors in logs

### 5. Notify

| Audience | Channel | Content |
|----------|---------|---------|
| CEO | Slack DM | Incident summary + rollback status |
| Engineering | #engineering | Brief technical summary |
| Users | Status page | If user-facing impact |

### 6. Post-Mortem (within 24 hours)

Document in `docs/incidents/YYYY-MM-DD-brief-description.md`:

```markdown
# Incident: [Brief Title]

**Date:** YYYY-MM-DD  
**Duration:** HH:MM  
**Severity:** SEV-1/2/3/4  
**Reporter:** Name  

## Summary
One paragraph summary of what happened.

## Timeline
- HH:MM - Issue detected (how?)
- HH:MM - Rollback initiated
- HH:MM - Service restored

## Root Cause
What caused the incident?

## Impact
- Users affected: X
- Data lost/corrupted: Y/N
- Revenue impact: $Z

## Resolution
How was it fixed?

## Lessons Learned
What should we do differently?

## Action Items
- [ ] Item 1 (owner, due date)
- [ ] Item 2 (owner, due date)
```

---

## Database Safety Rules

### Migration Requirements

1. **All migrations must be backwards-compatible**
2. **Destructive changes require 3-step process:**
   - Step 1: Add new columns/tables (backwards-compatible)
   - Step 2: Migrate data in application layer
   - Step 3: Remove old columns/tables (after verification)

### Allowed Operations
- ✅ `ALTER TABLE ... ADD COLUMN`
- ✅ `CREATE TABLE`
- ✅ `CREATE INDEX` (CONCURRENTLY)
- ❌ `ALTER TABLE ... DROP COLUMN` (requires 3-step)
- ❌ `ALTER TABLE ... ALTER COLUMN` (requires 3-step)

### Pre-Deployment Checklist (DB Changes)

- [ ] Migration reviewed by ENG-BE
- [ ] Backup taken: `supabase db dump`
- [ ] Compensating migration pre-written (for destructive changes)
- [ ] Staging migration tested
- [ ] Rollback plan documented in PR

---

## Emergency Contacts

| Role | Slack | Phone |
|------|-------|-------|
| CEO | @valis | On-file |
| CTO | @cto | On-file |
| ENG-BE | @eng-be | — |
| ENG-FE | @eng-fe | — |

---

## Escalation Path

```
SEV-1 (Critical)
├── CTO immediately
├── If no response in 15 min → CEO
└── If no response in 30 min → All engineers

SEV-2 (High)
├── CTO within 30 minutes
└── If no response → Eng team async

SEV-3/4
└── Standard triage process
```

---

## Runbooks

### Database Backup (Pre-Deployment)

```bash
#!/bin/bash
# scripts/backup-db.sh

ENV=${1:-staging}
DATE=$(date +%Y%m%d_%H%M%S)

if [ "$ENV" == "production" ]; then
  DB_URL=$PRODUCTION_DB_URL
else
  DB_URL=$STAGING_DB_URL
fi

echo "Backing up $ENV database..."
supabase db dump --db-url $DB_URL > backups/${ENV}_${DATE}.sql

echo "Backup complete: backups/${ENV}_${DATE}.sql"
```

### Service Health Check

```bash
#!/bin/bash
# Quick health check

curl -s https://pinkbeam-arm.vercel.app/api/health | jq .

# Expected output:
# {
#   "status": "healthy",
#   "timestamp": "2026-02-13T...",
#   "version": "v0.x.x"
# }
```

---

*Document Owner: CTO*  
*Review Schedule: Monthly*  
*Next Review: 2026-03-13*
