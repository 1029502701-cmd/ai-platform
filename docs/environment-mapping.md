# Environment Mapping for AI Platform

This document maps each environment variable to its underlying Cloudflare resource, usage, and whether it should be treated as a secret.

## Variable Mapping Table
| Variable | Resource | Usage | Default | Secret? |
|----------|----------|-------|---------|---------|
| CLOUDFLARE_ACCOUNT_ID | Cloudflare Account | Wrangler auth | ENV var | Yes |
| CLOUDFLARE_API_TOKEN | Cloudflare API | Wrangler auth | ENV var | Yes |
| JWT_SECRET | KV/Session | Session signing | change-me | Yes |
| WECHAT_APP_ID | WeChat OAuth | Login provider | '' | No |
| WECHAT_APP_SECRET | WeChat OAuth | Login provider | '' | Yes |
| GITHUB_CLIENT_ID | GitHub OAuth | Login provider | '' | No |
| GITHUB_CLIENT_SECRET | GitHub OAuth | Login provider | '' | Yes |
| OPENAI_API_KEY | OpenAI Provider | AI inference | sk-placeholder | Yes |
| DEEPSEEK_API_KEY | DeepSeek Provider | AI inference | sk-placeholder | Yes |
| ANTHROPIC_API_KEY | Anthropic Provider | AI inference | '' | Yes |
| GOOGLE_AI_API_KEY | Google Provider | AI inference | sk-placeholder | Yes |
| STRIPE_SECRET_KEY | Stripe Payment | Payment processing | sk_test_... | Yes |
| STRIPE_WEBHOOK_SECRET | Stripe Payment | Webhook verification | whsec_... | Yes |
| ADMIN_API_KEY | Admin API | Authorization | admin_placeholder | Yes |
| SENTRY_DSN | Sentry | Error monitoring | '' | No |
| NODE_ENV | General | Development/production mode | development | No |
| LOG_LEVEL | Logger | Logging verbosity | info | No |
| VITE_API_BASE | Frontend | API base URL | https://api.your-domain.com | No |

## Resource Mapping
| Resource Type | Binding Name | Env Var (in code) | Environment Variant |
|---------------|--------------|-------------------|---------------------|
| D1            | DB           | env.DB            | per-env (separate DB) |
| KV (USER_CACHE)| USER_CACHE   | env.USER_CACHE    | per-env (separate KV) |
| KV (RATE_LIMITS)│ RATE_LIMITS  │ env.RATE_LIMITS   │ per-env (separate KV) |
| KV (FEATURE_FLAGS)│ FEATURE_FLAGS│ env.FEATURE_FLAGS │ per-env (separate KV) |
| R2 (ASSETS)   | ASSETS_BUCKET│ env.ASSETS_BUCKET │ per-env (separate R2)|
| QUEUE         │ AI_TASK_QUEUE│ env.AI_TASK_QUEUE │ per-env (separate queue)│
| QUEUE         │ BILLING_QUEUE│ env.BILLING_QUEUE │ per-env (separate queue)│

## Secret Handling
Secrets should NEVER be committed to version control. Use:
1. `.env` files (added to .gitignore)
2. Cloudflare Wrangler vars via `wrangler secret put` or Pages environment variables

## Production Deployment Checklist
- [ ] Create staging D1 database: `wrangler d1 create ai-platform-db-staging`
- [ ] Create staging KV namespaces (3 separate ones)
- [ ] Create staging R2 bucket: `wrangler r2 bucket create ai-platform-assets-staging`
- [ ] Generate real JWT_SECRET: use crypto.randomBytes(48).toString('hex')
- [ ] Populate `.env.staging` with real staging secrets
- [ ] Update wrangler.toml [env.staging] section with new resource lines
