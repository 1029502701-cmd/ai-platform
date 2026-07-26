# Environment Configuration Guide

## Overview

The platform supports 5 environments, each with its own configuration.
All secrets are managed via Cloudflare Pages secrets — **never** in code or `.env` files committed to git.

---

## Environments

| Env        | Purpose       | Branch     | URL                                    | Auto Deploy |
|------------|---------------|------------|----------------------------------------|-------------|
| local      | Development   | any        | `localhost:5173` + `wrangler dev`      | No          |
| development| Dev/Staging   | `main`     | `https://staging.ai-platform-boa.pages.dev` | Yes    |
| testing    | QA/Test       | `test/*`   | N/A (local only)                       | Manual      |
| staging    | Pre-production| `main`     | Same as development                    | Yes         |
| production | Live          | Manual trigger | `https://ai-platform-boa.pages.dev`  | Manual/Approval |

---

## Required Secrets (Cloudflare Pages)

Set these in Cloudflare Dashboard → Settings → Environment Variables:

```
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...
GOOGLE_AI_API_KEY=sk-...
JWT_SECRET=<strong-random-string>
WECHAT_APP_ID=wx...
WECHAT_APP_SECRET=...
STRIPE_SECRET_KEY=sk_live_...
BILLING_WEBHOOK_SECRET=...
CF_ACCOUNT_ID=...
CF_API_TOKEN=...
```

---

## Local Development

```bash
# Copy template
cp .dev.vars.example .dev.vars
# Edit .dev.vars with real values

# Start local server
npx wrangler pages dev dist --port 8788

# Run build
npm run build
```

---

## Variable Resolution Order

1. Cloudflare Pages environment variables (highest priority)
2. `.dev.vars` (local development only)
3. Default values in `shared/config/loader.ts`
4. Hardcoded fallbacks

---

## Security Notes

- 🔒 Never commit real API keys to git
- 🔒 Use different keys for each environment
- 🔒 Rotate JWT_SECRET regularly
- 🔒 Enable Cloudflare Access for admin endpoints