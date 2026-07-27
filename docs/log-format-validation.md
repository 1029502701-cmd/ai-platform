# Log Format Validation

## Date: 2026-07-27

### Logger Package Status

| File | Purpose | Production Ready? |
|------|---------|--------------------|
| packages/shared/logger/index.ts | Structured logging with requestId/userId/plugin/duration/errorCode | Yes |
| packages/shared/monitoring/index.ts | Error tracking interface (Sentry-ready) | Yes |
| packages/shared/types/index.ts | Shared type definitions | Yes |
| packages/shared/errors/index.ts | Error utilities | Yes |

### Log Format (Production)

- Level: INFO, WARN, ERROR, FATAL (uppercase JSON)
- Timestamp: ISO8601 format
- Message: Free-text description
- Context fields: requestId, userId, plugin, duration, errorCode, statusCode, method, path

### Integration Points

API handlers should import from packages/shared/logger.
Example usage pattern in request handler:
logger.info('AI chat request', { requestId: 'abc-123', userId: user.id, plugin: 'ai-core' })

### Notes for Staging Deployment

- Cloudflare Pages Functions automatically log to Cloudflare built-in logging.
- Structured JSON logs visible in Cloudflare dashboard under Logs.
- For Sentry integration, configure SENTRY_DSN in staging environment variables.
- The monitoring package provides a track() interface wireable to Sentry later.

