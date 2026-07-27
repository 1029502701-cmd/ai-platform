# Project Status Report

> Generated: 2026-07-27
> Scope: Complete repository scan and status audit

---

## 1. Directory Tree

```
AI体验馆/                          # 项目根目录
├── .codex/                        # AI Agent 配置文档（非业务代码）
├── .github/workflows/             # CI/CD pipeline (GitHub Actions)
├── .wrangler/                     # Wrangler 本地运行时状态（可忽略）
├── admin/                         # ❌ 废弃 — 未引用的旧 admin React 组件
├── apps/                          # 空目录
├── database/                      # 📁 DB 工具脚本（JS + TS 各一份）
├── dist/                          # ⚙️ Vite 构建产物（不应提交到 git）
├── docs/                          # 📁 项目文档
├── drizzle/                       # 📁 Drizzle ORM schema + SQL migrations（37 个版本）
├── functions/                     # 📁 Cloudflare Pages Functions API（142 文件）
│   └── api/                       #   ├── admin/     — 管理后台 API
│   │                            #   ├── agents/    — Agent 引擎 API
│   │                            #   ├── ai/        — AI 任务 API
│   │                            #   ├── auth/      — 认证 API
│   │                            #   ├── billing/   — 计费 API
│   │                            #   ├── payment/   — 支付 API
│   │                            #   └── ...
├── packages/                      # 📁 内部 NPM 包（monorepo 结构）
│   ├── ai-core/                   #   AI 核心：模型注册、Provider 路由
│   ├── auth/                      #   认证：Session、OAuth WeChat、RBAC
│   ├── billing/                   #   计费：Plan、Subscription、Wallet
│   ├── queue/                     #   队列：生产消费、重试、锁
│   ├── database/                  #   ⚠️ 空包（无源码）
│   └── shared-utils/              # ⚠️ 空包（无源码）
├── plugins/                       # 📁 插件系统
│   └── beauty/                    #   美妆分析插件（前端组件 + manifest）
├── public/                        # 📁 静态资源（favicon 等）
├── shared/                        # 📁 共享层（125 文件 — 存在大量重复代码）
│   ├── billing/                   #   计费类型定义
│   ├── config/                    #   配置加载器
│   ├── connectors/                #   Provider 连接器基类
│   ├── errorHandler/              #   统一错误处理
│   ├── logger/                    #   日志系统
│   ├── security/                  #   安全中间件、速率限制、审计
│   ├── services/                  #   ⚠️ 服务层（大量重复，见下方详细分析）
│   ├── storage/                   #   文件存储服务
│   ├── tenant/                    #   多租户解析
│   └── types/                     #   共享类型定义
├── src/                           # 📁 前端 React 应用（51 文件）
│   ├── components/                #   UI 组件（Layout、Footer、Header 等）
│   ├── config/                    #   路由配置
│   ├── hooks/                     #   React Hooks
│   ├── lib/                       #   客户端库（aiClient.ts）
│   ├── pages/                     #   页面组件
│   │   ├── admin/                 #     Admin 页面（Dashboard、BeautyAdmin 等）
│   │   ├── beauty/                #     美妆分析页面
│   │   ├── Developers/            #     开发者平台页面
│   │   ├── Legal/                 #     法律页面
│   │   └── ...                    #     Chat, Pricing, Marketplace 等
│   ├── services/                  #   ❌ 空目录
│   ├── stores/                    #   Zustand/Auth Provider store
│   ├── styles/                    #   Global CSS
│   └── utils/                     #   ❌ 空目录
├── tests/                         # 📁 测试文件（32 文件）
│   ├── _r2_emulator/              #   R2 模拟器图片
│   ├── ai_core/                   #   AI Core 单元测试
│   ├── e2e/                       #   E2E 测试
│   ├── fixtures/                  #   测试素材
│   └── queue/                     #   队列测试（CJS 格式）
├── workers/                       # 📁 Cloudflare Worker 脚本
└── wrangler.toml                  # ⚙️ Cloudflare Workers 配置
```

---

## 2. Module Purpose Summary

