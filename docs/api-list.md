# API List

> Generated: 2026-07-27
> Auto-scanned from `functions/api/` directory

---

## API Index by Module

### Health

| Method | Path | Plugin | Permission | Status |
|--------|------|--------|------------|--------|
| GET | `/api/health` | System | None | ✅ |
| GET | `/api/health/live` | System | None | ✅ |
| GET | `/api/health/ready` | System | None | ✅ |

---

### Authentication (`/api/auth/`)

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| POST | `/api/auth/guest` | Auth | `{}` | `{ guestId, userId }` | None | ✅ |
| POST | `/api/auth/wechat_login` | Auth | `{ code }` | `{ accessToken, userInfo }` | WeChat OAuth | ✅ |
| POST | `/api/auth/logout` | Auth | — | `{ success: true }` | Authenticated | ✅ |
| GET | `/api/auth/session` | Auth | Cookie: session | `{ user }` | Authenticated | ✅ |
| DELETE | `/api/auth/session` | Auth | — | `{ success: true }` | Authenticated | ✅ |
| POST | `/api/auth/wechat_callback` | Auth | `{ code, state }` | `{ token, user }` | WeChat OAuth | ✅ |

---

### Admin System (`/api/admin/`)

#### Dashboard & Stats

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| GET | `/api/admin/dashboard/stats` | Dashboard | Auth | `{ stats }` | admin | ✅ |
| PATCH | `/api/admin/dashboard/index` | Dashboard | Body | `{ updated }` | admin | 🟡 Stub |

#### Users Management

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| GET | `/api/admin/users` | Admin | Auth | `{ users }` | admin | 🟡 |
| GET | `/api/admin/users/list` | Admin | Query | `{ list }` | admin | 🟡 |
| GET | `/api/admin/users/{id}` | Admin | Path | `{ user }` | admin | 🟡 |
| PATCH | `/api/admin/users/{id}` | Admin | Body | `{ updated }` | admin | 🟡 |
| GET | `/api/admin/billing/users` | Billing Admin | Auth | `{ users }` | admin | 🟡 |
| GET | `/api/admin/billing/user` | Billing Admin | Query | `{ info }` | admin | 🟡 |

#### Agents Management

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| GET | `/api/admin/agents/index` | Agent Admin | Auth | `{ agents }` | admin | 🟡 |
| POST | `/api/admin/agents/create` | Agent Admin | Body | `{ agent }` | admin | ✅ |
| GET | `/api/admin/agents/{id}` | Agent Admin | Path | `{ agent }` | admin | 🟡 |
| GET | `/api/admin/agents/memory/index` | Agent Memory | Auth | `{ memory }` | admin | 🟡 |
| GET | `/api/admin/agents/tasks/index` | Agent Tasks | Auth | `{ tasks }` | admin | 🟡 |

#### AI Task Management

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| GET | `/api/admin/ai/index` | AI Admin | Auth | `{ list }` | admin | ✅ |
| GET | `/api/admin/ai/tasks` | AI Admin | Auth | `{ list }` | admin | ✅ |
| GET | `/api/admin/ai/tasks/{id}` | AI Admin | Path | `{ task }` | admin | 🟡 |
| GET | `/api/admin/ai/tasks/health` | AI Admin | — | `{ health }` | admin | ✅ |
| GET | `/api/admin/ai/tasks/stats` | AI Admin | — | `{ stats }` | admin | ✅ |
| GET | `/api/admin/tasks/index` | Task Admin | Auth | `{ tasks }` | admin | ✅ |
| GET | `/api/admin/tasks/list` | Task Admin | Query | `{ list }` | admin | ✅ |
| GET | `/api/admin/tasks/{id}` | Task Admin | Path | `{ task }` | admin | 🟡 |
| GET | `/api/admin/tasks/{id}/retry` | Task Admin | Path | `{ task }` | admin | 🟡 |
| GET | `/api/admin/tasks/stats` | Task Admin | — | `{ stats }` | admin | ✅ |

#### Models & Providers

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| GET | `/api/admin/models/index` | Model Admin | Auth | `{ models }` | admin | ✅ |
| GET | `/api/admin/models/list` | Model Admin | — | `{ list }` | admin | ✅ |
| POST | `/api/admin/models/create` | Model Admin | Body | `{ model }` | admin | ✅ |
| PUT | `/api/admin/models/{id}` | Model Admin | Path + Body | `{ model }` | admin | 🟡 |
| PUT | `/api/admin/models/update` | Model Admin | Body | `{ model }` | admin | 🟡 |
| GET | `/api/admin/system/providers` | System | Auth | `{ providers }` | admin | 🟡 |

