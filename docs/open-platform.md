# Open Platform — API Gateway & Developer Ecosystem

## Overview

Task-Platform-017 establishes a unified Open Platform that allows external developers to consume AI capabilities through a standardized REST API compatible with OpenAI's format.

## Architecture

```
Developer / Third-Party App
        │
        ▼
  Bearer Token (ak_xxx) or api_key query param
        │
        ▼
  /api/openapi/v1/*  (Route Handler)
        │
   requireOpenApiAuth()
        │  (HMAC key validation, hash lookup)
        ▼
  DeveloperService
        │
   ┌────┼───────────────────┐
   ▼    ▼                   ▼
 Chat   Models            Quota
   ▼         │              │
   AI Core   │              │
   │         ▼              │
 Provider ───┘              │
                            │
                     recordUsage()
                     (api_usage table)
```

## API Endpoints

### Authentication

All OpenAPI endpoints require an API key via:
- `Authorization: Bearer ak_xxxx` header
- `?api_key=ak_xxxx` query parameter

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/openapi/v1/chat` | Chat completion |
| GET | `/api/openapi/v1/models` | List available models |
| GET | `/api/openapi/v1/quota` | Check developer quota |
| POST | `/api/openapi/v1/webhooks` | Register webhook |
| GET | `/api/openapi/v1/webhooks` | List webhooks |
| POST | `/api/openapi/keys` | Create API key (dev portal) |

### Admin Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/developers` | List all developers |
| GET | `/api/admin/openapi-keys` | List all API keys |

### Frontend Pages

| Route | Description |
|-------|-------------|
| `/developers` | Developer Portal (key management) |
| `/playground` | OpenAPI Playground (live testing) |

## Database Tables

Created by `drizzle/0034_open_platform.sql`:

- **developers** — Developer accounts
- **api_keys** — API keys (hashed storage, SHA-256)
- **api_usage** — Per-request usage tracking
- **webhooks** — Outbound webhook configurations
- **webhook_logs** — Webhook delivery logs

## Security

- API keys stored as SHA-256 hashes only
- Raw key returned once on creation
- HMAC-SHA256 webhook signatures
- Rate limiting via `_middleware.ts` tier system
- Tenant isolation via `tenant_id` column

## Usage Tracking

Every OpenAPI request is logged to `api_usage`:
- developer_id, api_key_id
- resource_type, endpoint
- tokens_used, cost_cents, latency_ms
- status_code, created_at

## Deployment Notes

- No build-time dependencies added
- Compatible with existing Cloudflare Pages deployment
- D1 database binding already configured as `DB`
- Migration 0034 needs manual execution on production D1

## Next Steps (Task-018)

- Generate Swagger/OpenAPI spec
- Add OAuth2 client credentials flow
- Implement usage dashboards for developers
- Add IP whitelisting enforcement