---
title: "CI/CD Pipeline"
type: operations
status: active
created: 2026-02-13
updated: 2026-02-15
owner: CTO
tags: [operations, deployment, critical]
aliases: ["CI/CD", "Continuous Integration"]
---

# CI/CD Setup Guide

## GitHub Secrets Required

The following secrets must be configured in GitHub (Settings > Secrets and variables > Actions):

### Vercel Deployment
- `VERCEL_TOKEN` - Vercel personal access token
- `VERCEL_ORG_ID` - Vercel organization ID (from `.vercel/project.json`)
- `VERCEL_PROJECT_ID` - Vercel project ID (from `.vercel/project.json`)

### Supabase
- `SUPABASE_ACCESS_TOKEN` - Supabase personal access token
- `SUPABASE_PROJECT_REF` - Supabase project reference (e.g., `abc123def456`)
- `SUPABASE_DB_PASSWORD` - Database password (if needed for direct connections)

### Application Environment
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (client-safe)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only)

## GitHub Branch Protection

Enable the following for the `main` branch:
- Require status checks to pass before merging
  - `Type Check` (ci.yml)
  - `Lint` (ci.yml)
  - `Test` (ci.yml)
  - `Build` (ci.yml)
  - `Supabase Migrations Check` (ci.yml)
- Require pull request reviews before merging
- Require up-to-date branches before merging

## Vercel Project Settings

1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Set production branch to `main`
4. Enable preview deployments for pull requests

## Supabase Setup

1. Install Supabase CLI locally:
   ```bash
   npm install -g supabase
   ```

2. Link project:
   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   ```

3. Migrations are automatically deployed on push to main via GitHub Actions

## Workflows

### CI Workflow (`.github/workflows/ci.yml`)
Runs on every PR and push to main:
- Type checking with TypeScript
- Linting with ESLint
- Unit tests with Vitest
- Build verification
- Migration validation

### Deploy Workflow (`.github/workflows/deploy.yml`)
Runs on push to main:
- Deploys Supabase migrations
- Deploys Edge Functions
- Deploys to Vercel production

## Preview Deployments

Pull requests automatically get preview deployments on Vercel. The preview URL will be posted as a comment on the PR.

## Local Development

```bash
# Install dependencies
npm install

# Run type check
npx tsc --noEmit

# Run linter
npm run lint

# Run tests
npm run test

# Start dev server
npm run dev
```

---

## Related Documentation

- [[DEPLOYMENT]] — Deployment procedures and environments
- [[DEVELOPMENT-PROCESS]] — Development process with CI/CD integration
- [[TESTING-STANDARDS]] — Test pipeline executed by CI
- [[INCIDENT-RESPONSE]] — Rollback procedures triggered by CI failures
