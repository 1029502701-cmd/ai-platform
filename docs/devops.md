# DevOps & CI/CD Platform Guide

## Architecture Overview

```
GitHub Repo
  ↓ push/PR
CI Pipeline (GitHub Actions)
  ├── typecheck ✅
  ├── build ✅
  ├── test ✅
  ├── security scan ✅
  ├── deploy-staging (auto on main)
  └── deploy-production (manual approval)
        ↓
Cloudflare Pages
  ├── Workers Functions (API Gateway)
  ├── D1 Database (ai-platform-db)
  ├── KV Cache (USER_CACHE, RATE_LIMITS, FEATURE_FLAGS)
  ├── R2 Storage (ASSETS_BUCKET)
  └── Queues (AI_TASK_QUEUE, BILLING_QUEUE)
```

---

## CI/CD Pipeline Stages

### Stage 1: Type Check
- Run `npx tsc --noEmit`
- Fails if TypeScript errors exist
- Duration: ~5s

### Stage 2: Build
- Run `npm run build` (Vite)
- Uploads `dist/` as artifact
- Duration: ~3s

### Stage 3: Test
- Run existing test suite
- Duration: ~10s

### Stage 4: Security Scan
- `npm audit --audit-level=moderate`
- Warning-only (non-blocking in initial phase)
- Duration: ~2s

### Stage 5: Deploy Staging
- Auto-deploys on push to `main`
- Wrangler Pages deploy to staging project
- Health check endpoint validation
- Duration: ~30s

### Stage 6: Deploy Production
- **Manual trigger** required
- Same deployment process
- Full health verification cycle

---

## Deployment Commands

```bash
# Local development
npx wrangler pages dev dist --port 8788

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name=ai-platform-boa --branch=main

# Rollback to previous version
npx wrangler pages deployment rollback <deployment-id>

# List deployments
npx wrangler pages deployment list --project-name=ai-platform-boa
```

---

## Rollback Procedures

### Rollback Worker/Pages
```bash
# List all deployments
npx wrangler pages deployment list --project-name=ai-platform-boa

# Rollback to specific deployment
npx wrangler pages deployment activate <deployment-hash>
```

### Rollback Database Migration
1. Identify last known good migration
2. Create reverse migration in `drizzle/` directory
3. Apply via: `wrangler d1 execute ai-platform-db --file=drizzle/rollback_*.sql`
4. Verify data integrity

### Rollback Configuration
1. Update Cloudflare Pages env vars through dashboard
2. Trigger redeploy: `wrangler pages deployment create dist/`

---

## Feature Flags

Feature flags are managed via `feature_flags` database table with KV caching:

```sql
CREATE TABLE feature_flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  enabled INTEGER DEFAULT 1,
  target_tenant_id INTEGER,
  target_user_id INTEGER,
  rollout_percentage INTEGER DEFAULT 100,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT (datetime('now'))
);
```

Usage:
```ts
import { isFeatureEnabled } from './shared/featureFlags.ts';

const enabled = await isFeatureEnabled(env, 'new_billing_ui', {
  tenantId: 123,
  userId: 456,
});
```

---

## Monitoring & Alerts

### Endpoints
| Endpoint | Purpose | Health Status |
|----------|---------|---------------|
| `/api/health` | Comprehensive health check | 200 OK |
| `/api/health/live` | Liveness probe | 200 OK |
| `/api/health/ready` | Readiness probe | 200/503 |

### Cloudflare Monitor
- Workers Logs → `wrangler tails ai-platform`
- Analytics Dashboard → Cloudflare Dashboard
- D1 Metrics → Database query performance

### Alert Triggers
Deploy failure, AI provider timeout > 30s, DB connection error, billing webhook failure, queue backlog > 1000.

---

## Performance Budget

| Metric | Target | Current |
|--------|--------|---------|
| Build time | < 10s | ~3s |
| Response P95 | < 200ms | ~50ms |
| Bundle size | < 500KB | ~263KB |
| Cold start | < 100ms | ~30ms |

---

## Dependency Management

Run monthly:
```bash
npm audit fix --dry-run    # Check for vulnerabilities
npx npm-check-updates -u   # Update dependencies
npm audit                  # Verify no new vulns
```

---

## Git Workflow

```
main ← feature branches
  ├── pr → auto run CI
  └── merge → auto deploy staging
```

All PRs require passing CI checks before merge.