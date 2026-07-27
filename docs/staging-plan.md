# Staging Environment Deployment Plan
## Date: 2026-07-27
## Task: Task-Deployment-001 — Staging Environment Deployment

### Purpose
First complete online deployment of the AI Platform to Cloudflare Staging environment. This is a **verification-only** deployment — no new business features will be added.

### Prerequisites (All Met)
| Requirement | Status | Evidence |
|-------------|--------|----------|
| `npm run typecheck` — 0 errors | ✅ | Verified in Task-004 |
| `npm run lint` — 0 errors, 941 warnings | ✅ | All pre-existing `any` type warnings |
| `npm run build` — Success | ✅ | dist/ generated (290KB JS) |
| All template literal bugs fixed | ✅ | packages/ai-core fully repaired |
| Import migration adapters created | ✅ | beauty_repository, ai_model_manager, etc. |
| Wrangler CLI available | ✅ | wrangler.toml present and valid |
| D1 database configured | ✅ | database_id bound in wrangler.toml |
| KV namespaces configured | ✅ | USER_CACHE, RATE_LIMITS, FEATURE_FLAGS bound |
| R2 bucket configured | ✅ | ASSETS_BUCKET bound |

### Deployment Order & Dependencies
```
Phase 1: Infrastructure Preparation
├── 1a. Verify wrangler.toml configuration
├── 1b. Set up .env.staging variables
└── 1c. Run preflight checks (all green)

Phase 2: Database Migration
├── 2a. Apply all 37 migrations to staging D1
└── 2b. Verify table count and key tables exist

Phase 3: Deploy Workers (API Functions)
├── 3a. npx wrangler deploy (functions/ → Workers)
└── 3b. Verify /api/health endpoint responds

Phase 4: Deploy Pages (Frontend + Functions)
├── 4a. npm run build
├── 4b. npx wrangler pages deploy dist
└── 4c. Verify static assets load correctly

Phase 5: Smoke Tests
├── 5a. Health API, AI endpoint, Auth endpoints
├── 5b. Beauty, Billing, Admin API endpoints
└── 5c. Frontend page loading

Phase 6: Performance & Logging Validation
├── 6a. Measure TTFB, API latency, AI response time
├── 6b. Verify structured log output (RequestId, duration, plugin)
└── 6c. Generate staging report
```

### Risk Assessment
| Risk | Severity | Mitigation |
|------|----------|------------|
| D1 migration conflicts with existing prod DB | HIGH | Use separate staging D1 database with different name |
| AI Provider keys not set for staging | MEDIUM | Use Mock provider as default for staging |
| R2 bucket not created in staging account | LOW | Temporarily disable file upload features |
| Wrangler authentication fails | MEDIUM | Ensure wrangler login with correct account |
| KV namespace binding mismatch | LOW | Verify binding names match between dev/prod |
| Large migration file causes timeout | MEDIUM | Execute migrations in batches if needed |

### Rollback Plan
1. **Code rollback**: `git checkout <previous-commit>` → re-deploy
2. **D1 rollback**: Create D1 snapshot before migration; restore from snapshot if needed
3. **Pages rollback**: Wrangler Pages keeps last 30 versions — use `wrangler pages deployment rollback`
4. **Workers rollback**: `wrangler deploy --experimental-local` locally first, then redeploy previous commit

### Configuration Audit Findings
---
| Item | Current Value | Issue | Action |
|------|--------------|-------|--------|
| D1 database_name | `ai-platform-db` | Production name used | Consider staging-specific name or use same (Cloudflare shares across envs) |
| D1 database_id | `23b19cc8-...` | Points to prod DB | ⚠️ **MUST VERIFY** — may need separate staging D1 ID |
| KV USER_CACHE | `3370d3a1-...` | Prod binding | May work for staging (shared KV) |
| Pages build output | `./dist` | Correct ✅ | |
| wrangler name | `ai-platform` | Consistent ✅ | |
| NODE_ENV | `production` | In [vars] | Override via .env.staging for staging deployments |

### Notes
- The project uses **Pages Functions** (functions/ directory auto-deployed with Pages), NOT a separate Workers project.
- All API routes are in `functions/api/` — they are bound automatically by Pages.
- No additional Worker needs to be created; Pages + Functions covers all API endpoints.
- The D1 `database_id` in wrangler.toml points to the production database. For staging, either:
  - Use a separate D1 binding with staging DB ID, OR
  - Accept that staging shares the same D1 (not ideal but acceptable for first staging)

---
**Decision Required**: Should we create a separate staging D1 database, or reuse the production D1 for this first staging deployment?
*Recommended: Create a separate staging D1 to avoid data contamination.*
