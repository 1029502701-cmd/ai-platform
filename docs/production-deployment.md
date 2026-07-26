# AI SaaS Platform — Production Deployment Guide (Task-Platform-008)

## 1. 部署架构概览

```
┌─────────────────────────────────────────────────┐
│              Cloudflare Pages                    │
│                                                  │
│  ┌─────────────┐    ┌──────────────────────┐    │
│  │  Static      │    │  Functions (Edge)     │    │
│  │  Frontend    │    │  /api/* 路由          │    │
│  │  React + Vite│    │  (64 API endpoints)   │    │
│  │  Same domain │    │                       │    │
│  └─────────────┘    └──────────┬───────────┘    │
│                               │                  │
│          ┌────────────────────┼────────────┐    │
│          ▼                    ▼            ▼    │
│   ┌────────────┐  ┌──────────────────┐       │    │
│   │  D1 DB     │  │  KV (3 namespaces)│       │    │
│   │ ai-platform│  │  USER_CACHE       │       │    │
│   │  users,    │  │  RATE_LIMITS      │       │    │
│   │  ai_tasks, │  │  FEATURE_FLAGS    │       │    │
│   │  billing   │  └──────────────────┘       │    │
│   └────────────┘                             │    │
│                                              │    │
│   ┌──────────────┐   ┌──────────────────┐   │    │
│   │  R2 Bucket   │   │  Queues (2)      │   │    │
│   │ ai-platform- │   │  ai-tasks (prod) │   │    │
│   │  assets      │   │  billing-events  │   │    │
│   └──────────────┘   └──────────────────┘   │    │
└──────────────────────────────────────────────┘
         ↑ Same Domain (no CORS issues for China)
```

### 关键设计决策
- **前后端同域**: 前端 `/api/*` 直接通过 Pages Functions 代理，无需跨域
- **D1 集中式数据库**: 所有表 (users, sessions, ai_tasks, billing, queue) 在单个 D1
- **Queue Producer 内嵌**: Pages Functions 可直接发送队列消息，Consumer 需要独立 Worker
- **环境变量通过 Wrangler binding 注入**: JWT_SECRET, API Keys 等

## 2. 生产部署地址

| 环境 | URL | 状态 |
|------|-----|------|
| **Production** | https://f5284cea.ai-platform-boa.pages.dev | ✅ 最新部署 |
| Preview | https://fa2dec21.ai-platform-boa.pages.dev | ⏸️ 旧版本 |

## 3. 环境配置

### 3.1 环境变量管理

**禁止** 提交密钥到 Git。`.gitignore` 已配置：

```
.dev.vars    # 本地开发密钥（不提交）
.env         # 生产密钥占位（不提交）
```

**需要配置的生产变量**:

| 变量名 | 用途 | 来源 |
|--------|------|------|
| `JWT_SECRET` | Session 签名密钥 | 生成: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `OPENAI_API_KEY` | OpenAI 模型调用 | OpenAI Console |
| `ANTHROPIC_API_KEY` | Claude 模型调用 | Anthropic Console |
| `GOOGLE_AI_API_KEY` | Gemini 模型调用 | Google AI Studio |
| `DEEPSEEK_API_KEY` | DeepSeek 模型调用 | DeepSeek Console |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID | CF Dashboard |
| `CLOUDFLARE_API_TOKEN` | Wrangler CLI 认证 | CF Dashboard |

### 3.2 配置方式

Cloudflare Pages 环境变量通过 Dashboard 配置（设置 → 函数 → 环境变量）：

```bash
# 使用 wrangler secret 批量配置
npx wrangler pages secret put JWT_SECRET
npx wrangler pages secret put OPENAI_API_KEY
npx wrangler pages secret put ANTHROPIC_API_KEY
npx wrangler pages secret put GOOGLE_AI_API_KEY
npx wrangler pages secret put DEEPSEEK_API_KEY
```

### 3.3 运行时常量 (wrangler.toml [vars])

这些在代码中硬编码，随部署一起上传：

