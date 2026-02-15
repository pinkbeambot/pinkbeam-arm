# Engineer Task Card Template

**Use this format for specific, low-token tasks:**

---

## Task: [Brief Description]

**Issue:** #[number]  
**File(s):** `src/path/to/file.ts`  
**Branch:** `eng-fe/fix-[number]-[brief]`

## Change Required

```typescript
// BEFORE:
[Show current code]

// AFTER:
[Show target code]
```

## Steps

1. `git checkout -b [branch-name]`
2. Edit `[file]` — make change
3. `npm run build` (verify)
4. Commit: "[type]: [description]"
5. Push: `git push origin [branch-name]`
6. Create PR: `gh pr create --title "..." --body "Fixes #[number]"`

## Report

**DONE #[number]:** PR created, branch `[branch]`  
**or BLOCKED #[number]:** [reason]

---

**Example:**

## Task: Remove unoptimized images

**Issue:** #97  
**File(s):** `next.config.ts`  
**Branch:** `eng-fe/fix-97-image-opt`

## Change Required

```typescript
// BEFORE (lines 8-10):
images: {
  unoptimized: true,
},

// AFTER:
// Remove entire images block (Next.js default is optimized)
```

## Steps

1. `git checkout -b eng-fe/fix-97-image-opt`
2. Delete lines 8-10 from `next.config.ts`
3. `npm run build` (should pass)
4. Commit: "chore(config): enable image optimization"
5. Push and create PR

## Report

**DONE #97:** PR created, branch `eng-fe/fix-97-image-opt`
