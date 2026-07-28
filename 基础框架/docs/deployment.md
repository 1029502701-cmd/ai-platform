# 部署指南 (Deployment Guide)

> 生成日期: 2026-07-27
> 适用环境: Cloudflare Pages + Workers

---

## 环境拓扑

```
┌─────────────────────────────────────┐
│           Cloudflare Pages          │
│                                     │
│  ┌───────────┐  ┌───────────────┐   │
│  │ Static    │  │ Functions     │   │
│  │ Assets    │  │ (API Routes)  │   │
│  │ (dist/)   │  │               │   │
│  └───────────┘  └───────┬───────┘   │
└────────────────────────┼────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │  D1      │   │   KV     │   │   R2     │
    │ (SQLite) │   │  (Cache) │   │(Storage) │
    └──────────┘   └──────────┘   └──────────┘
```

---

## 1. 开发环境

### 前置条件
- Node.js >= 22.0.0
- Wrangler CLI (`npm i -g wrangler`)
- Cloudflare 账号 + Team/Business/Enterprise 计划（D1 需要）

### 本地运行
```bash
# 1. 安装依赖
npm ci

# 2. 准备环境变量
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars 填入真实值

# 3. 初始化数据库（首次）
wrangler d1 execute ai-platform-db --local --file=drizzle/00_run_all_migrations.sql

# 4. 启动开发服务器
npm run dev
# → 前端: http://localhost:5173
# → API:   http://localhost:8788/api/...
```

### Wrangler 本地测试
```bash
wrangler pages dev dist --port 8788
```

---

## 2. 测试环境 (Staging)

### 创建测试数据库
```bash
wrangler d1 create ai-platform-db-staging
wrangler d1 execute ai-platform-db-staging --file=drizzle/00_run_all_migrations.sql
```

### 配置环境变量
在 Cloudflare Dashboard → Pages → ai-platform → Environment Variables:
```
NODE_ENV=staging
JWT_SECRET=<random-string>
DEFAULT_AI_PROVIDER=openai
FALLBACK_AI_PROVIDERS=anthropic,gemini,deepseek
TASK_EXECUTION_TIMEOUT_MS=300000
VITE_API_BASE=https://staging-api.your-domain.com
```

Secret Variables（Dashboard UI 设置，不暴露给代码）:
```
OPENAI_API_KEY=<key>
DEEPSEEK_API_KEY=<key>
WECHAT_APP_SECRET=<secret>
STRIPE_SECRET_KEY=<key>
ADMIN_API_KEY=<key>
```

### 绑定资源
通过 `wrangler.toml` 的 `[d1_databases]`、`[kv_namespaces]`、`[r2_buckets]` 指向 staging 环境的 resource ID。

---

## 3. 生产环境 (Production)

### 部署流程

```bash
# 1. 类型检查
npm run typecheck

# 2. 构建前端
npm run build

# 3. 部署到 Cloudflare Pages
wrangler pages deploy dist \
  --project-name=ai-platform \
  --branch=main

# 4. 验证健康检查
curl https://your-domain.com/api/health
curl https://your-domain.com/api/health/live
curl https://your-domain.com/api/health/ready
```

### 环境变量要求

#### [vars]（公共变量 — wrangler.toml）
| 变量 | 必选 | 说明 |
|------|------|------|
| NODE_ENV | ✅ | "production" |
| API_VERSION | ✅ | "v1" |
| DEFAULT_AI_PROVIDER | ✅ | 首选 AI 供应商 |
| FALLBACK_AI_PROVIDERS | ✅ | 备用供应商列表 |
| TASK_EXECUTION_TIMEOUT_MS | ✅ | 任务超时 (ms) |
| STALE_RUNNING_MS | ✅ | 旧实例存活时间 |
| MAX_QUEUE_WORKERS | ✅ | 队列消费者数量 |

#### Secret Variables（安全变量 — Dashboard 设置）
| 变量 | 必选 | 说明 |
|------|------|------|
| JWT_SECRET | ✅ | Session 签名密钥（32+ 字符） |
| OPENAI_API_KEY | ✅ | OpenAI API 密钥 |
| DEEPSEEK_API_KEY | ⚠️ | DeepSeek API 密钥（可选） |
| ANTHROPIC_API_KEY | ⚠️ | Anthropic API 密钥（可选） |
| GOOGLE_AI_API_KEY | ⚠️ | Google AI API 密钥（可选） |
| WECHAT_APP_SECRET | ✅ | 微信 OAuth 密钥 |
| STRIPE_SECRET_KEY | ⚠️ | Stripe 支付密钥（可选） |
| ADMIN_API_KEY | ✅ | 管理后台程序密钥 |

#### D1 Database
```toml
[[d1_databases]]
binding = "DB"
database_name = "ai-platform-db-prod"
database_id = "<prod-database-id>"
```

#### KV Namespaces
```toml
[[kv_namespaces]]
binding = "USER_CACHE"
id = "<user-cache-kv-id>"

[[kv_namespaces]]
binding = "RATE_LIMITS"
id = "<rate-limits-kv-id>"

[[kv_namespaces]]
binding = "FEATURE_FLAGS"
id = "<feature-flags-kv-id>"
```

#### R2 Bucket
```toml
[[r2_buckets]]
binding = "ASSETS_BUCKET"
bucket_name = "ai-platform-assets-prod"
```

---

## 4. 一键部署脚本

```bash
#!/bin/bash
set -euo pipefail

echo "🚀 Starting production deploy..."

echo "📋 Step 1: Type checking..."
npm run typecheck

echo "📦 Step 2: Building frontend..."
npm run build

echo "📝 Step 3: Running linter..."
npm run lint || echo "⚠️ Lint warnings found (non-blocking)"

echo "🔨 Step 4: Deploying to Cloudflare..."
wrangler pages deploy dist \
  --project-name=ai-platform \
  --branch=production \
  --comment="Deploy $GITHUB_SHA at $(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "✅ Deployment complete!"
echo "🔗 Checking health..."
sleep 5
curl -sf https://your-domain.com/api/health || echo "⚠️ Health check failed"
```

---

## 5. 回滚策略

| 方法 | 操作 |
|------|------|
| Pages Dashboard | 进入 Deployments → 点击 "Rollback" |
| Wrangler CLI | `wrangler pages deployment rollback <deployment-id>` |
| Git Branch | 重新触发对应分支的 CI pipeline |

---

## 6. Migration 执行

### 开发环境
```bash
wrangler d1 execute ai-platform-db --local --file=drizzle/00_run_all_migrations.sql
```

### 生产环境
```bash
# 预览模式（dry-run，检查是否有问题）
wrangler d1 execute ai-platform-db --command="SELECT name FROM sqlite_master WHERE type='table'"

# 执行实际 migration
wrangler d1 execute ai-platform-db --file=drizzle/00_run_all_migrations.sql
```

### 注意事项
- Migration 应在业务低峰期执行
- 先备份 D1 数据库：`wrangler d1 backups create ai-platform-db`
- 建议先用 staging 环境验证 migration

---

## 7. 监控与告警

部署后建议配置以下监控：

| 监控项 | 工具 | 阈值 |
|--------|------|------|
| API 错误率 | Cloudflare Analytics / Sentry | > 5% 触发告警 |
| AI 任务失败 | Queue 监控 | 连续失败 > 3 次 |
| D1 连接数 | D1 Dashboard | > 20 并发 |
| KV 命中率 | KV Dashboard | < 80% 需优化 |
| R2 存储量 | R2 Dashboard | > 90% 容量预警 |
| Cold Start | Cloudflare Metrics | P99 > 500ms |