#### Prompts Management

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| GET | `/api/admin/prompts/index` | Prompt Admin | Auth | `{ prompts }` | admin | ✅ |
| GET | `/api/admin/prompts/list` | Prompt Admin | — | `{ list }` | admin | 🟡 |
| POST | `/api/admin/prompts/create` | Prompt Admin | Body | `{ prompt }` | admin | ✅ |
| GET | `/api/admin/prompts/{id}` | Prompt Admin | Path | `{ prompt }` | admin | 🟡 |
| PATCH | `/api/admin/prompts/{id}` | Prompt Admin | Body | `{ prompt }` | admin | 🟡 |
| POST | `/api/admin/prompts/publish` | Prompt Admin | Body | `{ published }` | admin | 🟡 |
| GET | `/api/admin/prompts/versions` | Prompt Admin | Query | `{ versions }` | admin | 🟡 |

#### Billing Admin

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| GET | `/api/admin/billing/overview` | Billing Admin | Auth | `{ overview }` | admin | ✅ |
| GET | `/api/admin/billing/orders` | Billing Admin | Auth | `{ orders }` | admin | ✅ |
| GET | `/api/admin/billing/orders/{id}` | Billing Admin | Path | `{ order }` | admin | 🟡 |
| GET | `/api/admin/billing/transactions` | Billing Admin | Auth | `{ txns }` | admin | ✅ |
| GET | `/api/admin/billing/products` | Billing Admin | Auth | `{ products }` | admin | ✅ |
| POST | `/api/admin/billing/products/create` | Billing Admin | Body | `{ product }` | admin | 🟡 |
| GET | `/api/admin/billing/pricing-rules` | Pricing Admin | Auth | `{ rules }` | admin | ✅ |
| GET/POST | `/api/admin/billing/plans` | Plan Admin | Body | `{ plans }` | admin | ✅ |
| GET/POST | `/api/admin/billing/pricing` | Pricing Admin | Body | `{ pricing }` | admin | ✅ |
| POST | `/api/admin/billing/recharge` | Recharge | Body | `{ success }` | admin | 🟡 |
| GET | `/api/admin/billing/wallets` | Wallet Admin | Auth | `{ wallets }` | admin | 🟡 |
| GET | `/api/admin/billing/revenue/index` | Revenue Admin | Auth | `{ revenue }` | admin | 🟡 |

#### Analytics & Monitoring

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| GET | `/api/admin/analytics/overview` | Analytics | Auth | `{ overview }` | admin | ✅ |
| GET | `/api/admin/analytics/cost` | Analytics | Auth | `{ costs }` | admin | ✅ |
| GET | `/api/admin/analytics/services` | Analytics | Auth | `{ services }` | admin | ✅ |
| GET | `/api/admin/monitor/overview` | Monitor | Auth | `{ overview }` | admin | ✅ |
| GET | `/api/admin/monitor/ai-calls` | Monitor | Auth | `{ calls }` | admin | 🟡 |
| GET | `/api/admin/monitor/logs` | Monitor | Auth | `{ logs }` | admin | ✅ |
| GET | `/api/admin/monitor/tasks` | Monitor | Auth | `{ tasks }` | admin | ✅ |
| GET | `/api/admin/performance/index` | Performance | Auth | `{ perf }` | admin | 🟡 |
| GET | `/api/admin/logs/index` | Logs | Auth | `{ logs }` | admin | ✅ |

#### Security & Settings

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| GET | `/api/admin/security/index` | Security | Auth | `{ security }` | admin | 🟡 |
| GET | `/api/admin/settings/index` | Settings | Auth | `{ settings }` | admin | ✅ |
| PATCH | `/api/admin/settings/index` | Settings | Body | `{ updated }` | admin | ✅ |
| GET | `/api/admin/system/config` | System | Auth | `{ config }` | admin | ✅ |
| POST | `/api/admin/system/config` | System | Body | `{ updated }` | admin | 🟡 |

#### Beauty Admin

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| GET | `/api/admin/beauty/dashboard` | Beauty Admin | Auth | `{ dashboard }` | admin | ✅ |
| GET | `/api/admin/beauty/users` | Beauty Admin | Auth | `{ users }` | admin | ✅ |
| GET | `/api/admin/beauty/reports` | Beauty Admin | Auth | `{ reports }` | admin | ✅ |
| GET | `/api/admin/beauty/bloggers` | Beauty Admin | Auth | `{ bloggers }` | admin | 🟡 |
| POST/PATCH | `/api/admin/beauty/products` | Beauty Admin | Body | `{ products }` | admin | 🟡 |
| GET | `/api/admin/beauty/ai-logs` | Beauty Admin | Auth | `{ logs }` | admin | ✅ |

