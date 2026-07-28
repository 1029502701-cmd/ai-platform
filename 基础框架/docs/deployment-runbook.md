# Deployment Runbook

## Quick Deploy

### 1. Prerequisites
- `npm install` completed successfully
- `npm run typecheck` returns 0 errors
- `npm run build` completes without errors
- All required environment variables set

### 2. Database Migration
```bash
# Apply migrations to production D1
npx wrangler d1 execute PLATFORM_DB --command=".read drizzle/migrations/001_init.sql"

# Or use Drizzle Kit if configured:
npx drizzle-kit push
```

### 3. Deploy Pages (Frontend)
```bash
npx wrangler pages deploy dist --project-name=ai-platform
```

### 4. Deploy Workers (API Functions)
```bash
npx wrangler deploy
```

### 5. Verify Deployment
```bash
# Check frontend loads
curl -I https://YOUR-PAGES-SITE.pages.dev

# Check API health
curl https://YOUR-WORKER.workers.dev/api/health

# Test AI endpoint
curl "https://YOUR-WORKER.workers.dev/api/ai_test_call?prompt=Hello"
```

## Update Deploy (Subsequent Deploys)

1. Make code changes
2. `npm run typecheck && npm run build`
3. Push database changes (if any)
4. `npx wrangler deploy`

## Rollback

1. If deployment fails, revert code: `git checkout HEAD~1`
2. Re-deploy previous version: `npx wrangler deploy`
3. For database rollbacks — restore from D1 backup via Cloudflare dashboard

## Environment Checklist

| Variable | Dev | Staging | Prod |
|----------|-----|---------|------|
| DB | ✅ Local | ✅ Separate | ✅ Production |
| OPENAI_API_KEY | Yes* | Yes | Yes |
| DEEPSEEK_API_KEY | Yes* | No | Yes |
| SESSION_SECRET | Dev only | Auto | Required |
| LOG_LEVEL | debug | info | warn |

* Local dev keys in .dev.vars (not committed)
