## Description
<!-- Describe your changes in detail -->

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Test coverage improvement

## API Changes (if applicable)
<!-- For any changes to /api/* routes -->
- [ ] This PR includes changes to `/api/*` routes
- [ ] OpenAPI spec updated (`docs/openapi.yaml`)
- [ ] Shared types updated (`src/types/api.ts`)
- [ ] Breaking changes documented with migration guide

**API Review Required:** @eng-fe must approve all `/api/*` PRs before merge

## Testing
- [ ] Tests added/updated for new functionality
- [ ] All existing tests pass
- [ ] Coverage thresholds met (Backend: 80%, Frontend: 60%, Critical paths: 90%)

## Documentation
- [ ] Docs updated for architecture changes (ARCHITECTURE.md)
- [ ] Docs updated for protocol changes (AGENT-PROTOCOL.md)
- [ ] PRD updated if product behavior changed
- [ ] CLAUDE.md updated if component structure changed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] No hardcoded secrets or credentials
- [ ] No `any` types without justification
- [ ] No direct DB queries without Prisma (if applicable)
- [ ] Zod validation on all API inputs
- [ ] Backwards-compatible database migrations (no destructive changes)

## Deployment Notes
- [ ] Database migration required
- [ ] Environment variables added/changed
- [ ] Feature flag needed

## Screenshots (if applicable)
<!-- Add screenshots for UI changes -->

## Related Issues
<!-- Link to related issues: Fixes #123, Relates to #456 -->

---

**Reviewers:**
- API changes: @eng-fe (required)
- All other changes: @cto

**After Merge:**
- [ ] Deployed to staging and verified
- [ ] CTO notified for production deployment consideration