#### Developer Management

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| GET | `/api/admin/developers/index` | Developer Admin | Auth | `{ devs }` | admin | ✅ |
| GET | `/api/admin/openapi-keys/index` | API Key Admin | Auth | `{ keys }` | admin | ✅ |

#### Marketplace Admin

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| GET/PATCH | `/api/admin/marketplace/index` | Market Admin | Body | `{ apps }` | admin | 🟡 |

#### Knowledge Admin

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| POST | `/api/admin/knowledge/create_base` | Knowledge Admin | Body | `{ base }` | admin | 🟡 |
| POST | `/api/admin/knowledge/add_document` | Knowledge Admin | Body | `{ doc }` | admin | 🟡 |
| GET | `/api/admin/knowledge/list_documents` | Knowledge Admin | Query | `{ docs }` | admin | ✅ |

---

### Business API (Non-Admin)

#### AI Tasks

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| POST | `/api/ai/tasks/create` | AI | Body | `{ taskId }` | Authenticated | ✅ |
| POST | `/api/ai/tasks/cancel` | AI | Body | `{ success }` | Authenticated | 🟡 |
| GET | `/api/ai/tasks/get` | AI | Query | `{ task }` | Authenticated | 🟡 |
| POST | `/api/ai/chat` | AI | Body | `{ response }` | Authenticated | ✅ |
| POST | `/api/ai/generate` | AI | Body | `{ result }` | Authenticated | ✅ |

#### Agents

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| GET | `/api/agents/index` | Agent | Auth | `{ agents }` | Authenticated | 🟡 |
| POST | `/api/agents/index` | Agent | Body | `{ agent }` | Authenticated | ✅ |
| GET | `/api/agents/{id}` | Agent | Path | `{ agent }` | Authenticated | 🟡 |
| POST | `/api/agents/{id}` | Agent | Path + Body | `{ agent }` | Authenticated | 🟡 |
| POST | `/api/agents/run` | Agent | Body | `{ result }` | Authenticated | ✅ |
| POST | `/api/agents/workflow` | Agent | Body | `{ workflowResult }` | Authenticated | 🟡 |
| GET | `/api/agents/tasks/index` | Agent Tasks | Auth | `{ tasks }` | Authenticated | 🟡 |
| GET/POST | `/api/agents/tasks/{id}/cancel` | Agent Cancel | Body | `{ cancelled }` | Owner | 🟡 |
| GET/POST | `/api/agents/tasks/{id}/retry` | Agent Retry | Body | `{ retried }` | Owner | 🟡 |
| GET | `/api/agents/memory/index` | Agent Memory | Auth | `{ memory }` | Authenticated | 🟡 |

#### Beauty App

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| POST | `/api/apps/beauty/upload` | Beauty | Multipart | `{ uploadUrl }` | Authenticated | ✅ |
| POST | `/api/apps/beauty/analyze` | Beauty | Body | `{ taskId }` | Authenticated | ✅ |
| GET | `/api/apps/beauty/get-report` | Beauty | Query | `{ report }` | Authenticated | ✅ |
| GET | `/api/apps/beauty/history` | Beauty | Query | `{ history }` | Authenticated | ✅ |
| GET | `/api/apps/beauty/profile` | Beauty | Query | `{ profile }` | Authenticated | ✅ |
| POST | `/api/apps/beauty/share/poster` | Beauty | Body | `{ posterUrl }` | Authenticated | ✅ |
| GET | `/api/apps/beauty/image` | Beauty | Query | `{ image }` | Authenticated | ✅ |
| POST | `/api/apps/beauty/admin/users/{id}/profile` | Beauty Admin | Body | `{ profile }` | admin | ✅ |

#### Billing & Payment

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| GET | `/api/billing/products/index` | Billing | Auth | `{ products }` | Authenticated | ✅ |
| GET | `/api/billing/quota/index` | Billing | Auth | `{ quota }` | Authenticated | ✅ |
| GET | `/api/billing/subscription/index` | Billing | Auth | `{ subscriptions }` | Authenticated | ✅ |
| GET | `/api/billing/transactions/index` | Billing | Auth | `{ transactions }` | Authenticated | ✅ |
| POST | `/api/payment/create/index` | Payment | Body | `{ paymentUrl }` | Authenticated | ✅ |
| POST | `/api/payment/callback/index` | Payment | Webhook | `{ event }` | Public | ✅ |
| POST | `/api/payment/refund/index` | Payment | Body | `{ refunded }` | Authenticated | ✅ |

