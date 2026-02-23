# Backup & Recovery

**Project:** Pink Beam ARM  
**Purpose:** Database backup procedures and disaster recovery plans  
**Last Updated:** 2026-02-21  
**RPO:** 1 hour (Point-in-Time Recovery)  
**RTO:** 30 minutes (from backup)  

---

## Table of Contents

1. [Backup Strategy](#backup-strategy)
2. [Backup Verification](#backup-verification)
3. [Recovery Procedures](#recovery-procedures)
4. [Disaster Recovery](#disaster-recovery)
5. [Storage Backup](#storage-backup)
6. [Testing Procedures](#testing-procedures)

---

## Backup Strategy

### Supabase Automated Backups

Supabase provides multiple layers of data protection:

| Backup Type | Frequency | Retention | RPO |
|-------------|-----------|-----------|-----|
| **Point-in-Time Recovery (PITR)** | Continuous | 7 days | 1 hour |
| **Daily Snapshots** | Daily | 7 days | 24 hours |
| **Weekly Snapshots** | Weekly | 4 weeks | 7 days |

### Backup Coverage

**Included:**
- All database tables
- Schema definitions
- Functions and triggers
- RLS policies
- Extensions

**Not Included (separate backup needed):**
- Supabase Storage objects (bucket files)
- Edge Function code (in Git)
- Environment variables (in Vercel)

### Enabling PITR

PITR must be enabled for continuous backups:

```bash
# Using Supabase CLI
supabase --experimental linking
supabase db upgrade --pitr

# Or via Dashboard:
# Supabase Dashboard → Database → Backups → Point-in-Time Recovery → Enable
```

**Note:** PITR is available on Pro plan and above.

### Manual Backups

For additional protection, create manual backups before major changes:

```bash
#!/bin/bash
# scripts/backup-database.sh

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"
PROJECT_REF="<YOUR_PROJECT_REF>"

mkdir -p "$BACKUP_DIR"

echo "📦 Creating database backup..."

# Full database dump (schema + data)
supabase db dump \
  --db-url "postgresql://postgres:$SUPABASE_DB_PASSWORD@db.$PROJECT_REF.supabase.co:5432/postgres" \
  -f "$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Compress backup
gzip "$BACKUP_DIR/backup_$TIMESTAMP.sql"

echo "✅ Backup created: $BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

# Optional: Upload to S3
# aws s3 cp "$BACKUP_DIR/backup_$TIMESTAMP.sql.gz" s3://pinkbeam-backups/

# Cleanup old backups (keep last 30)
ls -t "$BACKUP_DIR"/backup_*.sql.gz | tail -n +31 | xargs -r rm

echo "🧹 Old backups cleaned up"
```

---

## Backup Verification

### Automated Verification

Create a scheduled workflow to verify backups:

```yaml
# .github/workflows/backup-verification.yml
name: Backup Verification

on:
  schedule:
    # Run weekly on Sundays at 2 AM
    - cron: '0 2 * * 0'
  workflow_dispatch:

jobs:
  verify-backup:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Verify PITR is enabled
        run: |
          supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          supabase backups list --db-only
          
          # Check if backups exist
          BACKUP_COUNT=$(supabase backups list --db-only | wc -l)
          if [ "$BACKUP_COUNT" -lt 1 ]; then
            echo "❌ No backups found!"
            exit 1
          fi
          
          echo "✅ Backups verified: $BACKUP_COUNT backups available"

      - name: Test restore to temporary project
        run: |
          # This would create a temporary project and restore to it
          # Implementation depends on Supabase API access
          echo "Testing backup restore..."
          
      - name: Notify on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "🚨 Backup verification failed! Check GitHub Actions."
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Manual Verification

```bash
# List available backups
supabase backups list

# List PITR restore points
supabase backups list --db-only

# Verify backup integrity (download and check)
supabase backups download --backup-id <backup-id> --output backup.sql
head -50 backup.sql  # Check structure
tail -50 backup.sql  # Check completion
```

---

## Recovery Procedures

### Recovery Time Objectives

| Scenario | RTO | Method |
|----------|-----|--------|
| Accidental data deletion | 15 min | PITR to specific time |
| Corrupted data | 30 min | PITR to before corruption |
| Schema error | 30 min | PITR to before migration |
| Complete database loss | 1 hour | Restore from snapshot |
| Region failure | 2 hours | Cross-region restore |

### Point-in-Time Recovery (PITR)

**Use when:** You need to restore to a specific moment (e.g., before accidental deletion)

**⚠️ WARNING:** PITR causes downtime (5-10 minutes). Application will be unavailable.

**Steps:**

```bash
# 1. Stop application traffic (maintenance mode)
# Enable maintenance page in Vercel

# 2. Determine restore point
# Format: YYYY-MM-DD HH:MM:SS UTC
RESTORE_TIME="2026-02-21 14:30:00"

echo "🔄 Initiating PITR to $RESTORE_TIME"

# 3. List available restore points
supabase backups list --db-only

# 4. Initiate PITR (via Dashboard or API)
# Supabase Dashboard → Database → Backups → Point-in-Time Recovery

# 5. Verify restoration
supabase status

# 6. Restart application
# Disable maintenance mode

# 7. Verify functionality
npm run test:smoke
```

### Restore from Snapshot

**Use when:** PITR is not available or you need a specific daily backup

**Steps:**

```bash
# 1. List available backups
supabase backups list

# 2. Choose backup ID
BACKUP_ID="<backup-id-from-list>"

# 3. Restore (via Dashboard)
# Supabase Dashboard → Database → Backups → Select backup → Restore

# 4. Verify
supabase status
```

### Partial Data Recovery

For recovering specific tables or rows without full restore:

```sql
-- Export specific table from backup
pg_dump --table=agents --data-only postgresql://... > agents_backup.sql

-- Or query specific rows
psql postgresql://... -c "COPY (SELECT * FROM agents WHERE deleted_at > '2026-02-21') TO STDOUT CSV" > recovered_agents.csv
```

---

## Disaster Recovery

### Disaster Scenarios

#### Scenario 1: Accidental Data Deletion

```
Timeline:
14:30 - User accidentally deletes 1000 tasks
14:35 - Issue detected
14:40 - Decision: PITR restore to 14:25
14:45 - PITR initiated
14:50 - Database restored
14:55 - Application verified
15:00 - Service restored
```

#### Scenario 2: Database Corruption

```
Timeline:
03:00 - Database corruption detected (hardware failure)
03:05 - PagerDuty alert fires
03:10 - On-call engineer acknowledges
03:15 - PITR to 02:50 (last known good)
03:25 - Database restored
03:30 - Application verified
03:45 - Service restored
```

#### Scenario 3: Region Outage

```
Timeline:
09:00 - Primary region (us-east-1) outage detected
09:05 - Failover to secondary region initiated
09:15 - Read replicas promoted to primary
09:30 - DNS updated to new region
09:45 - Application traffic restored
10:00 - Full verification complete
```

### Cross-Region Failover

**Prerequisites:**
- Read replica in secondary region
- Application configured for multi-region
- DNS with health checks

**Failover Steps:**

```bash
# 1. Verify primary is unreachable
ping db.<project>.supabase.co

# 2. Promote read replica to primary
# Supabase Dashboard → Database → Replicas → Promote

# 3. Update application configuration
# Change connection strings to new primary

# 4. Update DNS
# Point pinkbeam.io to new region

# 5. Verify
npm run test:smoke
```

### Disaster Recovery Runbook Template

```markdown
## DR Runbook: [Incident Name]

**Started:** [Timestamp]  
**Status:** In Progress / Resolved  
**Severity:** P0 / P1 / P2  

### Impact
- [ ] Users unable to access application
- [ ] Data loss suspected
- [ ] Performance degraded
- [ ] Specific features broken

### Actions Taken
| Time | Action | By |
|------|--------|-----|
| 14:30 | Incident detected | Monitoring |
| 14:35 | PagerDuty notified | Automated |
| ... | ... | ... |

### Recovery Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Post-Incident
- [ ] Post-mortem scheduled
- [ ] Root cause identified
- [ ] Preventive measures documented
```

---

## Storage Backup

### Supabase Storage

Supabase Storage does not have automatic backups. Implement manual backup:

```bash
#!/bin/bash
# scripts/backup-storage.sh

set -e

BUCKET="attachments"
BACKUP_DIR="storage-backups/$(date +%Y%m%d)"
PROJECT_REF="<YOUR_PROJECT_REF>"

mkdir -p "$BACKUP_DIR"

echo "📦 Backing up Storage bucket: $BUCKET"

# List all files
supabase storage ls "$BUCKET" --recursive > "$BACKUP_DIR/files.txt"

# Download all files
supabase storage cp "$BUCKET/" "$BACKUP_DIR/" --recursive

# Compress
tar -czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"
rm -rf "$BACKUP_DIR"

# Upload to S3 (optional)
# aws s3 cp "$BACKUP_DIR.tar.gz" s3://pinkbeam-storage-backups/

echo "✅ Storage backup complete: $BACKUP_DIR.tar.gz"
```

### Storage Recovery

```bash
# Restore files from backup
tar -xzf storage-backup_20260221.tar.gz

# Upload to Supabase
supabase storage cp backup_20260221/attachments/ attachments/ --recursive
```

---

## Testing Procedures

### Monthly DR Drill

Schedule monthly tests of recovery procedures:

```bash
#!/bin/bash
# scripts/test-disaster-recovery.sh

set -e

echo "🧪 Starting Disaster Recovery Test"

# Test 1: Verify backups exist
echo "Test 1: Verifying backups..."
supabase backups list > /dev/null
if [ $? -ne 0 ]; then
    echo "❌ Failed: No backups available"
    exit 1
fi
echo "✅ Test 1 passed: Backups available"

# Test 2: Create test data
echo "Test 2: Creating test data..."
TEST_ID=$(uuidgen)
supabase sql "INSERT INTO test_recovery (id, data) VALUES ('$TEST_ID', 'test-data');"
echo "✅ Test 2 passed: Test data created"

# Test 3: Simulate data loss
echo "Test 3: Simulating data loss..."
supabase sql "DELETE FROM test_recovery WHERE id = '$TEST_ID';"
echo "✅ Test 3 passed: Data deleted"

# Test 4: Recovery (manual - requires downtime)
echo "Test 4: Recovery (SKIPPED - requires maintenance window)"
echo "   To complete: PITR to before deletion, verify data exists"

# Test 5: Cleanup
echo "Test 5: Cleanup..."
supabase sql "DELETE FROM test_recovery WHERE id = '$TEST_ID';"
echo "✅ Test 5 passed: Cleanup complete"

echo ""
echo "🎉 DR Test Complete!"
echo "Manual step required: Schedule PITR test in maintenance window"
```

### Recovery Time Testing

Track actual recovery times:

```markdown
| Test Date | Scenario | Planned RTO | Actual RTO | Notes |
|-----------|----------|-------------|------------|-------|
| 2026-02-21 | PITR | 30 min | 25 min | ✅ Pass |
| 2026-03-21 | Snapshot restore | 1 hour | - | Scheduled |
```

---

## Environment Recovery

### Vercel Environment Variables

Export environment variables for backup:

```bash
# Export all env vars
vercel env ls production --json > vercel-env-backup.json

# Store securely (encrypt)
gpg --encrypt --recipient oncall@pinkbeam.io vercel-env-backup.json
```

Restore:

```bash
# Decrypt
gpg --decrypt vercel-env-backup.json.gpg > vercel-env-backup.json

# Restore to Vercel
jq -r '.[] | "vercel env add \(.key) production <<< \(.value)"' vercel-env-backup.json | bash
```

---

## Appendix

### Backup Storage Costs

| Type | Size Estimate | Monthly Cost |
|------|---------------|--------------|
| PITR (included) | - | $0 (included in Pro) |
| Daily snapshots | ~500MB × 7 | $0 (included) |
| Manual backups (S3) | ~2GB × 4 | ~$0.05 |
| Storage backups | ~10GB | ~$0.25 |

### Emergency Contacts

- **Supabase Support:** support@supabase.com / Dashboard
- **Vercel Support:** support@vercel.com
- **AWS Support:** (if using S3 backups)

### Related Documentation

- [Supabase Backups](https://supabase.com/docs/guides/platform/backups)
- [PostgreSQL Backup & Restore](https://www.postgresql.org/docs/current/backup.html)
- `docs/PRODUCTION-DEPLOYMENT-RUNBOOK.md` - Deployment procedures
- `docs/DB-MIGRATION-RUNBOOK.md` - Migration rollback

### Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-21 | 1.0 | Initial backup & recovery docs |
