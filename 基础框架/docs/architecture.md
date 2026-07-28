# Architecture Documentation

> Generated: 2026-07-27
> Last reviewed: TBD

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │  Pages   │ │Components│ │  Stores  │ │   Admin Console  │   │
│  │ (51 files)│ │  (Tailwind)│ │(Auth/etc)│ │   (Stub pages)  │   │
│  └────┬─────┘ └──────────┘ └──────────┘ └──────────────────┘   │
│       │                                                           │
│    Vite Build → dist/ → Cloudflare Pages CDN                    │
└───────┼───────────────────────────────────────────────────────────┘
        │ HTTP / WebSocket
┌───────▼───────────────────────────────────────────────────────────┐
│                    Cloudflare Pages Functions                      │
│                     (142 API route files)                          │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │                     API Router                              │    │
│  │  /api/auth/*  /api/admin/*  /api/ai/*  /api/billing/*     │    │
│  │  /api/payment/*  /api/tasks/*  /api/beauty/*  ...         │    │
│  └────────────────────────────┬──────────────────────────────┘    │
│                               │                                    │
│          ┌────────────────────┼────────────────────┐              │
│          ▼                    ▼                    ▼              │
│  ┌──────────────┐   ┌────────────────┐   ┌──────────────┐         │
│  │ Plugin Router │   │ Business Logic │   │ Auth/RBAC    │         │
│  │ (Plugin       │   │ (shared/       │   │ (packages/   │         │
│  │  registry)    │   │  services/)    │   │  auth/)      │         │
│  └──────┬───────┘   └───────┬────────┘   └──────┬───────┘         │
└─────────┼───────────────────┼───────────────────┼─────────────────┘
          │                   │                   │
┌─────────▼───────────────────▼───────────────────▼─────────────────┐
│                        Shared Layer                                 │
│  ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Security   │ │ Tenant   │ │ Logger   │ │ Storage (R2)     │   │
│  │ (rateLimit,│ │ (resolver│ │ (winston)│ │ (file-service.ts)│   │
│  │  audit)    │ │  service)│ │          │ │                  │   │
│  └────────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    AI Service Layer                        │  │
│  │  ai_queue_service.ts → ai_queue_worker.ts → queue package  │  │
│  └────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬──────────────────────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────────────┐
│                      Packages (Monorepo)                          │
│  ┌─────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ ai-core     │ │ auth     │ │ billing  │ │ queue            │  │
│  │ - Provider  │ │ - Session│ │ - Wallet │ │ - Producer/      │  │
│  │   Router    │ │ - RBAC   │ │ - Plans  │ │   Consumer        │  │
│  │ - Model Reg │ │ - WeChat │ │ - Subs   │ │ - Retry/Locks    │  │
│  │ - Scenarios │ │ - Guest  │ │ - Rules  │ │ - Scheduler      │  │
│  └─────────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
│                                                                   │
│  Note: packages/database and packages/shared-utils are EMPTY      │
└────────────────────────────────────┬──────────────────────────────┘
                                     │
┌─────────────────────────────────────▼─────────────────────────────┐
│                     AI Providers (External)                       │
│  ┌────────────┐ ┌─────────────┐ ┌────────────┐ ┌──────────────┐  │
│  │ OpenAI     │ │ DeepSeek    │ │ Anthropic  │ │ Google Gemini│  │
│  │ (apiKey)   │ │ (apiKey)    │ │ (planned)  │ │ (planned)    │  │
│  └────────────┘ └─────────────┘ └────────────┘ └──────────────┘  │
└────────────────────────────────────────┬─────────────────────────┘
                                         │ API Calls
┌─────────────────────────────────────────▼────────────────────────┐
│                     Storage Layer (Cloudflare)                    │
│  ┌──────────────┐  ┌────────────┐  ┌───────────┐  ┌──────────┐  │
│  │ D1 Database  │  │ KV Cache   │  │ R2 Bucket │  │ Queues   │  │
│  │ (SQLite)     │  │ (User/Data)│  │ (Assets)  │  │ (Async)  │  │
│  │ 50+ tables   │  │ Feature    │  │ Beauty    │  │ AI Tasks │  │
│  │              │  │ Flags      │  │ Images    │  │ Billing  │  │
│  └──────────────┘  └────────────┘  └───────────┘  └──────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Layer-by-Layer Responsibility

### 1. Frontend Layer (`src/`, `plugins/*/frontend/`)

**职责：** 用户界面呈现、路由管理、状态管理、与 API 通信

- **Pages:** 基于 React Router 声明式路由（`App.tsx`）
- **Components:** 共享 UI 组件（Layout、Footer、Header、Sidebar）
- **Stores:** Zustand/Auth Provider 客户端状态管理
- **Hooks:** 可复用的 React hooks
- **Plugin Frontends:** 插件提供的 React 组件（如 BeautyReportView）

**技术栈：** React + TypeScript + TailwindCSS + Vite

---

### 2. Pages Functions Layer (`functions/api/`)

**职责：** REST API 端点、请求认证、参数校验、业务调度

- 全部通过 Cloudflare Pages Functions 托管
- 按功能分组：`admin/`、`agents/`、`ai/`、`auth/`、`billing/`、`payment/` 等
- 每个函数独立处理一个 HTTP 端点
- 统一错误处理和 JSON 响应格式

**认证中间件：** `_openapi_auth.ts`、`_tenant_middleware.ts`

---

### 3. Plugin Router Layer (`shared/plugins/`, `shared/plugin-registry/`)

**职责：** 插件发现、注册、加载、卸载

- Plugin Manifest 驱动的配置
- 支持动态加载外部插件
- Beauty 插件是目前唯一完整实现的插件

---

### 4. Business Logic Layer (`shared/services/`)

**职责：** 共享业务逻辑、跨模块服务

- **AI Services:** 任务提交、队列管理、Provider 调用
- **Billing Services:** 计费、钱包、订阅
- **Auth Services:** 用户验证、Session 管理
- **Analytics Services:** 数据统计
- **Storage Services:** 文件上传/下载

**⚠️ 注意：** 此层存在大量重复代码，正在迁移到 `packages/` 中。

---

### 5. Package Layer (`packages/`)

**职责：** 核心领域逻辑封装为独立包

| 包 | 职责 | 关键文件 |
|----|------|----------|
| `ai-core` | AI 模型管理、Provider 路由 | `provider-router.ts`, `model-registry.ts` |
| `auth` | 认证、授权、Session | `middleware.ts`, `session.ts`, `rbac.ts` |
| `billing` | 计费核心 | `core.ts`, `repository.ts`, `middleware.ts` |
| `queue` | 消息队列系统 | `producer.ts`, `consumer.ts`, `retry.ts` |

**包间依赖关系：**

```
packages/auth    → 无依赖（基础层）
packages/billing → 无直接包依赖
packages/queue   → 使用 DB env binding
packages/ai-core → 使用 DB/KV env binding
```

---

### 6. AI Core + Provider Layer (`packages/ai-core/src/providers/`)

**职责：** 将 AI 请求转发给外部 Provider

- **OpenAI Provider:** 对接 OpenAI Chat Completions API
- **DeepSeek Provider:** 对接 DeepSeek Chat API
- **Mock Provider:** 本地开发模拟
- **Provider Router:** 根据 model config 路由到对应 Provider

---

### 7. Storage Layer (Cloudflare Bindings)

**D1 Database** (Primary datastore)
- SQLite-based relational database
- 50+ tables across 37 migration versions
- Core entities: users, ai_tasks, billing, agents, knowledge, beauty, marketplace

**KV Store** (Cache)
- `USER_CACHE` — User data cache
- `RATE_LIMITS` — Rate limiting counters
- `FEATURE_FLAGS` — Feature toggle state

**R2 Bucket** (Object storage)
- `ASSETS_BUCKET` — Beauty images, share posters, user uploads

**Queues** (Async processing)
- `AI_TASK_QUEUE` — Async AI task execution
- `BILLING_QUEUE` — Async billing events

---

## Data Flow Examples

### AI Task Submission Flow

```
Frontend → POST /api/ai/tasks/create
  → functions/api/ai/tasks/create.ts
    → shared/services/ai_queue_service.ts
      → packages/queue (Producer)
        → Queue: AI_TASK_QUEUE
          → packages/queue (Consumer)
            → packages/ai-core (Provider Router)
              → Provider (OpenAI/DeepSeek/Mock)
                → External API (openai.com / deepseek.com)
                  ← Response
