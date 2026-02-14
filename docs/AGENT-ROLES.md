# Agent Roles & Testing Enforcement

**Updated:** 2026-02-13  
**Status:** Active and Enforced

---

## New Working Rule (Testing)

**"No code without tests. No merge without coverage."**

This rule is now **hard-coded** into all agent identities and enforced by CTO.

---

## Testing Standards Documentation

### Core Documents Created:

1. **`docs/TESTING-STANDARDS.md`** — Comprehensive testing guide
   - Unit, integration, component, E2E, visual tests
   - Coverage thresholds by code type
   - CI/CD integration
   - Test writing best practices

2. **`docs/CTO-IDENTITY.md`** — CTO role with testing enforcement
   - Quality gate responsibilities
   - PR review checklist with testing requirements
   - Coverage threshold enforcement
   - Hard rules (no exceptions)

3. **`docs/ENG-BE-IDENTITY.md`** — Backend engineer with testing requirements
   - API testing standards
   - Unit & integration test requirements
   - Coverage thresholds (80% unit, 70% integration, 90% critical)
   - Work workflow including test-first approach

4. **`docs/ENG-FE-IDENTITY.md`** — Frontend engineer with testing requirements
   - Component testing standards
   - Visual regression & E2E test requirements
   - Coverage thresholds (60% components, 90% critical)
   - Accessibility testing requirements

---

## Enforcement Points

### 1. CTO Quality Gate (Every PR)
```
CTO PR Review Checklist:
☐ Tests included for all new code
☐ Coverage meets thresholds
☐ npm run test passes
☐ npm run build passes
☐ No console errors
☐ Documentation updated
```

### 2. CI/CD Pipeline (Automated)
```
Every PR runs:
1. npm run test:unit (80% min coverage)
2. npm run test:integration (70% min coverage)
3. npm run test:components (60% min coverage)
4. npm run test:e2e (critical flows)
5. npm run test:visual (no unexpected changes)
6. npm run build
→ Fail any step = PR blocked
```

### 3. Engineer Workflow (Self-Enforced)
```
Before submitting PR:
→ Write feature code
→ Write tests (unit/integration/component)
→ Run npm run test:coverage
→ Verify coverage meets threshold
→ If not, add more tests
→ Only then submit PR
```

---

## Coverage Thresholds Summary

| Role | Code Type | Unit | Integration | Component | E2E |
|------|-----------|------|-------------|-----------|-----|
| **ENG-BE** | API Routes | 80% | 70% | N/A | Key flows |
| **ENG-BE** | Utilities | 80% | N/A | N/A | N/A |
| **ENG-FE** | Components | N/A | N/A | 60% | Key flows |
| **ENG-FE** | Pages | N/A | N/A | 60% | ✅ Required |
| **Both** | Critical paths (auth, billing) | 90% | 80% | 80% | ✅ Required |

---

## Existing Test Infrastructure

**Already in place:**
- ✅ Vitest (unit/integration tests) — 12 test files
- ✅ React Testing Library (component tests)
- ✅ Playwright (E2E + visual tests) — 5 visual tests
- ✅ Lighthouse CI (performance)
- ✅ Test commands in package.json

**Needs implementation:**
- ⚠️ Coverage thresholds in CI (vitest.config.ts)
- ⚠️ PR template with testing checklist
- ⚠️ Visual baseline screenshots
- ⚠️ E2E test expansion (only critical flows currently)

---

## Next Steps

### For CTO:
1. Review `docs/TESTING-STANDARDS.md`
2. Enforce on all future PRs (starting immediately)
3. Update CI to enforce coverage thresholds
4. Create PR template with testing checklist

### For Engineers:
1. Read your identity doc (ENG-BE or ENG-FE)
2. Review `docs/TESTING-STANDARDS.md`
3. Start writing tests for all new work immediately
4. Retrofit tests for existing code where possible

### For CEO (VALIS):
1. Reference these docs when spawning agents
2. Include testing requirements in task descriptions
3. Support CTO in enforcing standards

---

## Violation Consequences

**If testing standards are not met:**
- PR rejected by CTO
- Issue reopened
- Engineer must add tests and resubmit
- Exceptions require Richard approval (rare)

**This is non-negotiable.** Testing is part of the definition of done.

---

## Files Reference

```
docs/
├── TESTING-STANDARDS.md     # Comprehensive testing guide
├── CTO-IDENTITY.md          # CTO role with testing enforcement
├── ENG-BE-IDENTITY.md       # Backend engineer with testing
├── ENG-FE-IDENTITY.md       # Frontend engineer with testing
├── DEVELOPMENT-PROCESS.md   # Updated with testing ownership
└── AGENT-ROLES.md           # This file
```

---

*Testing standards established by: VALIS (CEO)*  
*Enforcement begins: Immediately*