| 模块 | 用途 | 文件数 | 状态 |
|------|------|--------|------|
| `functions/api/` | Cloudflare Pages Functions — 全部 API 路由 | 142 | 🟢 活跃 |
| `src/` | Vite + React 前端应用 | 51 | 🟢 活跃 |
| `shared/services/` | 服务端共享逻辑（API 函数调用） | ~38 | 🟡 有大量重复 |
| `shared/config/` | 配置加载与管理 | 3 | 🟢 活跃 |
| `shared/security/` | 安全中间件、鉴权、速率限制 | 7 | 🟢 活跃 |
| `shared/tenant/` | 多租户隔离与解析 | 5 | 🟢 活跃 |
| `packages/ai-core/` | AI 模型管理与 Provider 路由 | 15 | 🟢 活跃 |
| `packages/auth/` | 认证模块（Session、WeChat OAuth、RBAC） | 9 | 🟢 活跃 |
| `packages/billing/` | 计费核心（Plan、Subscription、Wallet） | 9 | 🟢 活跃 |
| `packages/queue/` | 消息队列（生产者、消费者、重试） | 17 | 🟢 活跃 |
| `drizzle/` | 数据库 schema + Migrations | 49 | 🟢 活跃 |
| `plugins/beauty/` | 美妆分析前端插件 | 5 | 🟢 活跃 |
| `admin/` | 旧版 Admin 组件（仅被 `src/pages/admin/` 引用） | 16 | 🟡 部分废弃 |
| `database/` | DB 工具脚本 | 2 | 🟡 待确认 |
| `tests/` | 测试套件 | 32 | 🟡 需要重构 |
| `workers/` | Worker 脚本 | 1 | 🟡 单文件 |

---

## 3. Pages (Frontend Routes)

基于 `src/App.tsx` 路由配置：

| 路径 | 页面组件 | 说明 | 状态 |
|------|----------|------|------|
| `/` | IndexPage | 首页 | 🟢 |
| `/login` | LoginPage | 登录页 | 🟢 |
| `/register` | RegisterPage | 注册页 | 🟢 |
| `/chat` | ChatPage | AI 聊天 | 🟢 |
| `/pricing` | PricingPage | 定价页 | 🟢 |
| `/developers` | DevelopersPage | 开发者中心 | 🟢 |
| `/playground` | OpenApiPlayground | API  Playground | 🟢 |
| `/marketplace` | MarketplacePage | 应用市场 | 🟢 |
| `/integrations` | IntegrationsPage | 集成页面 | 🟢 |
| `/admin/*` | AdminLayout + subpages | 管理后台 | 🟢 |
| `/beauty` | BeautyHomePage | 美妆分析首页 | 🟢 |
| `/beauty/profile` | BeautyProfilePage | 个人美妆档案 | 🟢 |
| `/beauty/report` | PluginBeautyReportView | 美妆报告查看 | 🟢 |
| `/beauty/share/:id` | BeautySharePage | 分享页 | 🟢 |
| `/monitor` | MonitorPage | 监控面板 | 🟡 |
| `/account` | AccountPage | 账户页 | 🟡 |

---

## 4. Workers

| 文件 | 说明 | 状态 |
|------|------|------|
| `workers/subscription_renewal.ts` | 订阅自动续期 Worker | 🟡 单文件 |

---

## 5. Functions (API Routes)

共 **142 个** API 端点文件，组织为：

### Admin API (`functions/api/admin/`)
- `users/`, `agents/`, `ai/tasks/`, `analytics/`, `billing/`, `dashboard/`
- `developers/`, `knowledge/`, `logs/`, `marketplace/`, `models/`, `monitor/`
- `openapi-keys/`, `performance/`, `prompts/`, `security/`, `settings/`, `system/`, `tasks/`

### Business API (`functions/api/`)
- `agents/` — Agent 运行与管理
- `ai/` — AI 任务创建/查询/取消
- `apps/beauty/` — 美妆分析全流程
- `auth/` — Session、微信登录
- `billing/` — 产品、配额、订阅、交易
- `developers/` — Developer Keys 管理
- `health/` — 健康检查
- `knowledge/` — 知识库管理
- `marketplace/` — 应用市场
- `openapi/` — OpenAPI 接口
- `orders/` — 订单管理
- `payment/` — 支付流程（创建、回调、退款）
- `platform/tenants/` — 多租户
- `prompts/` — Prompt 渲染
- `tasks/` — AI 任务通用 API
- `user/` — 用户信息/用量/设置
- `webhooks/` — Webhook 接收

---

## 6. Plugins

| 插件 | 路径 | 描述 | 状态 |
|------|------|------|------|
| Beauty | `plugins/beauty/` | 美妆分析报告生成前端组件 | 🟢 MVP |
| (计划) Auth | `packages/auth/` | 认证系统 | 🟢 已完成 |
| (计划) Billing | `packages/billing/` | 计费系统 | 🟢 已完成 |
| (计划) Queue | `packages/queue/` | 消息队列 | 🟢 已完成 |

