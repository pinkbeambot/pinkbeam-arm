---
title: "Environment Variables Reference"
type: reference
status: active
created: 2026-02-21
updated: 2026-02-21
owner: ENG-UX
tags: [environment, configuration, reference]
---

# Environment Variables Reference

Complete reference for all environment variables used in Pink Beam ARM.

---

## Table of Contents

1. [Required Variables](#required-variables)
2. [Supabase Configuration](#supabase-configuration)
3. [Authentication](#authentication)
4. [Application Settings](#application-settings)
5. [Stripe Configuration](#stripe-configuration)
6. [Email Configuration](#email-configuration)
7. [Rate Limiting](#rate-limiting)
8. [Development Only](#development-only)
9. [Environment-Specific Examples](#environment-specific-examples)

---

## Required Variables

These variables are required for the application to run:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (client-side) | `eyJhbGciOiJIUzI1NiIs...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) | `eyJhbGciOiJIUzI1NiIs...` |
| `NEXT_PUBLIC_APP_URL` | Your application URL | `http://localhost:3000` |

---

## Supabase Configuration

### Connection Settings

```bash
# Required - Get from Supabase Dashboard → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Where to find these:**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Project Settings** → **API**
4. Copy the values:
   - **URL**: `Project URL`
   - **Anon Key**: `anon public` under Project API keys
   - **Service Role Key**: `service_role secret` (requires admin access)

**Important:** 
- `NEXT_PUBLIC_` prefix means the variable is exposed to the browser
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — **never expose to client**
- Use different projects for development, staging, and production

### Realtime Configuration

```bash
# Optional - Only needed if using custom realtime settings
NEXT_PUBLIC_SUPABASE_REALTIME_URL=wss://your-project.supabase.co/realtime/v1
```

---

## Authentication

### JWT Configuration

```bash
# Optional - JWT expiration settings
AUTH_JWT_EXPIRATION=3600  # Token expiration in seconds (default: 3600)
AUTH_REFRESH_TOKEN_EXPIRATION=604800  # Refresh token expiration (default: 7 days)
```

### Magic Link / OTP Settings

```bash
# Optional - OTP code settings
AUTH_OTP_LENGTH=6  # Length of OTP code (default: 6)
AUTH_OTP_EXPIRATION=600  # OTP expiration in seconds (default: 600 = 10 min)
```

### Session Configuration

```bash
# Optional - Session cookie settings
AUTH_COOKIE_SECURE=true  # Use secure cookies (default: true in production)
AUTH_COOKIE_SAMESITE=lax  # SameSite attribute (default: lax)
```

---

## Application Settings

### Core URLs

```bash
# Required
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional - API base URL (defaults to APP_URL)
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Optional - WebSocket URL for realtime
NEXT_PUBLIC_WS_URL=wss://your-project.supabase.co/realtime/v1
```

### Feature Flags

```bash
# Optional - Enable/disable features
NEXT_PUBLIC_FEATURE_ANALYTICS=true
NEXT_PUBLIC_FEATURE_EXPORTS=true
NEXT_PUBLIC_FEATURE_BILLING=true
NEXT_PUBLIC_FEATURE_TEAM_INVITES=true
```

### UI Configuration

```bash
# Optional - UI settings
NEXT_PUBLIC_DEFAULT_PAGE_SIZE=20  # Default items per page
NEXT_PUBLIC_MAX_PAGE_SIZE=100  # Maximum items per page
NEXT_PUBLIC_THEME_DEFAULT=system  # Default theme (light, dark, system)
```

---

## Stripe Configuration

### API Keys

```bash
# Required if using billing
STRIPE_SECRET_KEY=sk_test_...  # Secret key (server-only)
STRIPE_WEBHOOK_SECRET=whsec_...  # Webhook endpoint secret
```

**Where to find:**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Developers → API keys
3. For webhooks: Developers → Webhooks → Your endpoint → Signing secret

### Product/Price IDs

```bash
# Optional - Price IDs for subscription plans
STRIPE_PRICE_STARTER=price_starter_...
STRIPE_PRICE_PRO=price_pro_...
STRIPE_PRICE_BUSINESS=price_business_...
STRIPE_PRICE_SCALE=price_scale_...
```

**Setup:**

1. In Stripe Dashboard, go to Products
2. Create products for each plan
3. Create prices for each product
4. Copy Price IDs to environment variables

### Webhook Configuration

```bash
# Optional - Webhook endpoint URL (for local development with Stripe CLI)
STRIPE_WEBHOOK_URL=https://api.pinkbeam.ai/api/webhooks/stripe
```

**Local testing:**

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## Email Configuration

### Resend (Transaction Emails)

```bash
# Required for email functionality
RESEND_API_KEY=re_...  # Server-only
RESEND_FROM_EMAIL=noreply@pinkbeam.ai
RESEND_FROM_NAME=Pink Beam
```

**Where to find:**

1. Go to [Resend Dashboard](https://resend.com)
2. API Keys → Create API Key
3. Domains → Verify your domain

### Email Templates

```bash
# Optional - Template IDs
RESEND_TEMPLATE_MAGIC_LINK=template_...
RESEND_TEMPLATE_WELCOME=template_...
RESEND_TEMPLATE_ESCALATION=template_...
```

---

## Rate Limiting

### Upstash Redis (Production)

```bash
# Required for distributed rate limiting in production
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

**Where to find:**

1. Go to [Upstash Console](https://console.upstash.com)
2. Create a Redis database
3. Copy REST URL and Token from the database page

### Rate Limit Settings

```bash
# Optional - Default rate limits
RATE_LIMIT_REQUESTS_PER_MINUTE=100  # Default requests per minute
RATE_LIMIT_WINDOW_MS=60000  # Window size in milliseconds
RATE_LIMIT_ENABLED=true  # Enable/disable rate limiting
```

---

## Development Only

⚠️ **Never use these in production!**

### Auth Bypass

```bash
# DANGER: Development only - bypasses all authentication
DEV_AUTH_BYPASS=true
```

**Purpose:** Skip real authentication during local development for faster testing.

**Security:** The build will fail if this is set in production (enforced in build config).

### Debug Mode

```bash
# Enable verbose logging
DEBUG=true
DEBUG_MODULES=api,auth,db  # Comma-separated list of modules to debug
```

### Mock Services

```bash
# Use mock LLM responses (faster, no API costs)
MOCK_LLM_RESPONSES=true

# Use mock email service (don't send real emails)
MOCK_EMAIL_SERVICE=true
```

### Testing

```bash
# Test-specific settings
TEST_DB_URL=postgresql://localhost:5432/arm_test
TEST_SUPABASE_URL=https://test-project.supabase.co
TEST_SUPABASE_ANON_KEY=test-key
```

---

## Environment-Specific Examples

### Local Development

```bash
# .env.local

# Supabase (use local or cloud dev project)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (optional in dev)
RESEND_API_KEY=re_...

# Development conveniences
DEV_AUTH_BYPASS=true
DEBUG=true
MOCK_LLM_RESPONSES=true
```

### Staging

```bash
# .env.staging

# Supabase (staging project)
NEXT_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# App
NEXT_PUBLIC_APP_URL=https://staging.pinkbeam-arm.vercel.app

# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
RESEND_API_KEY=re_...

# Rate limiting
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# Feature flags
NEXT_PUBLIC_FEATURE_ANALYTICS=true
NEXT_PUBLIC_FEATURE_BILLING=true
```

### Production

```bash
# .env.production

# Supabase (production project)
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# App
NEXT_PUBLIC_APP_URL=https://pinkbeam-arm.vercel.app

# Stripe (live mode)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_live_...
STRIPE_PRICE_PRO=price_live_...

# Email
RESEND_API_KEY=re_live_...
RESEND_FROM_EMAIL=noreply@pinkbeam.ai

# Rate limiting (required)
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=1000

# Security
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAMESITE=lax

# No dev-only variables!
```

---

## Validation

### Environment Validation Script

We provide a validation script to check your environment:

```bash
# Validate environment variables
npm run validate-env

# Check specific environment
npm run validate-env -- --env=production
```

### Required Variables Checklist

Use this checklist when setting up a new environment:

**Minimal (Local Development)**
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_APP_URL`

**Full Production**
- [ ] All minimal variables
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `RESEND_API_KEY`
- [ ] `UPSTASH_REDIS_REST_URL`
- [ ] `UPSTASH_REDIS_REST_TOKEN`

---

## Security Best Practices

### ✅ Do

- Use different Supabase projects for each environment
- Rotate API keys regularly (quarterly)
- Use service role key only in server-side code
- Store secrets in environment variables, never in code
- Use a secrets manager for production (Vercel, AWS Secrets Manager, etc.)

### ❌ Don't

- Never commit `.env.local` or any `.env` files to git
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client
- Never use `DEV_AUTH_BYPASS` in production
- Never share API keys in Slack or email
- Never use production keys in development

### Environment File Security

```bash
# .gitignore (already configured)
.env
.env.local
.env.*.local
.env.development
.env.test
.env.production
```

### Vercel Environment Variables

For Vercel deployments, set variables in:

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Settings → Environment Variables
4. Add variables for each environment (Production, Preview, Development)

**Important:** Mark sensitive variables as "Sensitive" in Vercel to prevent them from being exposed in builds.

---

## Troubleshooting

### "Missing required environment variable"

```bash
# Check if variable is set
echo $NEXT_PUBLIC_SUPABASE_URL

# Check .env.local exists and is loaded
cat .env.local | grep SUPABASE

# Restart dev server after changing .env.local
npm run dev
```

### "Invalid Supabase credentials"

1. Verify URL format: `https://<project>.supabase.co`
2. Check for trailing spaces in copied values
3. Ensure you're using the correct project (dev/staging/prod)
4. Verify keys haven't been rotated

### "Rate limiting not working"

1. Check `UPSTASH_REDIS_REST_URL` is set
2. Verify Redis connection: `npm run test:redis`
3. Check `RATE_LIMIT_ENABLED=true`

### "Emails not sending"

1. Verify `RESEND_API_KEY` is set
2. Check domain is verified in Resend
3. Check spam folders
4. Use `MOCK_EMAIL_SERVICE=true` for local testing

---

## Variable Reference Table

| Variable | Required | Client | Server | Description |
|----------|----------|--------|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ❌ | ✅ | Supabase service role |
| `NEXT_PUBLIC_APP_URL` | ✅ | ✅ | ✅ | Application URL |
| `NEXT_PUBLIC_API_URL` | ❌ | ✅ | ✅ | API base URL |
| `STRIPE_SECRET_KEY` | ❌ | ❌ | ✅ | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | ❌ | ❌ | ✅ | Stripe webhook secret |
| `STRIPE_PRICE_*` | ❌ | ❌ | ✅ | Stripe price IDs |
| `RESEND_API_KEY` | ❌ | ❌ | ✅ | Resend API key |
| `RESEND_FROM_EMAIL` | ❌ | ❌ | ✅ | From email address |
| `UPSTASH_REDIS_REST_URL` | ❌ | ❌ | ✅ | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | ❌ | ❌ | ✅ | Upstash Redis token |
| `RATE_LIMIT_*` | ❌ | ❌ | ✅ | Rate limiting settings |
| `AUTH_*` | ❌ | ❌ | ✅ | Auth configuration |
| `DEBUG` | ❌ | ❌ | ✅ | Debug mode |
| `DEV_AUTH_BYPASS` | ❌ | ❌ | ✅ | ⚠️ Dev only |
| `MOCK_*` | ❌ | ❌ | ✅ | ⚠️ Dev only |

**Legend:**
- ✅ Required/Available
- ❌ Optional/Not available
- ⚠️ Development only

---

## Related Documentation

- [Deployment Guide](./DEPLOYMENT.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Developer Guide](./DEVELOPER-GUIDE.md)
- [API Documentation](./API.md)
