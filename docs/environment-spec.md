## Environment Specification for AI Platform

### Development Environment
Purpose: Local development and testing on developer machines.

| Resource | Configuration |
|----------|---------------|
| Pages | wrangler pages dev (local server) |
| Workers | Local functions via wrangler dev |
| D1 | ai-platform-db (local, via wrangler d1 --local) |
| KV | Local KV (wrangler kv:namespace create for each) |
| R2 | Local R2 (wrangler r2 bucket create for each) |
| Secrets | .dev-vars (local environment file) |

### Staging Environment
Purpose: Pre-production testing, QA, feature validation.

| Resource | Configuration |
|----------|---------------|
| Pages | Staging Pages project (branch: staging) |
| Workers | Same as Pages (auto-deployed) |
| D1 | ai-platform-db-staging (separate D1 DB) |
| KV | Separate KV namespaces for staging |
| R2 | ai-platform-assets-staging (separate R2 bucket) |
| Secrets | Staged JWT_SECRET, Stripe test keys |

### Production Environment
Purpose: Live customer-facing service.

| Resource | Configuration |
|----------|---------------|
| Pages | Production Pages project (branch: main) |
| Workers | Same as Pages (auto-deployed) |
| D1 | ai-platform-db-prod (production D1 DB) |
| KV | Production KV namespaces |
| R2 | ai-platform-assets-prod (production R2 bucket) |
| Secrets | Production JWT_SECRET, Stripe live keys, Sentry DSN |
