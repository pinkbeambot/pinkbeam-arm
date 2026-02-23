---
title: "Developer Guide"
type: guide
status: active
created: 2026-02-21
updated: 2026-02-21
owner: ENG-UX
tags: [developer-guide, contributing, code-style, testing]
---

# Pink Beam ARM — Developer Guide

This guide covers everything you need to know to contribute to Pink Beam ARM.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Code Style Guide](#code-style-guide)
4. [Architecture Patterns](#architecture-patterns)
5. [Testing Guide](#testing-guide)
6. [Contributing Guidelines](#contributing-guidelines)
7. [Pull Request Process](#pull-request-process)
8. [Debugging & Troubleshooting](#debugging--troubleshooting)
9. [Resources](#resources)

---

## Getting Started

### Prerequisites

- **Node.js**: 20.x or higher
- **npm**: 10.x or higher
- **Git**: 2.x or higher
- **Supabase CLI**: Latest version (for local development)

### Repository Setup

```bash
# Clone the repository
git clone https://github.com/pinkbeam/arm.git
cd arm

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Configure your editor
# We recommend VS Code with these extensions:
# - ESLint
# - Prettier
# - Tailwind CSS IntelliSense
# - TypeScript Importer
```

### Environment Configuration

Create a `.env.local` file with your development credentials:

```bash
# Supabase (get from your Supabase project settings)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Development conveniences
DEV_AUTH_BYPASS=true  # Skip auth for local dev (NEVER in production)
```

### Local Database Setup

Option 1: Use Supabase Cloud (recommended for beginners)
```bash
# Just use your cloud Supabase project
# No additional setup needed
```

Option 2: Local Supabase (advanced)
```bash
# Start local Supabase
supabase start

# Run migrations
supabase migration up

# Stop when done
supabase stop
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Development Workflow

### Branch Naming

We use the following branch naming convention:

```
{team}/{description}

Examples:
eng-ux/dashboard-components
eng-be/api-rate-limiting
eng-fe/auth-flow
```

### Git Workflow

```bash
# 1. Start from main
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b eng-ux/dashboard-components

# 3. Make changes, commit often
git add .
git commit -m "feat: add agent card component"

# 4. Push branch
git push -u origin eng-ux/dashboard-components

# 5. Open PR, assign CTO as reviewer
# 6. Address feedback
# 7. CTO merges when approved
```

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, etc.

**Examples:**
```
feat: add real-time activity feed
fix: resolve race condition in agent spawning
docs: update API authentication examples
refactor: extract reusable hook for data fetching
test: add integration tests for task API
```

---

## Code Style Guide

### TypeScript

**Enable strict mode:** Our `tsconfig.json` has strict mode enabled. Do not disable.

**Type everything:**
```typescript
// ✅ Good
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ❌ Bad
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

**Use explicit return types for functions:**
```typescript
// ✅ Good
async function fetchAgent(id: string): Promise<Agent | null> {
  // ...
}

// ❌ Bad (rely on inference for public APIs)
async function fetchAgent(id: string) {
  // ...
}
```

**Avoid `any`:**
```typescript
// ❌ Bad
const data: any = await response.json();

// ✅ Good
const data: AgentResponse = await response.json();

// ✅ Also good (when type is unknown)
const data = await response.json() as unknown;
```

### React Components

**Use functional components:**
```typescript
// ✅ Good
interface AgentCardProps {
  agent: Agent;
  onSelect: (agent: Agent) => void;
}

export function AgentCard({ agent, onSelect }: AgentCardProps) {
  return (
    <Card onClick={() => onSelect(agent)}>
      <CardHeader>{agent.name}</CardHeader>
    </Card>
  );
}

// ❌ Bad
class AgentCard extends React.Component {
  // ...
}
```

**Use hooks for state and side effects:**
```typescript
// ✅ Good
export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchAgents().then(setAgents).finally(() => setLoading(false));
  }, []);
  
  return { agents, loading };
}
```

**Component file structure:**
```typescript
// 1. Imports
import { useState } from 'react';
import { Card } from '@/components/ui';

// 2. Types/Interfaces
interface Props {
  // ...
}

// 3. Component
export function ComponentName({ prop1, prop2 }: Props) {
  // ...
}

// 4. Exports
export type { Props as ComponentNameProps };
```

### Tailwind CSS

**Use the `cn()` utility for conditional classes:**
```typescript
import { cn } from '@/lib/utils';

// ✅ Good
<div className={cn(
  'base-classes',
  isActive && 'active-classes',
  size === 'large' && 'large-classes'
)} />

// ❌ Bad
<div className={`base-classes ${isActive ? 'active-classes' : ''}`} />
```

**Use the custom color palette:**
```typescript
// ✅ Good (using design system colors)
<div className="bg-pink-50 text-pink-900" />
<div className="bg-violet-50 text-violet-900" />

// ❌ Bad (arbitrary colors)
<div className="bg-[#ff0000]" />
```

**Order classes consistently:**
```typescript
// Order: Layout → Sizing → Spacing → Appearance → Typography → Effects
<div className="
  flex items-center justify-between
  w-full h-12
  px-4 py-2
  bg-white border border-gray-200 rounded-lg
  text-sm font-medium
  shadow-sm hover:shadow-md
" />
```

### API Routes

**Use the authentication HOC:**
```typescript
import { withAuth, successResponse, errorResponse } from '@/lib/auth';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
  role: z.enum(['ceo', 'manager', 'worker']),
});

export const POST = withAuth(async (request, context) => {
  try {
    const body = await request.json();
    const validated = schema.parse(body);
    
    const { data, error } = await supabase
      .from('agents')
      .insert({ ...validated, tenant_id: context.tenantId })
      .select()
      .single();
    
    if (error) throw error;
    
    return successResponse(data, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Validation error', 'VALIDATION_ERROR', 400, error.issues);
    }
    throw error;
  }
});
```

**Return consistent response format:**
```typescript
// Success
{
  "data": { ... },
  "meta": { "timestamp": "2026-02-21T20:00:00Z" }
}

// With pagination
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}

// Error
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "message": "Human-readable message",
  "details": { ... }
}
```

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `AgentCard.tsx` |
| Hooks | camelCase with `use` prefix | `useAgents.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Types | PascalCase with `.types.ts` | `agent.types.ts` |
| API Routes | `route.ts` in folder | `app/api/agents/route.ts` |
| Tests | Same as file + `.test.ts` | `AgentCard.test.tsx` |

### Import Organization

Order imports in groups separated by blank lines:

```typescript
// 1. React/Next.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party libraries
import { motion } from 'framer-motion';
import { z } from 'zod';

// 3. Internal utilities/hooks
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

// 4. Components
import { Button, Card } from '@/components/ui';
import { AgentAvatar } from '@/components/agents';

// 5. Types
import type { Agent } from '@/types/agent';
```

---

## Architecture Patterns

### Multi-Tenancy

Every database table has a `tenant_id` column. Always filter by tenant:

```typescript
// ✅ Good
const { data } = await supabase
  .from('agents')
  .select('*')
  .eq('tenant_id', tenantId);

// The middleware sets tenant context automatically
```

### Error Handling

**Use try/catch with specific error types:**
```typescript
try {
  const result = await riskyOperation();
} catch (error) {
  if (error instanceof DatabaseError) {
    // Handle database error
  } else if (error instanceof ValidationError) {
    // Handle validation error
  } else {
    // Unknown error - log and rethrow
    console.error('Unexpected error:', error);
    throw error;
  }
}
```

**Never swallow errors:**
```typescript
// ❌ Bad
try {
  await operation();
} catch (e) {
  // Silent failure - user has no idea something went wrong
}

// ✅ Good
try {
  await operation();
} catch (e) {
  console.error('Operation failed:', e);
  toast.error('Failed to complete operation. Please try again.');
}
```

### Data Fetching

**Use React Query for server state:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query
export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => fetch('/api/agents').then(r => r.json()),
  });
}

// Mutation
export function useCreateAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => fetch('/api/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}
```

### Form Handling

**Use React Hook Form with Zod:**
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
});

type FormData = z.infer<typeof schema>;

export function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  
  const onSubmit = (data: FormData) => {
    console.log(data);
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('name')} />
      {form.formState.errors.name && (
        <span>{form.formState.errors.name.message}</span>
      )}
    </form>
  );
}
```

---

## Testing Guide

### Test Organization

```
src/__tests__/
├── unit/              # Unit tests
│   ├── lib/
│   └── utils/
├── integration/       # API integration tests
│   └── api/
├── e2e/              # End-to-end tests
│   └── flows/
├── components/       # Component tests
│   └── ui/
└── fixtures/         # Test data
    └── agents.json
```

### Unit Testing

**Test utilities and hooks:**
```typescript
// src/__tests__/unit/lib/rate-limit.test.ts
import { describe, it, expect, vi } from 'vitest';
import { checkRateLimit } from '@/lib/rate-limit';

describe('checkRateLimit', () => {
  it('allows requests under the limit', async () => {
    const result = await checkRateLimit('tenant-1', 100);
    expect(result.allowed).toBe(true);
  });
  
  it('blocks requests over the limit', async () => {
    // Make requests up to limit
    for (let i = 0; i < 100; i++) {
      await checkRateLimit('tenant-1', 100);
    }
    
    const result = await checkRateLimit('tenant-1', 100);
    expect(result.allowed).toBe(false);
  });
  
  it('resets after window expires', async () => {
    vi.useFakeTimers();
    
    await checkRateLimit('tenant-1', 100);
    
    // Advance time by 1 minute
    vi.advanceTimersByTime(60000);
    
    const result = await checkRateLimit('tenant-1', 100);
    expect(result.allowed).toBe(true);
  });
});
```

### Integration Testing

**Test API routes:**
```typescript
// src/__tests__/integration/api/agents.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestUser, getAuthToken } from '@/__tests__/helpers/auth';

describe('/api/agents', () => {
  let authToken: string;
  
  beforeAll(async () => {
    const user = await createTestUser();
    authToken = await getAuthToken(user);
  });
  
  describe('POST', () => {
    it('creates an agent with valid data', async () => {
      const response = await fetch('http://localhost:3000/api/agents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Agent',
          role: 'worker',
        }),
      });
      
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.name).toBe('Test Agent');
    });
    
    it('returns 401 without auth', async () => {
      const response = await fetch('http://localhost:3000/api/agents', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      });
      
      expect(response.status).toBe(401);
    });
    
    it('returns 400 with invalid data', async () => {
      const response = await fetch('http://localhost:3000/api/agents', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ name: '' }), // Invalid: empty name
      });
      
      expect(response.status).toBe(400);
    });
  });
});
```

### Component Testing

**Test React components:**
```typescript
// src/__tests__/components/ui/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '@/components/ui';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalled();
  });
  
  it('is disabled when loading', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### E2E Testing

**Test complete user flows:**
```typescript
// src/__tests__/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can login with OTP', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    
    // Enter email
    await page.fill('[name="email"]', 'test@example.com');
    await page.click('button:has-text("Send Code")');
    
    // Wait for OTP screen
    await expect(page.locator('text=Enter verification code')).toBeVisible();
    
    // Enter OTP (in real tests, use test inbox)
    await page.fill('[name="code"]', '123456');
    await page.click('button:has-text("Verify")');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
  });
});
```

### Running Tests

```bash
# All tests
npm run test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage

# Specific test file
npm run test -- src/__tests__/unit/lib/rate-limit.test.ts

# E2E tests
npm run test:e2e

# E2E with UI
npm run test:e2e:ui
```

### Coverage Requirements

| Code Type | Minimum Coverage |
|-----------|------------------|
| Utilities | 80% |
| Hooks | 70% |
| API Routes | 70% |
| Components | 60% |
| Critical Paths | 90% |

---

## Contributing Guidelines

### Before You Start

1. **Check existing issues** — Someone might already be working on it
2. **Discuss major changes** — Open an issue for significant features
3. **Read related docs** — Check ARCHITECTURE.md and API.md

### What to Contribute

We welcome:
- 🐛 Bug fixes
- ✨ New features
- 📚 Documentation improvements
- 🧪 Tests
- 🎨 UI/UX improvements
- ⚡ Performance optimizations

### Code Review Process

1. **Self-review first** — Check your own PR before requesting review
2. **Automated checks** — CI must pass (tests, lint, build)
3. **CTO review** — All PRs require CTO approval
4. **Address feedback** — Make requested changes
5. **Merge** — CTO merges when approved

### Definition of Done

Before submitting a PR, ensure:

- [ ] Code follows style guide
- [ ] Tests written and passing
- [ ] Documentation updated (if needed)
- [ ] No console errors or warnings
- [ ] Accessibility checked (keyboard nav, ARIA labels)
- [ ] Works on mobile (responsive)
- [ ] No breaking changes (or clearly documented)

---

## Pull Request Process

### PR Title Format

```
[type]: Brief description

Examples:
feat: add real-time activity feed component
fix: resolve agent status update race condition
docs: update API authentication examples
```

### PR Description Template

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation
- [ ] Refactoring

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Code follows style guide
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors

## Screenshots (if UI changes)
[Add screenshots]

## Related Issues
Fixes #123
```

### PR Size Guidelines

Keep PRs focused and reviewable:

| PR Size | Lines Changed | Review Time |
|---------|---------------|-------------|
| Small | < 100 | < 15 min |
| Medium | 100-300 | 15-30 min |
| Large | 300-500 | 30-60 min |
| X-Large | > 500 | Split into smaller PRs |

---

## Debugging & Troubleshooting

### Common Development Issues

**Build fails with TypeScript errors**
```bash
# Check TypeScript
npx tsc --noEmit

# Fix errors, then rebuild
npm run build
```

**Supabase connection errors**
```bash
# Verify environment variables
cat .env.local | grep SUPABASE

# Test connection
npm run test:connection
```

**Tests failing**
```bash
# Run specific test with verbose output
npm run test -- --reporter=verbose src/__tests__/unit/lib/rate-limit.test.ts

# Debug with inspector
node --inspect-brk node_modules/.bin/vitest run
```

### Debug Tools

**React Developer Tools**
- Install browser extension
- Inspect component hierarchy
- View props and state

**Supabase Dashboard**
- Check database records
- Monitor real-time subscriptions
- View authentication logs

**Network Tab**
- Monitor API requests
- Check response payloads
- Verify auth headers

### Logging

**Client-side:**
```typescript
// Use console for development only
if (process.env.NODE_ENV === 'development') {
  console.log('Debug:', data);
}

// Use proper logging in production
import { logger } from '@/lib/logger';
logger.info('Agent created', { agentId, tenantId });
```

**Server-side:**
```typescript
// API routes
console.log('[API /agents] Creating agent:', { name, role });

// Edge functions
console.log('[Edge Function] Processing task:', taskId);
```

---

## Resources

### Internal Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [API Reference](./API.md)
- [Agent Protocol](./AGENT-PROTOCOL.md)
- [Testing Standards](./TESTING-STANDARDS.md)
- [Deployment Guide](./DEPLOYMENT.md)

### External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)

### Getting Help

1. **Check documentation** — Start with relevant docs
2. **Search code** — Look for similar implementations
3. **Ask in Slack** — #engineering channel
4. **CTO office hours** — Wednesdays 2-3 PM

---

## Code Review Checklist

### For Authors

Before requesting review:

- [ ] Tests pass locally (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Self-reviewed changes
- [ ] PR description is complete
- [ ] Screenshots attached (if UI)

### For Reviewers

When reviewing:

- [ ] Understands what the PR does
- [ ] Code follows style guide
- [ ] Tests cover the changes
- [ ] No obvious bugs or issues
- [ ] Performance is acceptable
- [ ] Security considerations addressed
- [ ] Documentation is updated

---

**Happy coding!** 🚀

If you have questions or suggestions for this guide, please open an issue or reach out to the team.
