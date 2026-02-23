---
title: "Production Deployment Guide"
type: guide
status: active
created: 2026-02-21
updated: 2026-02-21
owner: ENG-UX
tags: [deployment, production, operations, critical]
---

# Production Deployment Guide

Complete guide for deploying Pink Beam ARM to production.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Migration](#database-migration)
5. [Deployment Process](#deployment-process)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Rollback Procedures](#rollback-procedures)
8. [Monitoring & Alerting](#monitoring--alerting)
9. [Troubleshooting Deployment Issues](#troubleshooting-deployment-issues)

---

## Pre-Deployment Checklist

### Code Readiness

- [ ] All tests passing (unit, integration, E2E)
- [ ] Code review completed and approved by CTO
- [ ] No critical or high-severity security issues
- [ ] Documentation updated (API docs, user guide if needed)
- [ ] Feature flags configured for gradual rollout
- [ ] Database migrations reviewed for backwards compatibility
- [ ] Breaking changes documented with migration plan

### Infrastructure Readiness

- [ ] Production Supabase project created and configured
- [ ] Vercel project configured for production
- [ ] Domain DNS configured and verified
- [ ] SSL certificate active
- [ ] CDN configured (if applicable)
- [ ] Monitoring and alerting set up
- [ ] Log aggregation configured

### Data Readiness

- [ ] Database migrations tested in staging
- [ ] Seed data prepared (if needed)
- [ ] Data migration scripts tested (if applicable)
- [ ] Database backup taken before deploy
- [ ] Rollback plan documented

### Communication

- [ ] Team notified of deployment window
- [ ] Status page updated (if applicable)
- [ ] Customer communication prepared (if breaking changes)
- [ ] Support team briefed on new features/changes

---

## Infrastructure Setup

### 1. Supabase Production Project

**Create Production Project:**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Name: `pinkbeam-arm-prod`
4. Choose appropriate region (closest to majority of users)
5. Set strong database password (store in password manager)
6. Click **Create New Project**

**Configure Project:**

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Set up authentication providers
-- Go to Authentication → Providers → Email → Enable
```

**Database Settings:**

1. Go to Database → Settings
2. Enable Point-in-Time Recovery (Pro plan required)
3. Set connection pool size (default: 10, recommended: 20)
4. Configure backups (7-day retention minimum)

**API Security:**

1. Go to API → Settings
2. Enable JWT verification
3. Set JWT expiry (recommended: 3600 seconds)
4. Configure CORS origins:
   - `https://pinkbeam-arm.vercel.app`
   - `https://www.pinkbeam-arm.vercel.app` (if using www)

### 2. Vercel Production Project

**Create Project:**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import from GitHub: `pinkbeam/arm`
4. Configure:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

**Environment Variables:**

Add these in Vercel → Project Settings → Environment Variables:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# App
NEXT_PUBLIC_APP_URL=https://pinkbeam-arm.vercel.app

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_live_...
STRIPE_PRICE_PRO=price_live_...

# Email
RESEND_API_KEY=re_live_...
RESEND_FROM_EMAIL=noreply@pinkbeam.ai

# Rate Limiting
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=1000

# Security
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAMESITE=lax

# Feature Flags
NEXT_PUBLIC_FEATURE_ANALYTICS=true
NEXT_PUBLIC_FEATURE_BILLING=true
```

**Mark sensitive variables:**
- `SUPABASE_SERVICE_ROLE_KEY` → Sensitive
- `STRIPE_SECRET_KEY` → Sensitive
- `STRIPE_WEBHOOK_SECRET` → Sensitive
- `RESEND_API_KEY` → Sensitive
- `UPSTASH_REDIS_REST_TOKEN` → Sensitive

### 3. Domain Configuration

**Custom Domain (Optional):**

1. In Vercel → Project Settings → Domains
2. Add domain: `app.pinkbeam.ai`
3. Follow DNS configuration instructions
4. Wait for SSL certificate provisioning (automatic)

**DNS Records:**

```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
TTL: 3600
```

### 4. Third-Party Services

**Stripe (Live Mode):**

1. Switch to Live mode in Stripe Dashboard
2. Create products and prices
3. Configure webhook endpoint: `https://pinkbeam-arm.vercel.app/api/webhooks/stripe`
4. Copy webhook signing secret to environment variables
5. Test webhook delivery

**Resend (Live Domain):**

1. Add and verify domain in Resend
2. Create API key with sending permissions
3. Configure DKIM, SPF, DMARC records
4. Test email delivery

**Upstash Redis:**

1. Create production database
2. Choose region closest to your users
3. Copy REST URL and token
4. Test connection

---

## Environment Configuration

### Production Environment File

Create `.env.production` (do not commit):

```bash
# Supabase - Production Project
NEXT_PUBLIC_SUPABASE_URL=https://abc123def456ghi789.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application
NEXT_PUBLIC_APP_URL=https://pinkbeam-arm.vercel.app
NEXT_PUBLIC_API_URL=https://pinkbeam-arm.vercel.app/api

# Stripe - Live Mode
STRIPE_SECRET_KEY=sk_live_51ABC...
STRIPE_WEBHOOK_SECRET=whsec_abc123...
STRIPE_PRICE_STARTER=price_1ABC...
STRIPE_PRICE_PRO=price_1DEF...
STRIPE_PRICE_BUSINESS=price_1GHI...
STRIPE_PRICE_SCALE=price_1JKL...

# Email
RESEND_API_KEY=re_live_abc123...
RESEND_FROM_EMAIL=noreply@pinkbeam.ai
RESEND_FROM_NAME=Pink Beam

# Rate Limiting (Required for Production)
UPSTASH_REDIS_REST_URL=https://global-apt-bear-12345.upstash.io
UPSTASH_REDIS_REST_TOKEN=AYJyACQgZjY0YjQwMDAtZTdiNy00ZjQyLWEwZmEtZTc0MjYxYzI0OTBiYzIyMzU0NjA5MGNlNDY2MmI3MmM1Yzc0OTNjN2UzMmJjNjE=
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=1000
RATE_LIMIT_WINDOW_MS=60000

# Security (Required)
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAMESITE=lax
NEXTAUTH_URL=https://pinkbeam-arm.vercel.app

# Feature Flags
NEXT_PUBLIC_FEATURE_ANALYTICS=true
NEXT_PUBLIC_FEATURE_BILLING=true
NEXT_PUBLIC_FEATURE_EXPORTS=true
NEXT_PUBLIC_FEATURE_TEAM_INVITES=true

# Performance
NEXT_PUBLIC_DEFAULT_PAGE_SIZE=20
NEXT_PUBLIC_MAX_PAGE_SIZE=100
```

### Validation

```bash
# Validate environment before deployment
npm run validate-env -- --env=production
```

---

## Database Migration

### Pre-Migration Steps

1. **Backup Database:**
   ```bash
   # Via Supabase Dashboard
   Database → Backups → Create Backup Now
   
   # Or via pg_dump
   pg_dump postgresql://postgres:[password]@db.abc123.supabase.co:5432/postgres > backup_$(date +%Y%m%d).sql
   ```

2. **Verify Migration Compatibility:**
   ```bash
   # Run migrations against a copy of production data
   # Use staging environment first
   ```

### Running Migrations

**Option 1: Automated (via CI/CD)**

Migrations run automatically on deploy via GitHub Actions.

**Option 2: Manual**

```bash
# Connect to production database
psql postgresql://postgres:[password]@db.abc123.supabase.co:5432/postgres

# Run migrations in order
\i supabase/migrations/001_initial_schema.sql
\i supabase/migrations/002_rls_policies.sql
-- etc.
```

**Option 3: Supabase Dashboard**

1. Go to SQL Editor
2. Run each migration file in order
3. Verify success before proceeding

### Post-Migration Verification

```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- Verify indexes
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY indexname;
```

---

## Deployment Process

### 1. Prepare Release

```bash
# Update version
npm version [patch|minor|major]

# Create release branch
git checkout -b release/v0.2.0

# Update CHANGELOG.md
# Add release notes

# Commit version bump
git add .
git commit -m "chore: bump version to 0.2.0"
```

### 2. Deploy to Staging

```bash
# Merge to main (triggers staging deploy)
git checkout main
git merge release/v0.2.0
git push origin main

# Verify staging deployment
open https://staging.pinkbeam-arm.vercel.app
```

### 3. Staging Verification

**Automated Tests:**
- [ ] All CI checks pass
- [ ] E2E tests pass on staging
- [ ] Lighthouse performance audit passes

**Manual Verification:**
- [ ] Login flow works
- [ ] Create test agent
- [ ] Create test task
- [ ] Activity feed updates
- [ ] Real-time subscriptions work
- [ ] Email delivery works (if using real email)

### 4. Production Deploy

**Tag the Release:**

```bash
# Tag with version
git tag -a v0.2.0 -m "Release v0.2.0"
git push origin v0.2.0
```

**Vercel Deploy:**

Production deploys are triggered by tags in Vercel:

1. Go to Vercel Dashboard
2. Project → Deployments
3. The tagged release will appear
4. Click **Deploy** (if not auto-deployed)

**Or use Vercel CLI:**

```bash
# Deploy to production
vercel --prod

# With specific environment
vercel --prod --env=production
```

### 5. Monitor Deployment

**Watch Deploy Progress:**

```bash
# Stream Vercel logs
vercel logs --follow

# Or in dashboard
open https://vercel.com/pinkbeam/arm/deployments
```

**Key Metrics to Watch:**
- Build time (< 5 minutes target)
- Bundle size (< 200KB initial)
- No build errors
- All edge functions deployed

---

## Post-Deployment Verification

### Immediate Checks (First 5 minutes)

**Health Check:**
```bash
# API health
curl https://pinkbeam-arm.vercel.app/api/health

# Should return: {"status":"ok"}
```

**Smoke Tests:**
- [ ] Homepage loads
- [ ] Login page accessible
- [ ] Static assets load (CSS, JS, images)
- [ ] No console errors
- [ ] No 500 errors in logs

### Short-term Checks (First 30 minutes)

**Core Functionality:**
- [ ] User signup/login works
- [ ] Create agent succeeds
- [ ] Create task succeeds
- [ ] Activity feed loads
- [ ] Real-time updates work

**Performance:**
- [ ] Page load < 3 seconds
- [ ] API response < 500ms (p95)
- [ ] No timeout errors

### Long-term Checks (First 24 hours)

**Monitoring:**
- [ ] Error rate < 0.1%
- [ ] No memory leaks
- [ ] Database connections stable
- [ ] Rate limiting working

**User Activity:**
- [ ] Users can complete core flows
- [ ] No spike in support tickets
- [ ] Analytics tracking working

---

## Rollback Procedures

### When to Rollback

- Error rate > 1%
- Critical functionality broken
- Security vulnerability detected
- Performance severely degraded
- Database corruption

### Quick Rollback (Vercel)

```bash
# List recent deployments
vercel list

# Rollback to previous deployment
vercel rollback [deployment-url]

# Or in dashboard
# Vercel → Deployments → Previous Deployment → … → Redeploy
```

### Database Rollback

**If migration failed:**

```bash
# Restore from backup (if necessary)
# Contact Supabase support for point-in-time recovery

# Or revert specific migration manually
-- Write rollback SQL
-- Apply via SQL Editor
```

**Point-in-Time Recovery:**

1. Go to Supabase Dashboard → Database → Backups
2. Click **Restore**
3. Select point in time (before bad migration)
4. Confirm restoration
5. **Note:** This creates a new project, update connection strings

### Communication During Rollback

1. **Update status page** (if applicable)
2. **Notify team** in #engineering
3. **Post-mortem** after rollback complete
4. **Document learnings**

---

## Monitoring & Alerting

### Key Metrics

| Metric | Target | Alert If |
|--------|--------|----------|
| Uptime | 99.9% | < 99.5% |
| Error Rate | < 0.1% | > 0.5% |
| P95 Response Time | < 500ms | > 1s |
| P99 Response Time | < 1s | > 2s |
| Build Time | < 5 min | > 10 min |
| Database CPU | < 70% | > 85% |
| Database Connections | < 80% | > 90% |

### Monitoring Tools

**Vercel Analytics:**
- Real User Monitoring (RUM)
- Core Web Vitals
- Traffic and bandwidth

**Supabase Dashboard:**
- Database metrics
- API usage
- Realtime connections
- Storage usage

**External Monitoring:**
- Uptime monitoring (UptimeRobot, Pingdom)
- Error tracking (Sentry)
- Log aggregation (LogDNA, Datadog)

### Alerting Setup

**Vercel Alerts:**
1. Project Settings → Alerts
2. Configure webhook for deployment failures
3. Set up error rate alerts

**Supabase Alerts:**
1. Project Settings → Database → Advisors
2. Enable email alerts for:
   - High CPU usage
   - Connection limits
   - Disk space

**Custom Alerts:**

```javascript
// Example: Alert on high error rate
// Add to error tracking middleware
if (errorRate > 0.01) {
  await sendAlert({
    severity: 'critical',
    message: `Error rate is ${errorRate * 100}%`,
    service: 'api',
  });
}
```

---

## Troubleshooting Deployment Issues

### Build Failures

**"Module not found"**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**"TypeScript errors"**
```bash
# Check types locally
npx tsc --noEmit

# Fix errors, then rebuild
```

**"Out of memory during build"**
```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### Runtime Errors

**"Cannot connect to database"**
- Check Supabase project status
- Verify connection string
- Check if IP is allowlisted

**"RLS policy violation"**
- Verify tenant context is set
- Check RLS policies exist
- Verify service role key is correct

**"Rate limit exceeded"**
- Check Upstash Redis connection
- Verify rate limit settings
- Review traffic patterns

### Performance Issues

**"Slow API responses"**
1. Check database query performance
2. Review slow query logs
3. Add indexes if needed
4. Consider query optimization

**"High memory usage"**
1. Check for memory leaks
2. Review connection pooling
3. Add memory limits to functions

### SSL/Security Issues

**"Certificate errors"**
- Verify domain DNS configuration
- Check SSL certificate status in Vercel
- Allow time for certificate provisioning

**"CORS errors"**
- Update CORS origins in Supabase
- Verify NEXT_PUBLIC_APP_URL is correct
- Check API route headers

---

## Deployment Schedule

### Regular Deploys

| Environment | Frequency | Time | Owner |
|-------------|-----------|------|-------|
| Staging | Every merge | Auto | CI/CD |
| Production | Daily | 4 PM PST | CTO |
| Hotfix | As needed | Any | CTO |

### No-Deploy Times

- **Friday afternoons** (unless emergency)
- **Weekends** (unless emergency)
- **Holidays** (unless emergency)
- **During major customer events**

### Deployment Windows

**Preferred:**
- Tuesday - Thursday
- 10 AM - 4 PM PST
- Low-traffic periods

---

## Related Documentation

- [Deployment Procedures](./DEPLOYMENT.md) — Standard deployment process
- [Incident Response](./INCIDENT-RESPONSE.md) — Handling incidents
- [Environment Variables](./ENVIRONMENT.md) — Configuration reference
- [Database Setup](./DATABASE.md) — Database configuration
- [Architecture Overview](./ARCHITECTURE.md) — System architecture

---

**Questions?** Contact the CTO or #engineering channel.