#### Orders

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| GET | `/api/orders/index` | Orders | Auth | `{ orders }` | Authenticated | 🟡 |
| GET | `/api/orders/list` | Orders | Query | `{ list }` | Authenticated | 🟡 |
| POST | `/api/orders/index` | Orders | Body | `{ order }` | Authenticated | ✅ |

#### Knowledge

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| GET | `/api/knowledge/index` | Knowledge | Auth | `{ bases }` | Authenticated | ✅ |
| POST | `/api/knowledge/index` | Knowledge | Body | `{ base }` | Authenticated | ✅ |
| GET | `/api/knowledge/search` | Knowledge | Query | `{ results }` | Authenticated | ✅ |
| GET | `/api/knowledge/context` | Knowledge | Body | `{ context }` | Authenticated | 🟡 |
| GET | `/api/knowledge/{id}` | Knowledge | Path | `{ base }` | Authenticated | 🟡 |
| POST | `/api/knowledge/{id}` | Knowledge | Path + Body | `{ updated }` | Authenticated | 🟡 |
| POST | `/api/knowledge/{id}/upload` | Knowledge | Multipart | `{ docId }` | Authenticated | 🟡 |
| POST | `/api/knowledge/{id}/reindex` | Knowledge | Body | `{ reindexed }` | Authenticated | 🟡 |

#### OpenAPI

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| POST | `/api/openapi/v1/chat` | OpenAPI | Body | `{ response }` | API Key | ✅ |
| GET | `/api/openapi/v1/models` | OpenAPI | — | `{ models }` | API Key | ✅ |
| GET | `/api/openapi/v1/quota` | OpenAPI | — | `{ quota }` | API Key | ✅ |
| POST | `/api/openapi/keys/index` | API Key | Body | `{ key }` | Authenticated | ✅ |
| GET | `/api/openapi/keys` | API Key | Auth | `{ keys }` | Authenticated | 🟡 |
| POST/GET | `/api/openapi/v1/webhooks` | Webhook | Body | `{ webhooks }` | API Key | ✅ |

#### Users

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| GET | `/api/user/profile` | User | Auth | `{ user }` | Owner | ✅ |
| PATCH | `/api/user/profile` | User | Body | `{ updated }` | Owner | 🟡 |
| GET | `/api/user/quota` | User | Auth | `{ quota }` | Self | ✅ |
| GET | `/api/user/usage` | User | Auth | `{ usage }` | Self | ✅ |
| GET | `/api/user/billing/index` | User Billing | Auth | `{ billing }` | Self | ✅ |
| GET/PATCH | `/api/user/settings` | User Settings | Body | `{ settings }` | Self | ✅ |

#### Marketplace

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| GET/POST | `/api/marketplace/apps` | Marketplace | Auth | `{ apps }` | Authenticated | 🟡 |

#### Platform / Tenants

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| GET | `/api/platform/tenants/index` | Tenant | Auth | `{ tenants }` | admin | ✅ |
| POST | `/api/platform/tenants/index` | Tenant | Body | `{ tenant }` | admin | ✅ |
| GET | `/api/platform/tenants/list` | Tenant | Query | `{ list }` | admin | ✅ |

#### Developers

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| GET | `/api/developers/keys` | Developer | Auth | `{ keys }` | Authenticated | ✅ |

#### Misc

| Method | Path | Plugin | Request | Response | Permission | Status |
|--------|------|--------|---------|----------|------------|--------|
| GET | `/api/admin-roles` | RBAC | Auth | `{ roles }` | admin | 🟡 |
| GET/POST | `/api/admin-user-roles` | User Roles | Body | `{ roles }` | admin | 🟡 |
| GET/POST | `/api/admin-user-settings` | User Settings | Body | `{ settings }` | admin | 🟡 |
| POST | `/api/prompts/render` | Prompt | Body | `{ rendered }` | Authenticated | ✅ |
| GET | `/api/ai_test_call` | Test | — | `{ result }` | admin | 🟡 Test |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total API Endpoints | ~120+ |
| Admin-only Routes | ~55 |
| Authenticated Routes | ~45 |
| Public Routes | ~5 |
| Fully Implemented | ~70 |
| Stub / Partially Implemented | ~40 |
| HTTP Methods Distribution | GET: 65%, POST: 30%, PATCH: 4%, PUT: 1% |