---

## 7. Shared Layer

### 有引用（✅）
- `shared/config/` — 配置加载
- `shared/security/` — 安全中间件
- `shared/tenant/` — 多租户
- `shared/storage/` — 文件存储
- `shared/logger/` — 日志
- `shared/errorHandler/` — 错误处理
- `shared/plugins/` — 插件注册表

### 有重复代码（❌ 需清理）
- `shared/services/billing.service.ts` ↔ `shared/services/billing_service.ts` — **完全重复**
- `shared/services/billing.errors.ts` ↔ `shared/services/billing_errors.ts` — **完全重复**
- `shared/services/billing.types.ts` ↔ `shared/services/billing_types.ts` — **完全重复**
- `shared/services/billing.repository.ts` ↔ `shared/services/billing_repository.ts` — **完全重复**
- `shared/services/billing.middleware.ts` ↔ `shared/services/billing_middleware.ts` — **内容不同**（保留后者）
- `shared/services/ai_provider_adapters_openai.ts` — 孤立，应由 `packages/ai-core` 管理
- `shared/services/ai_provider_adapters_deepseek.ts` — 孤立，应由 `packages/ai-core` 管理
- `shared/services/ai_core.ts` — 与 `packages/ai-core/` 重复
- `shared/services/ai_model_manager.ts` — 与 `packages/ai-core/model-registry.ts` 重复

---

## 8. Drizzle Migrations

共 **37 个**版本迁移 + 4 个辅助 SQL 文件。

| 编号 | 文件 | 内容 |
|------|------|------|
| 0001 | initial.sql | users, profiles, conversations, messages, ai_jobs |
| 0002 | auth_sessions.sql | auth_sessions |
| 0003 | roles_permissions.sql | roles, permissions, role_permissions, user_roles, audit_logs |
| 0004a | add_profile_image.sql | profiles 增加 image_url |
| 0004b | user_settings.sql | user_settings |
| 0005 | ai_providers_models.sql | ai_providers, ai_models |
| 0006 | ai_model_limits.sql | ai_model_limits |
| 0007 | prompts.sql | prompts, prompt_versions |
| 0008 | knowledge.sql | knowledge_bases, knowledge_documents, knowledge_chunks |
| 0009 | ai_scenarios.sql | ai_scenarios |
| 0010 | ai_tasks.sql | ai_tasks |
| 0011 | ai_tasks_retry.sql | ai_tasks 增加 retry 字段 |
| 0012 | add_profile_last_analysis_image.sql | profiles 增加 last_analysis_image |
| 0013a | add_report_share_image.sql | beauty_reports 增加 share_image_url |
| 0013b | fix_beauty_reports.sql | beauty_reports 修复 |
| 0014 | add_beauty_profile_fields.sql | beauty_profiles |
| 0015 | create_beauty_analysis_history.sql | beauty_analysis_history |
| 0016 | modify_users_add_auth_fields.sql | users 增加 openid, unionid |
| 0017 | create_user_sessions.sql | user_sessions |
| 0018 | create_user_usage_limits.sql | user_usage_limits |
| 0019 | billing_reservations.sql | billing_reservations |
| 0020 | queue_indexes.sql | 索引优化 |
| 0021 | production_tables.sql | wallets, transactions, ai_results |
| 0022 | monitoring_tables.sql | system_logs, ai_call_logs |
| 0023 | admin_console.sql | system_settings, admin_roles, 重新创建 prompts/prompts_versions |
| 0024 | user_system.sql | user_quotas, user_usage, user_plans, user_plan_assignments |
| 0025 | ai_engine.sql | ai_prompt_templates, ai_tools, ai_call_metrics |
| 0026 | knowledge_embeddings.sql | knowledge_embeddings |
| 0027 | agent_engine.sql | agents, agent_tasks, agent_memory, agent_workflows/nodes/edges |
| 0028 | db_optimization.sql | 索引优化 |
| 0029 | billing_platform.sql | billing_products, user_subscriptions, billing_orders, billing_transactions, billing_rules |
| 0030 | billing_indexes.sql | 计费索引 |
| 0031 | security_compliance.sql | backup_records, security_events |
| 0032 | multi_tenant.sql | tenants, tenant_domains, user_sessions_tenant |
| 0033 | feature_flags.sql | feature_flags |
| 0034 | open_platform.sql | developers, api_keys, api_usage, webhooks, webhook_logs |
| 0035 | ecosystem.sql | marketplace_apps/versions/installs, plugins/versions, templates, workflows_marketplace, prompt_library, integration_connections, notifications, file_storage, developer_incomes, marketplace_orders/reviews, ai_shares |
| 0036 | beauty_integration.sql | 美妆集成相关 |
| 0037a | beauty_products.sql | beauty_products, beauty_bloggers |
| 0037b | beauty_products_seed.sql | 种子数据 |