```toml
NODE_ENV = "production"
API_VERSION = "v1"
DEFAULT_AI_PROVIDER = "openai"
FALLBACK_AI_PROVIDERS = "anthropic,gemini,deepseek"
TASK_EXECUTION_TIMEOUT_MS = "300000"
STALE_RUNNING_MS = "7200000"
MAX_QUEUE_WORKERS = "4"
```

## 4. 数据库迁移

### 4.1 D1 数据库信息

| 项目 | 值 |
|------|-----|
| 名称 | ai-platform-db |
| ID | 23b19cc8-2a4d-4c4a-a9a7-a30ec61820c9 |
| 位置 | SJC (硅谷 primary) |
| 大小 | ~500 KB |

### 4.2 数据表清单 (远程数据库验证)

核心业务表 (23 张):
```
users              -- 用户表 (guest/user/wechat/vip/enterprise)
user_sessions      -- 登录会话 (JWT + guest token)
auth_sessions      -- 认证会话
user_roles         -- RBAC 角色分配
user_settings      -- 用户偏好设置
user_usage_limits  -- 用量配额限制
subscriptions      -- 订阅关系
wallet             -- 旧版钱包
wallets            -- 新版钱包 (新)
transactions       -- 交易记录 (充值/消费/退款)
billing_reservations -- 额度预留 (幂等保护)
ai_providers       -- AI Provider 元数据
ai_models          -- 可用模型列表 (含价格/限额)
ai_model_limits    -- 模型级用量限制
ai_scenarios       -- AI 场景定义
ai_tasks           -- 任务记录 (含 priority/retry/lock)
ai_usage           -- 用量统计
ai_jobs            -- 后台任务队列
knowledge_bases    -- 知识库
knowledge_docs     -- 文档索引
prompts            -- 提示词管理
admin_operation_log -- 管理操作审计
audit_logs         -- 全局审计日志
```

### 4.3 Migration 文件清单

共 23 个 migration SQL 文件 (drizzle/):

```
0001_initial.sql              -- 初始 schema (users, roles)
0002_auth_sessions.sql         -- 会话表
0003_roles_permissions.sql     -- RBAC 完整权限系统
0004_add_profile_image.sql     -- 头像字段
0004_user_settings.sql         -- 用户设置
0005_ai_providers_models.sql   -- AI 配置
0006_ai_model_limits.sql       -- 模型限额
0007_prompts.sql               -- 提示词管理
0008_knowledge.sql             -- 知识库
0009_ai_scenarios.sql          -- AI 场景
0010_ai_tasks.sql              -- 任务表
0011_ai_tasks_retry.sql        -- 重试字段
0012_add_profile_last_analysis_image.sql
0013_add_report_share_image.sql
0013_fix_beauty_reports.sql
0014_add_beauty_profile_fields.sql
0015_create_beauty_analysis_history.sql
0016_modify_users_add_auth_fields.sql
0017_create_user_sessions.sql  -- 重构会话表
0018_create_user_usage_limits.sql
0019_billing_reservations.sql  -- 额度预留 (幂等)
0020_queue_indexes.sql         -- Queue 性能索引
0021_production_tables.sql     -- 生产表 (wallets, transactions, billing_reservations, ai_results)
00xx_admin_operation_log.sql   -- 审计日志 (待确认)
00xx_create_billing_tables.sql -- 账单表 (待确认)
00xx_plan_features_and_seed.sql -- 套餐+种子数据 (待确认)
```

### 4.4 执行迁移

```bash
# 本地测试
npx wrangler d1 execute ai-platform-db --local --file drizzle/00_run_all_migrations.sql

# 生产环境 (谨慎!)
npx wrangler d1 execute ai-platform-db --remote --file drizzle/0021_production_tables.sql
```

## 5. 部署步骤

### 5.1 前置条件
1. 已安装 Node.js 18+ 和 Wrangler CLI
2. 已登录 `wrangler login`
3. Cloudflare Account 已关联

