# Lessons Learned

## Git Attribution Issues

**Problem:** Commits showing "Richard Hernandez" instead of agent ID

**Solution:** 
```bash
# Always set before committing
git config user.name "ENG-FE"  # or ENG-BE, CTO
git config user.email "eng-fe@pinkbeam.ai"
```

**Prevention:** Added git hook to check attribution before commits

---

## Service Role vs Anon Client

**Problem:** API routes returning 403 because using supabaseAnon (RLS requires tenant context)

**Solution:** API routes use service role client (bypasses RLS server-side)
```typescript
// src/lib/supabase/service-role.ts
import { createClient } from '@supabase/supabase-js';
export const supabaseService = createClient(url, serviceRoleKey);
```

**When to use:**
- `supabaseAnon` — Client components (browser)
- `supabaseService` — API routes, Edge Functions (server-side)

---

## Tenant Context Setup

**Problem:** New users don't have tenant, see "Tenant not found" errors

**Solution:** Auto-create tenant in auth callback
```typescript
// src/app/auth/callback/route.ts
// Check if user exists in public.users
// If not, create tenant → user record → membership
```

---

## Magic Link Auth Flow

**Discovery:** Magic links work for BOTH login and signup automatically
- New email → creates account → sends link
- Existing email → sends link
- Same flow, no distinction needed

**Result:** Combined `/login` and `/signup` into single `/auth` page

---

## Batch Spawning Efficiency

**Discovery:** Spawning 5 engineers in parallel for unrelated tasks is efficient
- No file conflicts (different files)
- Parallel completion
- ~70% faster than sequential

**Best practice:** Batch related small tasks, assign to different domains

---

## Token Consumption Optimization

**Before:** Duplicated workflows in every SOUL.md
**After:** Shared skills in `~/.openclaw/skills/`
**Result:** ~60-70% token reduction

---

## Common Fix Patterns

### Fixing Type Errors
1. Run `npm run typecheck`
2. Fix errors one by one
3. Re-run until clean

### Adding Migration
1. Create file in `supabase/migrations/`
2. Use `gen_random_uuid()` not `uuid_generate_v4()`
3. Run `supabase db push --dry-run`
4. Commit, push, create PR

### Creating PR
1. `git checkout -b domain/task-XX-description`
2. Make changes
3. `npm run build` (must pass)
4. `git commit -m "type(scope): description"`
5. `git push origin branch-name`
6. `gh pr create --title "..." --body "Fixes #XX"`

---

## What NOT To Do

❌ **Don't push directly to main** — Always use PRs  
❌ **Don't skip tests** — Coverage thresholds enforced  
❌ **Don't expose secrets** — Check env var usage  
❌ **Don't use `any` types** — Strict TypeScript  
❌ **Don't report DONE without testing** — Click through it  

---

*Update this doc as we learn more*
