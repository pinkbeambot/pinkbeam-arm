# Pink Beam ARM — Deployment Process

**Document:** Deployment Procedures  
**Owner:** CTO  
**Last Updated:** 2026-02-13

---

## Environments

| Environment | URL | Branch | Database | Deploy Trigger |
|-------------|-----|--------|----------|----------------|
| Production | `https://pinkbeam-arm.vercel.app` | `main` (tagged) | Production Supabase | Manual (CTO) |
| Staging | `https://staging.pinkbeam-arm.vercel.app` | `main` | Staging Supabase | Auto (every merge) |
| Preview | Vercel preview URLs | PR branches | Staging Supabase | Auto (every PR) |

---

## Staging Environment

### Setup (Completed)

- [x] Vercel project configured for staging
- [x] Staging domain: `staging.pinkbeam-arm.vercel.app`
- [x] Staging Supabase project connected
- [x] Auto-deploy enabled on merge to `main`

### Staging Configuration

```bash
# Vercel environment variables for staging
NEXT_PUBLIC_SUPABASE_URL=https://[staging-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[staging-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[staging-service-key]
VERCEL_ENV=staging
```

### Staging Usage

- Every merge to `main` auto-deploys to staging
- Engineers should verify features on staging before prod deploy
- Staging data is separate from production
- Database migrations run automatically on staging deploy

---

## Production Deployment

### Schedule

| Type | Schedule | Owner | Notes |
|------|----------|-------|-------|
| Daily Deploy | 4:00 PM PST | CTO | If tests pass, no critical bugs |
| Hotfix | Immediate | CTO | Security/critical bugs only |
| Feature Flag | Anytime | CTO | For gradual rollouts |

### Rules

1. **No Friday afternoon prod deploys** (unless emergency)
2. **CTO discretion** on all production deployments
3. **Staging verification required** before prod
4. **10-minute monitoring** after each deploy

### Deployment Process

#### Standard Deploy (Daily @ 4 PM PST)

```bash
# 1. Verify staging is healthy
curl https://staging.pinkbeam-arm.vercel.app/api/health

# 2. Check CI status (all green)
gh run list --limit 5

# 3. Tag the release
git checkout main
git pull origin main
git tag v0.x.x  # increment version
git push origin v0.x.x

# 4. Vercel auto-deploys tagged releases to production
#    (configured in Vercel project settings)

# 5. Monitor for 10 minutes
# Watch Vercel deploy logs and error tracking
```

#### Hotfix Deploy (Emergency)

```bash
# 1. Create hotfix branch from main
git checkout -b hotfix/critical-fix

# 2. Make minimal fix
# 3. Fast-track PR review (CTO + 1 engineer)
# 4. Merge to main
# 5. Tag and deploy immediately
git tag v0.x.x-hotfix.1
git push origin v0.x.x-hotfix.1

# 6. Extended monitoring (30 minutes)
```

### Release Tagging Convention

```
v{major}.{minor}.{patch}[-{prerelease}]

Examples:
v0.1.0      # Initial release
v0.1.1      # Patch release
v0.2.0      # Minor release (new features)
v1.0.0      # Major release (breaking changes)
v0.1.2-beta.1  # Pre-release
```

### Pre-Deploy Checklist

- [ ] Staging deployment successful and verified
- [ ] All CI checks passing
- [ ] No open SEV-1/SEV-2 issues
- [ ] Database migrations reviewed (backwards-compatible)
- [ ] Database backup taken (if schema changes)
- [ ] Rollback plan ready
- [ ] Not Friday afternoon (unless emergency)

### Post-Deploy Checklist

- [ ] Production health check passes
- [ ] Error rate normal (check for 10 minutes)
- [ ] Critical features tested (login, billing, agents)
- [ ] No new Sentry errors
- [ ] Update #engineering with deploy summary

---

## Rollback

See [INCIDENT-RESPONSE.md](./INCIDENT-RESPONSE.md) for full rollback procedures.

Quick rollback:

```bash
# Rollback to previous tag
git tag | sort -V | tail -2  # find previous tag
git checkout v0.x.x-previous

# Or use rollback script
./scripts/rollback.sh
```

---

## Release Communication

### Weekly Summary to CEO

Every Friday at 4 PM (after weekly sync), send to CEO:

```
**Week of YYYY-MM-DD - Engineering Summary**

**Shipped:**
- Feature A (v0.x.x)
- Fix B (v0.x.x)
- Improvement C (v0.x.x)

**In Progress:**
- Feature D (ENG-FE)
- Feature E (ENG-BE)

**Blockers:**
- None / [description]

**Next Week:**
- Priority 1
- Priority 2
```

### Monthly Changelog for Users

Published to:
- In-app changelog (if available)
- Email newsletter
- Status page

Format:
```markdown
## February 2026 Updates

### New Features
- Feature A - Description

### Improvements
- Performance improvement X

### Bug Fixes
- Fixed issue with Y
```

---

## Vercel Configuration

### Project Settings

**Production:**
- Framework Preset: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm ci`

**Environment Variables:**
```
# Production
NEXT_PUBLIC_SUPABASE_URL=https://[prod-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[prod-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[prod-service-key]
VERCEL_ENV=production

# Staging
NEXT_PUBLIC_SUPABASE_URL=https://[staging-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[staging-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[staging-service-key]
VERCEL_ENV=staging
```

### Deploy Hooks

Configure in Vercel:
1. Production deploy hook triggers on git tag push
2. Staging auto-deploys on every `main` merge

---

## Monitoring

### Key Metrics

| Metric | Target | Alert If |
|--------|--------|----------|
| Uptime | 99.9% | < 99.5% |
| Error Rate | < 0.1% | > 1% |
| P95 Response Time | < 500ms | > 1s |
| Deploy Frequency | Daily | > 3 days |

### Tools

- **Vercel Analytics:** Performance monitoring
- **Supabase Dashboard:** Database health
- **GitHub Actions:** CI/CD status

---

*Document Owner: CTO*  
*Review Schedule: Monthly*  
*Next Review: 2026-03-13*
