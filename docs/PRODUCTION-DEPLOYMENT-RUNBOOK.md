# Production Deployment Runbook

**Project:** Pink Beam ARM (Agent Relationship Management)  
**Version:** 1.0  
**Last Updated:** 2026-02-21  
**Owner:** ENG-INFRA  

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Process](#deployment-process)
3. [Post-Deployment Verification](#post-deployment-verification)
4. [Rollback Procedures](#rollback-procedures)
5. [Emergency Response](#emergency-response)
6. [Environment Configuration](#environment-configuration)
7. [Monitoring & Alerting](#monitoring--alerting)
8. [Backup & Recovery](#backup--recovery)

---

## Pre-Deployment Checklist

### 1. Code Quality Gates

- [ ] All CI checks passing (CI workflow)
- [ ] TypeScript compilation successful (`tsc --noEmit`)
- [ ] ESLint checks passing (`npm run lint`)
- [ ] Unit test coverage > 80% for API routes, > 60% for components
- [ ] Critical path tests passing
- [ ] E2E tests passing (desktop and mobile)
- [ ] Lighthouse performance score ≥ 90
- [ ] No security vulnerabilities (`npm audit`)

### 2. Database Readiness

- [ ] Migrations tested in staging environment
- [ ] Migration rollback tested
- [ ] Database backup completed within last 24 hours
- [ ] RLS policies verified (all tables have tenant_id + policies)
- [ ] No destructive migrations without explicit approval
- [ ] Edge functions deployed and tested

### 3. Environment Variables

- [ ] All production secrets set in Vercel
- [ ] Sentry DSN configured
- [ ] Stripe keys configured (live mode for production)
- [ ] Supabase service role key configured
- [ ] No `DEV_AUTH_BYPASS` in production
- [ ] Resend API key configured

### 4. Third-Party Services

- [ ] Supabase project healthy (check dashboard)
- [ ] Stripe webhook endpoints configured
- [ ] Resend domain verified
- [ ] Sentry project receiving events

---

## Deployment Process

### Automated Deployment (Standard)

Deployments to production are **automatic** when code is merged to `main`:

```
main branch push
    ↓
GitHub Actions: CI workflow
    ↓
GitHub Actions: Deploy workflow
    ├── Deploy Supabase Migrations
    │   └── supabase db push
    └── Deploy to Vercel (production)
```

**Monitoring:** Watch the [Actions tab](https://github.com/pinkbeam/arm/actions) for deployment status.

### Manual Deployment (Emergency Only)

Use only when automated pipeline is broken:

```bash
# 1. Ensure you're on main with latest code
git checkout main && git pull

# 2. Install Vercel CLI
npm i -g vercel@latest

# 3. Login (if not already)
vercel login

# 4. Deploy migrations first (CRITICAL)
cd ~/code/arm
supabase link --project-ref <PROD_PROJECT_REF>
supabase db push

# 5. Deploy to Vercel
vercel --prod
```

---

## Post-Deployment Verification

### Immediate Verification (0-5 minutes)

Run these checks immediately after deployment:

```bash
# Run smoke tests
npm run test:smoke

# Verify health endpoint
curl -f https://pinkbeam.io/api/health || echo "HEALTH CHECK FAILED"
```

**Manual Verification Checklist:**
- [ ] Homepage loads (https://pinkbeam.io)
- [ ] Login page accessible
- [ ] Supabase Realtime connections working
- [ ] No 500 errors in Sentry

### Short-Term Monitoring (5-30 minutes)

- [ ] Error rate < 1% (check Sentry)
- [ ] API response times < 500ms p95 (check Vercel Analytics)
- [ ] Database connection pool healthy
- [ ] No spike in failed authentication attempts

### Long-Term Monitoring (1-24 hours)

- [ ] Daily analytics cron job completed
- [ ] Session cleanup cron job completed
- [ ] Stripe webhooks processing successfully
- [ ] Email delivery working (Resend)

---

## Rollback Procedures

### Code Rollback

**Vercel Rollback (Fastest - 2 minutes):**

1. Go to [Vercel Dashboard](https://vercel.com/pinkbeam/arm)
2. Find the previous working deployment
3. Click "Promote to Production"

**Git Revert (If Vercel rollback fails):**

```bash
# Revert the last commit
git revert HEAD

# Push to trigger new deployment
git push origin main
```

### Database Rollback

**⚠️ WARNING: Database rollbacks are destructive and complex. Use only in emergencies.**

#### Option 1: Rollback Migration (if reversible)

```bash
# Get the migration to rollback
supabase migration list

# Create revert migration (manual SQL)
# Write revert logic in: supabase/migrations/<timestamp>_revert_<name>.sql

# Deploy the revert
supabase db push
```

#### Option 2: Point-in-Time Recovery (PITR)

Use Supabase PITR to restore to a point before the migration:

1. Go to Supabase Dashboard → Database → Backups
2. Select "Point in Time Recovery"
3. Choose timestamp before migration
4. Confirm restoration (causes downtime ~5-10 minutes)

#### Option 3: Restore from Backup

See [Backup & Recovery](#backup--recovery) section.

### Edge Functions Rollback

```bash
# Deploy previous version
git checkout <previous-commit>
supabase functions deploy
```

---

## Emergency Response

### Severity Levels

| Level | Description | Response Time | Actions |
|-------|-------------|---------------|---------|
| **P0** | Complete outage, data loss | 15 min | Page on-call, begin rollback |
| **P1** | Major feature broken, security issue | 1 hour | Assess, rollback if needed |
| **P2** | Degraded performance, minor bugs | 4 hours | Schedule fix, no rollback |
| **P3** | Cosmetic issues | 24 hours | Backlog for next sprint |

### Emergency Contacts

- **On-Call Engineer:** Check PagerDuty rotation
- **CTO:** [Contact via Slack]
- **Supabase Support:** https://supabase.com/dashboard/support
- **Vercel Support:** https://vercel.com/help
- **Stripe Support:** https://support.stripe.com

### Incident Response Runbook

```
1. DETECT: Alert fires (Sentry, UptimeRobot, or user report)
   ↓
2. ACKNOWLEDGE: Claim incident in #incidents Slack channel
   ↓
3. ASSESS: Determine severity, affected users, scope
   ↓
4. MITIGATE: 
   - P0/P1: Begin rollback immediately
   - P2: Apply hotfix or schedule maintenance
   ↓
5. RESOLVE: Verify fix, close incident
   ↓
6. POST-MORTEM: Document within 24 hours (P0/P1)
```

### Quick Diagnostics

```bash
# Check Vercel deployments
vercel list

# Check Supabase status
supabase status

# View recent logs
vercel logs pinkbeam.io --production

# Check error rate (last hour)
# See Sentry dashboard: https://pinkbeam.sentry.io
```

---

## Environment Configuration

### Required Environment Variables

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# App (required)
NEXT_PUBLIC_APP_URL=https://pinkbeam.io

# Stripe (required for billing)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (required)
RESEND_API_KEY=re_...

# Monitoring (required)
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=<internal-integration-token>

# Feature Flags (optional)
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_NEW_FEATURES=false
```

### Vercel Environment Setup

```bash
# Link project
vercel link

# Add production secrets
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add RESEND_API_KEY production
vercel env add NEXT_PUBLIC_SENTRY_DSN production
vercel env add SENTRY_AUTH_TOKEN production

# Verify settings
vercel env ls production
```

---

## Monitoring & Alerting

### Dashboards

- **Sentry:** https://pinkbeam.sentry.io (errors, performance)
- **Vercel Analytics:** https://vercel.com/pinkbeam/arm/analytics
- **Supabase:** https://supabase.com/dashboard/project/_/reports
- **UptimeRobot:** https://uptimerobot.com/dashboard

### Key Metrics

| Metric | Warning | Critical | Source |
|--------|---------|----------|--------|
| Error Rate | > 1% | > 5% | Sentry |
| API p95 Latency | > 500ms | > 1000ms | Vercel |
| API p99 Latency | > 1000ms | > 3000ms | Vercel |
| Uptime | < 99.9% | < 99% | UptimeRobot |
| DB CPU | > 70% | > 90% | Supabase |
| DB Connections | > 60 | > 80 | Supabase |

### Alert Channels

- **Slack:** #alerts-production
- **Email:** oncall@pinkbeam.io
- **PagerDuty:** For P0/P1 incidents only

---

## Backup & Recovery

### Backup Schedule

| Type | Frequency | Retention | Method |
|------|-----------|-----------|--------|
| Database | Continuous | 7 days | Supabase PITR |
| Database | Daily | 30 days | Supabase automated |
| Database | Weekly | 90 days | Manual export |
| Files (Storage) | Continuous | Versioned | Supabase Storage |

### Recovery Procedures

See `docs/BACKUP-RECOVERY.md` for detailed recovery procedures.

### Backup Verification

Backups are automatically tested weekly via the `test-backup-restore.sh` script in the `scripts/` directory.

---

## Appendix

### Useful Commands

```bash
# View production logs
vercel logs pinkbeam.io --production

# Run database migration dry-run
supabase db push --dry-run

# Check migration status
supabase migration list

# Deploy edge functions
supabase functions deploy

# Run smoke tests
npm run test:smoke

# Run health check
curl https://pinkbeam.io/api/health
```

### Related Documentation

- `docs/DB-MIGRATION-RUNBOOK.md` - Database migration procedures
- `docs/BACKUP-RECOVERY.md` - Backup and disaster recovery
- `docs/MONITORING-SETUP.md` - Monitoring and alerting configuration
- `docs/PERFORMANCE-BASELINE.md` - Performance targets and budgets
- `docs/SECURITY-CHECKLIST.md` - Security review checklist

### Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-21 | 1.0 | Initial production runbook |
