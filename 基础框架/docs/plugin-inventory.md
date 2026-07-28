# Plugin Inventory

> Generated: 2026-07-27
> Status: Complete list of all plugins (active, planned, and stub)

---

## Active Plugins

### 1. Beauty (美妆分析)

| 属性 | 值 |
|------|-----|
| **ID** | `beauty` |
| **版本** | `0.1.0` |
| **路径** | `plugins/beauty/` |
| **状态** | 🟢 MVP — 已完成 |
| **描述** | AI 驱动的美颜/面部分析插件，支持照片上传、分析报告生成、分享海报 |

**依赖：**
- D1 Database（beauty_reports, beauty_profiles, beauty_analysis_history）
- R2 Storage（用户上传的图片、生成的海报）
- Cloudflare Workers AI / OpenAI API（面部分析）
- Billing（使用量扣费）

**API 路由：**
| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/apps/beauty/upload` | 上传图片 |
| POST | `/api/apps/beauty/analyze` | 触发分析任务 |
| GET | `/api/apps/beauty/get-report` | 获取分析报告 |
| GET | `/api/apps/beauty/history` | 分析历史 |
| GET | `/api/apps/beauty/profile` | 用户美颜档案 |
| POST | `/api/apps/beauty/share/poster` | 生成分享海报 |
| GET | `/api/apps/beauty/image` | 获取图片 |

**Admin API：**
| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/admin/beauty/dashboard` | 仪表盘统计 |
| GET | `/api/admin/beauty/users` | 用户列表 |
| GET | `/api/admin/beauty/reports` | 报告列表 |
| GET | `/api/admin/beauty/bloggers` | 博主管理 |
| GET/POST/PATCH | `/api/admin/beauty/products` | 产品管理 |
| GET | `/api/admin/beauty/ai-logs` | AI 调用日志 |

**数据库表：**
- `beauty_reports` — 分析报告
- `beauty_profiles` — 用户档案
- `beauty_analysis_history` — 分析历史
- `beauty_products` — 美妆产品
- `beauty_bloggers` — 美妆博主

**权限：**
- `storage:put` — 上传图片
- `storage:get` — 获取图片和报告
- `billing:usage` — 使用量扣费
- `queue:submit` — 提交分析任务

---

## Completed Packages (Plugin-equivalent)

### 2. Auth Package

| 属性 | 值 |
|------|-----|
| **包名** | `@ai-saas/auth` |
| **版本** | `0.1.0` |
| **路径** | `packages/auth/` |
| **状态** | 🟢 已完成 |

**功能：**
- Session 管理（创建、查询、撤销、刷新）
- WeChat OAuth 登录
- Guest 用户系统
- RBAC 角色权限
- 配额检查与消费

**导出模块：**
- `index.ts` — 统一入口
- `types.ts` — 类型定义
- `session.ts` — Session CRUD
- `rbac.ts` — 角色权限管理
- `cookies.ts` — Cookie 工具
- `guest.ts` — Guest 模式
- `wechat.ts` — 微信认证
- `middleware.ts` — 认证中间件
- `usage.ts` — 用量管理

**数据库表：**
- `users` — 用户主表
- `user_sessions` — Session 表
- `roles`, `permissions`, `role_permissions`, `user_roles` — RBAC 表
- `user_settings` — 用户设置
- `user_usage_limits` — 用量限制

---

### 3. Billing Package

| 属性 | 值 |
|------|-----|
| **包名** | `@ai-saas/billing` |
| **版本** | `0.1.0` |
| **路径** | `packages/billing/` |
| **状态** | 🟢 已完成 |

**核心 API：**
- `getBalance()` — 获取余额
- `consume()` — 消费积分（幂等）
- `refund()` — 退款
- `addBalance()` — 充值
- `checkQuota()` — 配额检查
- `reserve()` — 预冻结
- `commit()` — 结算
- `release()` — 释放冻结

**导出模块：**
- `core.ts` — 计费服务
- `repository.ts` — 数据访问层
- `middleware.ts` — 计费中间件
- `admin-migrations.ts` — Admin 迁移
- `errors.ts` — 错误类
- `migrations.ts` — DB 迁移

**数据库表：**
- `wallets` — 钱包
- `transactions` — 交易记录
- `billing_products` — 产品
- `user_subscriptions` — 订阅
- `billing_orders` — 订单
- `billing_transactions` — 计账交易
- `billing_rules` — 定价规则
- `billing_reservations` — 预冻结

---

### 4. Queue Package

| 属性 | 值 |
|------|-----|
| **包名** | `@ai-saas/queue` |
| **版本** | `0.1.0` |
| **路径** | `packages/queue/` |
| **状态** | 🟢 已完成 |

**核心组件：**
- Producer — 任务生产者
- Consumer — 任务消费者
- Worker — 工作节点
- Retry — 重试策略
- Lock — 分布式锁
- Scheduler — 定时调度
- ResultSaver — 结果持久化

**导出模块：**
- `core.ts`, `index.ts`, `types.ts`
- `producer.ts`, `consumer.ts`, `worker.ts`
- `retry.ts`, `lock.ts`, `scheduler.ts`
- `repository.ts`, `result-saver.ts`
- `priority.ts`, `task-executor.ts`, `ai-handler.ts`

**Queue 绑定：**
- `AI_TASK_QUEUE` — AI 任务队列
- `BILLING_QUEUE` — 计费事件队列

---

### 5. AI Core Package

| 属性 | 值 |
|------|-----|
| **包名** | `@ai-saas/ai-core` |
| **版本** | `0.1.0` |
| **路径** | `packages/ai-core/` |
| **状态** | 🟢 已完成 |

**核心模块：**
- Provider Router — 模型路由
- Model Registry — 模型注册
- Providers — OpenAI, DeepSeek, Mock
- Queue Integration — 队列集成
- Scenarios — AI 场景

**导出模块：**
- `index.ts` — 统一入口
- `provider-router.ts` — 路由
- `model-registry.ts` — 注册表
- `providers/index.ts` — Provider 集合
- `scenarios/index.ts` — 场景
- `types/index.ts`, `types/queue.ts`, `types/requests.ts` — 类型

---

## Future / Planned Plugins

### 6. Marketplace Plugin（市场插件框架）

| 属性 | 值 |
|------|-----|
| **路径** | `functions/api/marketplace/` |
| **状态** | 🟡 API 存在，框架未实现 |
| **数据库** | `marketplace_apps`, `plugins`, `plugin_versions`, `templates` |

**需完成：**
- 插件注册机制
- 插件版本管理
- 插件市场前端
- 支付与分成

---

### 7. Knowledge Plugin（知识库插件）

| 属性 | 值 |
|------|-----|
| **路径** | `functions/api/knowledge/` |
| **状态** | 🟡 API 实现中 |
| **数据库** | `knowledge_bases`, `knowledge_documents`, `knowledge_chunks`, `knowledge_embeddings` |

**需完成：**
- Embedding 服务集成
- 向量搜索优化
- 文档解析器

---

## Plugin Permissions Matrix

| 插件 | storage:put | storage:get | billing:usage | queue:submit | db:read | db:write |
|------|:-----------:|:-----------:|:-------------:|:------------:|:-------:|:--------:|
| Beauty | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Auth | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Billing | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Queue | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| AI Core | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Marketplace | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Knowledge | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |

---

## Plugin Manifest Format

```json
{
  "id": "string",
  "name": "string",
  "version": "semver",
  "description": "string",
  "routes": ["array of API path patterns"],
  "permissions": ["array of permission strings"]
}
```

**当前唯一 Manifest：** `plugins/beauty/manifest.json`
