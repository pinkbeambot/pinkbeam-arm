---
name: API Endpoint
about: Create a new API route
labels: backend
---

## Endpoint
<!-- e.g., POST /api/tasks -->

## Purpose
<!-- What does this endpoint do? -->

## Request Schema
```typescript
// Zod schema for validation
const requestSchema = z.object({
  // Define shape
});
```

## Response Schema
```typescript
// Success response shape
interface Response {
  data: ...
}
```

## Acceptance Criteria
- [ ] Route created in `src/app/api/...`
- [ ] Zod validation for inputs
- [ ] RLS policies respected
- [ ] Tests written (80% coverage)
- [ ] Error handling with ApiError
- [ ] Documentation updated

## Related
<!-- Issue numbers -->