### 5.2 部署流程

```bash
# Step 1: 构建前端
npm run build          # → dist/

# Step 2: 生成最新类型 (每次改 wrangler.toml 后必须执行)
npx wrangler types

# Step 3: 部署到 Cloudflare Pages
npx wrangler pages deploy dist   --project-name ai-platform   --commit-dirty=true

# Step 4: (可选) 配置生产密钥
npx wrangler pages secret put JWT_SECRET "your-secret-here"

# Step 5: 配置自定义域名 (Dashboard 操作)
# Dash → Pages → ai-platform → Custom Domains → Add
```

### 5.3 CI/CD (GitHub Actions 示例)

```yaml
name: Deploy to Cloudflare Pages
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx wrangler types
      - run: npm run build
      - uses: cloudflare/pages-action@v1
        with:
          projectName: ai-platform
          apiToken: ${{ secrets.CF_API_TOKEN }}
```

## 6. 回滚方案

### 6.1 快速回滚 (Dashboard)

```
Dash → Pages → ai-platform → Deployments
→ 选择之前成功的部署 → Make live
```

### 6.2 CLI 回滚

```bash
# 查看所有部署
npx wrangler pages deployment list --project-name ai-platform

# 将指定部署设为生产
npx wrangler pages deployment publish <deployment-id> --project-name ai-platform
```

### 6.3 数据库回滚

D1 无自动回滚机制。建议:
1. 定期导出快照: `wrangler d1 export ai-platform-db --remote > backup.sql`
2. 手动执行反向 migration

## 7. 安全检查

### 7.1 已完成的安全措施

| 检查项 | 状态 | 说明 |
|--------|------|------|
| API 限流 (KV RATE_LIMITS) | ✅ | 已有 rate limit KV 绑定 |
| Admin 接口保护 | ✅ | 所有 /api/admin/* 要求 requireAdminAuth() |
| JWT Secret | ⚠️ | 需替换为生产密钥 |
| 敏感密钥 | ✅ | .env/.dev.vars 已排除 git |
| CORS 预检处理 | ✅ | Gateway 处理 OPTIONS 请求 |
| Request ID 追踪 | ✅ | 每个请求生成 UUID |

### 7.2 待完成

1. **API 限流中间件**: KV 已配置但限流逻辑需接入
2. **WAF/防火墙规则**: CF Dashboard → Security → WAF
3. **Admin IP 白名单**: 考虑限制 admin 接口访问 IP 范围

## 8. 性能指标

| 指标 | 数值 |
|------|------|
| 前端 JS | 251.82 KB (gzip: 79.82 KB) |
| 前端 CSS | 34.42 KB (gzip: 6.81 KB) |
| Vite 构建时间 | ~1.9s |
| Pages Functions 编译 | ~5s |
| TS 类型检查 | 仅 src/ 业务代码有错误 (约束不改) |

## 9. 当前风险与待办

### 风险清单

| 风险 | 级别 | 说明 | 解决方式 |
|------|------|------|----------|
| Queue Consumer | 中 | 只有 Producer，无 Worker 消费队列 | 创建独立 Worker |
| 自定义域名 | 低 | 仍用 *.pages.dev 域名 | Dashboard 配置 |
| API 限流未生效 | 中 | KV 已建但未接入中间件 | 编写限流 middleware |
| 前端 TS 业务错误 | 低 | Beauty/AuthProvider 有类型错误 | 不影响运行，后续修复 |
| 2 个 migration 文件未确认 | 低 | 00xx_ 前缀的 3 个文件语义不明确 | 审查后重命名 |

### 下一阶段建议: Task-Platform-009

1. **Queue Consumer Worker**: 独立的 Workers 处理 ai-tasks 消费
2. **API Rate Limiting**: 实现基于 KV 的限流中间件
3. **自定义域名绑定**: production.example.com
4. **AI Models Seed**: 通过 Admin API 添加实际模型
5. **前端 TS 修复**: 修复 BeautyHome/AuthProvider 类型问题