---

## 9. Admin Pages

| 路由 | 组件 | 状态 |
|------|------|------|
| /admin | Dashboard | 🟢 |
| /admin/users | 占位文本 | 🟡 |
| /admin/models | 占位文本 | 🟡 |
| /admin/tasks | 占位文本 | 🟡 |
| /admin/queue | 占位文本 | 🟡 |
| /admin/prompts | 占位文本 | 🟡 |
| /admin/logs | 占位文本 | 🟡 |
| /admin/settings | 占位文本 | 🟡 |
| /admin/developers | 占位文本 | 🟡 |
| /admin/beauty | BeautyAdminPage | 🟢 |
| /admin/marketplace | 占位文本 | 🟡 |

---

## 10. API Backend Structure

```
functions/api/
├── admin/          # 管理后台 API（需 admin 角色）
├── agents/         # Agent 引擎 API
├── ai/             # AI 任务 API
├── apps/beauty/    # 美妆分析 API
├── auth/           # 认证 API
├── billing/        # 计费 API
├── developers/     # 开发者 API
├── health/         # 健康检查
├── knowledge/      # 知识库 API
├── marketplace/    # 市场 API
├── openapi/        # OpenAPI 接口
├── orders/         # 订单 API
├── payment/        # 支付 API
├── platform/       # 平台 API
├── prompts/        # Prompt 渲染 API
├── tasks/          # 通用任务 API
└── user/           # 用户 API
```

---

## 11. Beauty Module

| 层级 | 位置 | 说明 |
|------|------|------|
| 前端 | `plugins/beauty/frontend/` | 报告渲染组件 |
| 前端页面 | `src/pages/beauty/` | 美妆分析页面 |
| API | `functions/api/apps/beauty/` | 分析/上传/报告/历史 |
| 后端服务 | `shared/services/plugins/*.ts` | 人脸分析引擎 |
| 数据库 | `beauty_reports`, `beauty_profiles`, `beauty_analysis_history` | 3 张表 |

---

## 12. Auth Module

| 层级 | 位置 | 说明 |
|------|------|------|
| 包 | `packages/auth/src/` | 认证核心逻辑 |
| 共享 | `shared/services/auth.ts` | 认证中间件（重复） |
| API | `functions/api/auth/` | 登录/Session/微信 |
| 数据库 | `users`, `user_sessions`, `profiles` | 3+ 张表 |

---

## 13. Billing Module

| 层级 | 位置 | 说明 |
|------|------|------|
| 包 | `packages/billing/src/` | 计费核心逻辑 |
| 共享 | `shared/services/billing*.ts` | 重复代码（11 文件） |
| API | `functions/api/billing/`, `functions/api/payment/` | 计费/支付 |
| 数据库 | `wallets`, `transactions`, `user_subscriptions`, `billing_orders` 等 | 多个表 |

---

## 14. AI Core Module

| 层级 | 位置 | 说明 |
|------|------|------|
| 包 | `packages/ai-core/src/` | 模型注册、Provider 路由 |
| Provider | `packages/ai-core/src/providers/` | OpenAI, DeepSeek, Mock |
| 队列 | `packages/queue/src/` | 任务队列 |
| 共享服务 | `shared/services/ai_*.ts` | 重复代码 |
| API | `functions/api/ai/`, `functions/api/tasks/` | AI 任务 |

---

## 15. Completed Features ✅

1. **认证系统** — 邮箱注册/登录 + 微信 OAuth + Session + Guest 模式
2. **RBAC** — 角色权限管理（admin/user）
3. **AI 任务引擎** — 队列化 AI 任务执行 + 重试机制
4. **多 Provider** — OpenAI、DeepSeek、Mock 支持
5. **计费系统** — Wallet、Transactions、Plans、Subscriptions
6. **支付系统** — 支付创建、回调、退款
7. **Agent 引擎** — Agent、Workflow、Memory 管理
8. **知识库系统** — 文档管理、Chunk、Embedding
9. **美妆分析** — 人脸分析、报告生成、分享海报
10. **多租户** — Tenant、Domain 隔离
11. **OpenAPI 平台** — API Key 管理、Usage 追踪、Webhooks
12. **应用市场** — Marketplace Apps、Plugins、Templates
13. **监控系统** — AI Calls、System Logs、Performance
14. **Feature Flags** — 特性开关

