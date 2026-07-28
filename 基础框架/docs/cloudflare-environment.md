# Cloudflare Environment Configuration

## Platform Overview

This AI Platform runs on Cloudflare infrastructure with the following services:

| Service | Purpose | Status |
|---------|---------|--------|
| **Pages** | Frontend SPA hosting | Configured |
| **Workers** | API endpoints & plugin routing | Configured |
| **D1** | Primary database (SQLite) | Configured |
| **KV** | Cache & user sessions | Configured |
| **R2** | File storage | Configured |
| **Workers AI** | Optional AI inference | Available |

## Environment Tiers

### Development
- Local via `wrangler dev`
- `.dev.vars` for local secrets
- No auth restrictions

### Staging/Testing
- Separate D1 database
- Limited KV namespace
- Feature flags disabled

### Production
- Production D1 with backups enabled
- Full KV namespaces
- R2 for file storage
- Strict auth and CORS policies

## Bindings Configuration

### Workers Functions
Located in `functions/` directory — auto-bound by Wrangler.

### Pages Functions
Located in `functions/api/` — bound to Pages runtime.

### Key Binding Names
| Name | Type | Description |
|------|------|-------------|
| `DB` | D1 | Primary SQLite database |
| `USER_CACHE` | KV | User session/cache storage |
| `APP_KV` | KV | Application-level KV store |
| `STORAGE` | R2 | File/object storage bucket |
| `OPENAI_API_KEY` | Secret | OpenAI provider key |
| `DEEPSEEK_API_KEY` | Secret | DeepSeek provider key |

## Migration Workflow

1. Update `drizzle/` migrations
2. Run `npx wrangler d1 execute PLATFORM_DB --local --file=migrations/XXX.sql` for local
3. Run `npx wrangler d1 execute PLATFORM_DB --command="PRAGMA integrity_check;"` to verify
4. Deploy with `npm run deploy`
