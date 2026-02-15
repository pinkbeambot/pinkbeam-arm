---
name: send-email
description: Scaffold a Resend email template or transactional email function
disable-model-invocation: true
---

# Scaffold Resend Email

Create email templates and send functions using Resend.

## Prerequisites

Ensure Resend is installed and configured:
1. Check `package.json` for `resend` dependency — if missing, install: `npm install resend`
2. Check `.env.local` for `RESEND_API_KEY` — if missing, ask the user to add it
3. Check for `src/lib/resend.ts` client — if missing, create it (see below)

## Resend Client Setup

If `src/lib/resend.ts` doesn't exist, create it:

```typescript
import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);
```

## Email Template Structure

Create email templates in `src/lib/emails/`. Each template is a React component:

```typescript
import * as React from 'react';

interface {TemplateName}EmailProps {
  // Template-specific props
}

export function {TemplateName}Email({ ...props }: {TemplateName}EmailProps) {
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ background: 'linear-gradient(to right, #ec4899, #8b5cf6)', padding: '32px', borderRadius: '12px 12px 0 0' }}>
        <h1 style={{ color: 'white', margin: 0, fontSize: '24px' }}>Pink Beam</h1>
      </div>
      <div style={{ padding: '32px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderTop: 'none' }}>
        {/* Email content here */}
      </div>
      <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280', fontSize: '12px' }}>
        <p>Pink Beam ARM — Your AI Workforce Command Center</p>
      </div>
    </div>
  );
}
```

## Send Function

Create send functions in `src/lib/emails/send.ts`:

```typescript
import { resend } from '@/lib/resend';
import { {TemplateName}Email } from './{template-name}';

export async function send{TemplateName}Email(to: string, props: {TemplateName}EmailProps) {
  const { data, error } = await resend.emails.send({
    from: 'Pink Beam <noreply@pinkbeam.ai>',
    to,
    subject: '{Subject line}',
    react: {TemplateName}Email(props),
  });

  if (error) {
    console.error('Failed to send email:', error);
    throw error;
  }

  return data;
}
```

## Common Email Types

When the user asks for an email, determine which type and scaffold accordingly:
- **Welcome** — sent after new user signup (post tenant creation)
- **Agent Alert** — sent when an agent escalates or encounters an error
- **Weekly Digest** — summary of agent activity for the week
- **Task Complete** — notification when a task is finished

## Rules

- Always use `process.env.RESEND_API_KEY` (server-side only, no `NEXT_PUBLIC_` prefix)
- Use React components for email templates (Resend supports JSX)
- Include Pink Beam branding (pink-to-violet gradient header)
- Keep email templates in `src/lib/emails/`
- Send functions should be called from API routes or server actions, never from client components
- Always handle errors from `resend.emails.send()`
