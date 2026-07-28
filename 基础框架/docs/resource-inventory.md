# Resource Inventory for AI Platform

## Date: 2026-07-27

## Current Configuration (wrangler.toml)
This document lists all Cloudflare resources configured for the AI Platform.

## Cloudflare Pages
| Field | Value |
|-------|-------|
| Project | ai-platform |
| Name | ai-platform (worker subdomain) |
| Build Dir | ./dist |
| Compatible | 2026-07-25, nodejs_compat flag |

## Cloudflare Workers (Functions)
All files in unctions/ are auto-bound as Pages Functions.
Total endpoint files: 137+ TypeScript files generating API routes.

## D1 Database
| Field | Value |
|-------|-------|
| Binding | DB |
| Name | ai-platform-db |
| ID | 23b19cc8-2a4d-4c4a-a9a7-a30ec61820c9 |
⚠ **Note**: This ID points to a production D1 database. For staging isolation, a separate D1 instance should be created.

## KV Namespaces
| Binding | ID | Purpose |
|---------|-----|---------|
| USER_CACHE | 3370d3a1db49404aa2615c706a5e15eb | User sessions/cache |
| RATE_LIMITS | 2c2c7dc47eb44448ba93c06f45d3f984 | Rate limiting |
| FEATURE_FLAGS | 5c4baaf523b74520afb3c04c19d751a6 | Feature flag store |

## R2 Bucket
| Binding | Value |
|---------|-------|
| ASSETS_BUCKET | ai-platform-assets (bucket name) |

## Queues
| Queue Name | Binding | Purpose |
|------------|---------|---------|
| ai-tasks | AI_TASK_QUEUE | AI task processing |
| billing-events | BILLING_QUEUE | Billing event processing |

## Summary
Total Cloudflare resources: 1 (Pages) + 1 (D1) + 3 (KV) + 1 (R2) + 2 (Queues) = 8 resources