```

### Payment + Billing Flow

```
Frontend → POST /api/payment/create
  → functions/api/payment/create/index.ts
    → packages/billing (Order creation)
      → D1 DB (billing_orders table)
    → External Payment Gateway (Stripe/etc)
      ← Webhook callback
        → functions/api/payment/callback/
          → packages/billing (Subscription update)
            → Queue: BILLING_QUEUE
              → Subscription renewal worker
```

### Authentication Flow

```
WeChat OAuth → /api/auth/wechat_callback
  → packages/auth (session.create)
    → D1 DB (users + user_sessions tables)
    → KV (USER_CACHE)
    ← Set-Cookie: session_user
```

---

## Technology Stack Summary

| 类别 | 技术 |
|------|------|
| Frontend | React 18 + TypeScript + TailwindCSS + Vite |
| Routing | React Router v6 |
| State | Zustand |
| Backend | Cloudflare Pages Functions |
| Database | Cloudflare D1 (SQLite) |
| Cache | Cloudflare KV |
| Storage | Cloudflare R2 |
| Queue | Cloudflare Queues |
| ORM | Drizzle ORM |
| Deployment | Wrangler / Cloudflare Pages |
| CI/CD | GitHub Actions |
| Styling | TailwindCSS v4 |

---

## Key Design Decisions & Trade-offs

1. **Functions-per-endpoint pattern** — 每个 API 端点是独立文件，简单直观但缺乏统一入口路由
2. **Dual billing implementation** — `packages/billing` 和 `shared/services/billing*.ts` 并存，需迁移完成
3. **Mixed naming convention** — `camelCase` (`.service.ts`) 和 `snake_case` (`_service.ts`) 混用
4. **Empty package directories** — `packages/database` and `packages/shared-utils` 已创建但无内容
5. **Admin stub pages** — 大部分 Admin 子页面仅有占位 HTML，未与 API 对接