---

## 16. In-Progress / Stub Features 🚧

1. **Admin 页面** — 大部分仅有占位文本（users, models, tasks, queue 等）
2. **Marketplace 管理** — API 存在但前端页面为空
3. **Security 管理** — API 和页面均为占位
4. **Account Page** — 通过 `@ts-ignore` 导入，可能存在编译问题
5. **Monitor Page** — 占位状态
6. **Platform 页面** — 存在但未使用
7. **Queue Worker** — subscription_renewal.ts 单文件，队列消费者需完善

---

## 17. Deprecated / Dead Code 🗑️

| 路径 | 说明 | 判断依据 |
|------|------|----------|
| `admin/` (16 files) | 旧版 Admin 组件 | 仅有 routes.tsx 和 types.ts 被引用，其余为孤立文件 |
| `apps/` | 空目录 | 无任何内容 |
| `packages/database/` | 空包 | 无源代码文件 |
| `packages/shared-utils/` | 空包 | 无源代码文件 |
| `shared/services/billing_service.ts` | 重复文件 | 与 billing.service.ts 完全相同 |
| `shared/services/billing_errors.ts` | 重复文件 | 与 billing.errors.ts 完全相同 |
| `shared/services/billing_types.ts` | 重复文件 | 与 billing.types.ts 完全相同 |
| `shared/services/billing_repository.ts` | 重复文件 | 与 billing.repository.ts 完全相同 |
| `shared/services/billing_middleware.ts` | 保留（有实际引用） | 比 middleware.ts 更完整 |
| `shared/services/ai_provider_adapters_openai.ts` | 应与 packages/ai-core 合并 | 功能已由 packages/ai-core/providers/openai-provider.ts 替代 |
| `shared/services/ai_provider_adapters_deepseek.ts` | 同上 | 功能已由 deepseek-provider.ts 替代 |
| `shared/services/ai_core.ts` | 与 packages/ai-core 重复 | 功能已被 packages/ai-core 替代 |
| `shared/services/ai_model_manager.ts` | 与 packages/ai-core 重复 | 功能已被 model-registry.ts 替代 |
| `functions/api/_tenant_middleware.ts.bak` | 备份文件 | 以 .bak 结尾 |
| `database/beauty_repository.js` | JS 源文件 | 同时存在 TS 版本 |
| 18 个 `.py` 构建脚本 | `_fix_*`, `build_*`, `do_fix*` | 一次性临时脚本 |

---

## 18. Duplicate Code Summary 🔁

### Billing 重复（8 对）
| 文件 A | 文件 B | 关系 |
|--------|--------|------|
| `billing.service.ts` | `billing_service.ts` | 完全重复 |
| `billing.errors.ts` | `billing_errors.ts` | 完全重复 |
| `billing.types.ts` | `billing_types.ts` | 完全重复 |
| `billing.repository.ts` | `billing_repository.ts` | 完全重复 |
| `billing.middleware.ts` | `billing_middleware.ts` | 部分差异（保留 underscore 版） |

### AI 服务重复（3 对）
| 旧文件 | 新位置 | 关系 |
|--------|--------|------|
| `shared/services/ai_provider_adapters_openai.ts` | `packages/ai-core/src/providers/openai-provider.ts` | 重复实现 |
| `shared/services/ai_core.ts` | `packages/ai-core/src/index.ts` | 重复实现 |
| `shared/services/ai_model_manager.ts` | `packages/ai-core/src/model-registry.ts` | 重复实现 |

---

## 19. TODO Items Found in Code

扫描到的 TODO 主要集中在：

1. **Billing 计算逻辑** — `shared/services/billing.service.ts:38` 注释 `pricing.credits represents number of credits per unit?`
2. **Error handling** — 多处 `// ignore cache failures`
3. **Queue migration** — 需要完成从 `ai_jobs` 到 `ai_tasks` + `packages/queue` 的迁移
4. **Admin stubs** — 至少 10 个 Admin 子页面只有占位 HTML

---

## 项目统计

| 指标 | 数量 |
|------|------|
| TypeScript 文件 | 349 |
| Markdown 文档 | 79 |
| SQL Migration | 48 |
| Test 文件 | 32 |
| 总代码行数 | ~25,000 行（估算） |
| 重复代码文件 | 8 个（可直接删除） |
| 废弃构建脚本 | 18 个（可删除） |
| 空包目录 | 2 个（可删除） |
| 已实现功能 | 14 |
| 未完成功能 | 7 |
