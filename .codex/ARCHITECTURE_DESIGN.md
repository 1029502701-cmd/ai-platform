# AI SaaS 平台架构设计文档

## 1、整体系统架构图

```
┌───────────────────────────────────────────────────────────────────┐
│                        用户浏览器（Browser）                       │
│              React + Vite + TypeScript + Tailwind                  │
└──────────────────────────┬────────────────────────────────────────┘
                           │ 同域 HTTPS（单一自定义域名）
                           │ /api/* 全部同源
                           │ 无跨域、无 CORS Preflight
                           │ 不暴露 workers.dev
┌──────────────────────────▼─────────────────────────────────────────┐
│                   Cloudflare Pages（静态 + Functions）              │
│                                                                    │
│  ┌─────────────────────────┐   ┌───────────────────────────────┐  │
│  │     Static Frontend     │   │     Pages Functions (API)     │  │
│  │                         │   │                               │  │
│  │  AI 美妆 / 陪伴 / ...    │   │  /api/v1/auth/*               │  │
│  │  AI 图片 / 视频 / 聊天    │   │  /api/v1/user/*               │  │
│  │  创作者 / 联盟后台       │   │  /api/v1/ai/chat/*             │  │
│  │  Admin 管理后台          │   │  /api/v1/ai/generate/*         │  │
│  │                         │   │  /api/v1/billing/*             │  │
│  │                         │   │  /api/v1/admin/*               │  │
│  │                         │   │  /api/v1/affiliate/*           │  │
│  │                         │   │  /api/v1/analytics/*           │  │
│  │                         │   │  /webhooks/*                   │  │
│  └─────────────────────────┘   └───────────┬───────────────────┘  │
└────────────────────────────────────────────┼──────────────────────┘
                                             │
                                             │ 内部调用（零延迟，同一 Workers 运行时）
                                             │
┌────────────────────────────────────────────▼──────────────────────┐
│                        Service Layer（服务层）                     │
│                                                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐  │
│  │ Auth Service  │ │ User Service  │ │   Profile Service      │  │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐  │
│  │BillingService│ │ ConfigService │ │ Notification Service   │  │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐  │
│  │ Storage      │ │ Analytics    │ │   Admin Service         │  │
│  │  Service     │ │  Service     │ │                         │  │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘  │
│                                                                    │
│  ┌────────────────────────── AI 核心服务层 ──────────────────────┐ │
│  │                                                                │ │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐                │ │
│  │  │ AI Provider │ │ Prompt    │ │ Knowledge  │                │ │
│  │  │  Registry   │ │ Engine   │ │  Engine     │                │ │
│  │  └─────┬──────┘ └─────┬────┘ └─────┬───────┘                │ │
│  │        │              │             │                         │ │
│  │  ┌─────▼──────────────▼─────────────▼────────┐               │ │
│  │  │              Queue Service                │               │ │
│  │  │  (排队 / 取消 / 重试 / 超时 / 优先级 /流式) │               │ │
│  │  └──────────────────┬──────────────────────┘                │ │
│  │                     │                                        │ │
│  │  ┌──────────────────▼────────────────────────┐              │ │
│  │  │            Report Engine                  │              │ │
│  │  │  (模板 / 生成 / R2 存储 / 预签名下载)      │              │ │
│  │  └───────────────────────────────────────────┘              │ │
│  └──────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
                                             │
                                             │
┌────────────────────────────────────────────▼──────────────────────┐
│                    Cloudflare 存储层                               │
│                                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Cloudflare │  │  Cloudflare │  │  Cloudflare │              │
│  │     D1      │  │     KV      │  │     R2      │              │
│  │  (结构化数据) │  │ (缓存/会话/  │  │ (文件/     │              │
│  │              │  │  配置/限流)  │  │  二进制)    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└───────────────────────────────────────────────────────────────────┘
                                             │
                                             │ 全部服务端代理，前端不可见
┌────────────────────────────────────────────▼──────────────────────┐
│                    外部 AI 提供商                                  │
│  OpenAI │ Gemini │ Claude │ DeepSeek │ Qwen │ OpenRouter          │
│  （通过 AI Provider 抽象层统一接入）                                │
└───────────────────────────────────────────────────────────────────┘
```

---

## 2、目录结构

```
project-root/
├── .codex/                          # 开发组织与规范（已创建）
├── functions/                       # Pages Functions — API 层
│   ├── _middleware.ts               # 全局中间件（日志、requestId、CORS、错误处理）
│   ├── api/                         # 所有 API 路由分组
│   │   ├── _auth.ts                 # API 认证中间件
│   │   │
│   │   ├── auth/                    # 认证模块
│   │   │   ├── register.ts
│   │   │   ├── login.ts
│   │   │   ├── logout.ts
│   │   │   └── refresh.ts
│   │   │
│   │   ├── user/                    # 用户模块
│   │   │   ├── profile.ts           # GET/PUT /api/v1/user/profile
│   │   │   ├── settings.ts          # GET/PUT /api/v1/user/settings
│   │   │   └── avatar.ts            # PUT /api/v1/user/avatar
│   │   │
│   │   ├── ai/                      # AI 模块
│   │   │   ├── chat/                # 聊天
│   │   │   │   ├── index.ts         # POST /api/v1/ai/chat
│   │   │   │   └── [threadId].ts    # DELETE /api/v1/ai/chat/:threadId
│   │   │   │
│   │   │   ├── generate/            # 图片/视频/音频生成
│   │   │   │   ├── image.ts
│   │   │   │   └── video.ts
│   │   │   │
│   │   │   ├── queue/               # Queue 管理
│   │   │   │   ├── index.ts         # POST /api/v1/ai/queue
│   │   │   │   └── [jobId].ts       # GET /api/v1/ai/queue/:jobId
│   │   │   │
│   │   │   └── stream/              # SSE 流式响应
│   │   │       └── index.ts
│   │   │
│   │   ├── prompt/                  # Prompt 管理模块
│   │   │   ├── index.ts             # CRUD /api/v1/prompt
│   │   │   └── [id].ts              # /api/v1/prompt/:id
│   │   │
│   │   ├── knowledge/               # 知识库管理模块
│   │   │   ├── index.ts             # CRUD /api/v1/knowledge
│   │   │   ├── ingest.ts            # POST /api/v1/knowledge/ingest
│   │   │   └── search.ts            # GET /api/v1/knowledge/search
│   │   │
│   │   ├── report/                  # 报告模块
│   │   │   ├── index.ts             # CRUD /api/v1/report
│   │   │   └── [id]/download.ts     # 预签名 URL
│   │   │
│   │   ├── billing/                 # 支付/计费模块
│   │   │   ├── checkout.ts          # POST 创建订单
│   │   │   ├── subscription.ts      # GET/PUT 订阅管理
│   │   │   ├── invoice.ts           # GET 发票列表
│   │   │   └── webhooks/            # 支付回调
│   │   │       └── [provider].ts
│   │   │
│   │   ├── admin/                   # 管理后台模块
│   │   │   ├── dashboard.ts         # GET /api/v1/admin/dashboard
│   │   │   ├── users.ts             # CRUD 用户管理
│   │   │   ├── content.ts           # CRUD 内容审核
│   │   │   ├── config.ts            # GET/PUT 系统配置（读 KV）
│   │   │   ├── prompts.ts           # CRUD Prompt 管理
│   │   │   ├── knowledge.ts         # CRUD 知识库管理
│   │   │   └── analytics.ts         # GET 数据分析
│   │   │
│   │   ├── creator/                 # 创作者模块
│   │   │   ├── profile.ts
│   │   │   ├── content.ts
│   │   │   └── earnings.ts
│   │   │
│   │   ├── affiliate/               # 淘宝联盟模块
│   │   │   ├── link.ts              # 链接管理
│   │   │   ├── commission.ts        # 佣金查询
│   │   │   ├── payout.ts            # 提现申请
│   │   │   └── stats.ts             # 数据统计
│   │   │
│   │   ├── notification/            # 通知模块
│   │   │   ├── index.ts             # 消息列表/发送
│   │   │   └── settings.ts          # 通知偏好设置
│   │   │
│   │   ├── storage/                 # 存储模块
│   │   │   ├── presign.ts           # POST 获取预签名上传 URL
│   │   │   └── delete.ts            # POST 删除资产
│   │   │
│   │   ├── analytics/               # 数据分析模块
│   │   │   ├── events.ts            # POST 上报事件
│   │   │   └── queries.ts           # GET 聚合查询
│   │   │
│   │   └── config/                  # 配置中心模块
│   │       ├── index.ts             # GET/PUT 配置 CRUD
│   │       └── features.ts          # GET/PUT 功能开关
│   │
│   ├── webhooks/                    # Webhook 接收器
│   │   ├── payment.ts               # 支付回调
│   │   └── provider.ts              # AI 提供商回调（状态同步）
│   │
│   └── worker.ts                    # Durable Object / Queue Worker
│
├── src/                             # 前端源码
│   ├── components/                  # React 组件
│   │   ├── ui/                      # 基础 UI 组件库
│   │   ├── layout/                  # 布局组件
│   │   ├── common/                  # 通用业务组件
│   │   ├── ai-chat/                 # AI 聊天应用组件
│   │   ├── ai-beauty/               # AI 美妆应用组件
│   │   ├── ai-image/                # AI 图片应用组件
│   │   ├── ai-video/                # AI 视频应用组件
│   │   ├── ai-companion/            # AI 陪伴应用组件
│   │   ├── creator/                 # 创作者平台组件
│   │   ├── affiliate/               # 淘宝联盟组件
│   │   └── admin/                   # 管理后台组件
│   │
│   ├── pages/                       # 页面路由
│   │   ├── index.tsx                # 首页
│   │   ├── login.tsx
│   │   ├── chat.tsx
│   │   ├── beauty.tsx
│   │   ├── image.tsx
│   │   ├── video.tsx
│   │   ├── companion.tsx
│   │   ├── creator/
│   │   ├── affiliate/
│   │   ├── admin/
│   │   └── pricing.tsx
│   │
│   ├── services/                    # 服务层（API 客户端）
│   │   ├── api-client.ts            # 统一 API 客户端（含重试/超时/降级）
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── ai.service.ts
│   │   ├── prompt.service.ts
│   │   ├── knowledge.service.ts
│   │   ├── queue.service.ts
│   │   ├── report.service.ts
│   │   ├── billing.service.ts
│   │   ├── storage.service.ts
│   │   └── index.ts
│   │
│   ├── stores/                      # 状态管理
│   ├── hooks/                       # 自定义 Hooks
│   ├── types/                       # 类型定义
│   ├── utils/                       # 工具函数
│   ├── config/                      # 配置
│   └── assets/                      # 静态资源（中文字体本地打包）
│
├── shared/                          # 共享层（后端服务层 + 前端共用逻辑）
│   ├── services/                    # 后端 Service 实现
│   │   ├── auth.service.ts
│   │   ├── ai-provider.registry.ts  # AI 提供商注册表（多提供商切换）
│   │   ├── ai-provider.interface.ts # AI 提供商接口定义
│   │   ├── prompt.engine.ts         # Prompt 引擎
│   │   ├── knowledge.engine.ts      # 知识库引擎
│   │   ├── queue.service.ts         # Queue 队列服务
│   │   ├── report.engine.ts         # 报告引擎
│   │   └── ...（每个模块一个 service）
│   │
│   ├── models/                      # 数据模型/DTO
│   ├── validators/                  # 输入验证器
│   ├── errors/                      # 错误类
│   └── constants/                   # 共享常量
│
├── drizzle/                         # 数据库 Schema 和迁移
│   ├── schema/                      # 表定义
│   ├── migrations/                  # 迁移脚本
│   └── seeds/                       # 种子数据
│
├── tests/                           # 测试
├── docs/                            # 文档
├── public/                          # 公共静态文件
├── scripts/                         # 构建/运维脚本
├── wrangler.toml                    # Cloudflare 配置
├── vite.config.ts                   # Vite 配置
├── tsconfig.json                    # TypeScript 配置
├── package.json
└── README.md
```

---

## 3、模块职责

### 用户模块（User Module）
- **职责**: 用户信息、个人资料、头像、偏好设置、账号安全
- **API**: `/api/v1/user/profile`, `/api/v1/user/settings`
- **D1**: `users`, `profiles`, `user_settings`
- **KV**: 会话、登录态
- **R2**: 头像文件
- **负责人**: 后端工程师

### AI 模块（AI Module）
- **职责**: AI 能力调用入口：聊天、图片生成、视频生成、转录
- **API**: `/api/v1/ai/chat`, `/api/v1/ai/generate/*`, `/api/v1/ai/queue`
- **内部调用链**: Provider Registry → Prompt Engine → Knowledge Engine → Queue
- **D1**: conversations, messages, ai_jobs
- **负责人**: AI 工程师

### 支付模块（Billing Module）
- **职责**: 订阅计划、套餐管理、支付流程、发票、用量计费
- **API**: `/api/v1/billing/*`, `/webhooks/payment/*`
- **D1**: subscriptions, invoices, payment_records
- **负责人**: 后端工程师

### Prompt 模块（Prompt Module）
- **职责**: Prompt 模板的增删改查、版本管理、启用/停用、分类、变量
- **API**: `/api/v1/prompt/*`
- **Admin**: 管理后台 Prompt 管理页
- **D1**: prompts（version, status, category, variables JSON）
- **KV**: 高频 Prompt 缓存
- **负责人**: AI 工程师 + Prompt 工程师

### Knowledge 模块（Knowledge Module）
- **职责**: 知识库管理：文档入库、分块、嵌入、检索。与 Prompt 完全分离
- **API**: `/api/v1/knowledge/*`, `/api/v1/knowledge/search`
- **D1**: knowledge_bases, knowledge_chunks
- **R2**: 原始文档存储（PDF/DOCX/MD）
- **负责人**: 知识库工程师

### Queue 模块（Queue Module）
- **职责**: AI 任务异步队列：排队、取消、失败重试、超时、优先级、Streaming、费用统计
- **API**: `/api/v1/ai/queue/*`, `/api/v1/ai/stream`（SSE）
- **D1**: ai_jobs（status, priority, result_url, retries, cost, timeout_at）
- **KV**: 队列状态索引、分布式锁
- **Worker**: 专用 Queue Worker 消费 Durable Object 队列
- **负责人**: AI 工程师 + AI Queue 工程师

### Report 模块（Report Module）
- **职责**: 报告生成：模板渲染、格式输出（PDF/DOCX/MD/R2直传）、下载
- **API**: `/api/v1/report/*`
- **触发方式**: 可由 Queue 异步触发，也可同步即时生成
- **R2**: 生成的报告文件
- **负责人**: 报告引擎工程师

### Admin 模块（Admin Module）
- **职责**: 全平台管理后台：用户管理、内容审核、系统配置（KV读写）、Prompt管理、知识库管理、数据分析
- **API**: `/api/v1/admin/*`
- **权限**: 需 Admin Role
- **负责人**: 后端工程师 + 前端工程师

### Creator 模块（Creator Module）
- **职责**: 创作者档案、作品管理、收益查看、粉丝分析
- **API**: `/api/v1/creator/*`
- **复用**: 用户模块 + 计费模块 + 存储模块
- **负责人**: 后端工程师 + 前端工程师

### Affiliate 模块（Affiliate Module）
- **职责**: 淘宝联盟：推荐链接、佣金追踪、等级体系、提现管理、防欺诈
- **API**: `/api/v1/affiliate/*`
- **D1**: affiliate_links, affiliate_commissions, affiliate_payouts
- **负责人**: 淘宝联盟工程师

### Analytics 模块（Analytics Module）
- **职责**: 事件上报、聚合查询、漏斗转化、A/B 测试度量
- **API**: `/api/v1/analytics/events`（上报）, `/api/v1/analytics/queries`（查询）
- **D1**: analytics_events（分区索引）
- **负责人**: 数据分析工程师

### Notification 模块（Notification Module）
- **职责**: 站内消息、系统通知、任务完成通知
- **API**: `/api/v1/notification/*`
- **D1**: notifications
- **交付**: SSE 实时推送 + 轮询备选
- **负责人**: 后端工程师

### Storage 模块（Storage Module）
- **职责**: 文件上传/下载的抽象：预签名 URL 生成、资产删除、权限校验
- **API**: `/api/v1/storage/presign`, `/api/v1/storage/delete`
- **R2 Bucket**: user-uploads/, ai-generated/, system/, public/
- **负责人**: 后端工程师

### Config 模块（Config Module）
- **职责**: 全局配置中心：系统参数、功能开关、AI Provider 配置、费率配置
- **存储**: KV（快速读取），D1（审计历史）
- **Admin**: 全通过后台修改，不改代码
- **负责人**: 后端工程师 + DevOps 工程师

---

## 4、数据流

### 典型聊天请求

```
Browser ──(同域 fetch /api/v1/ai/chat)──→ Pages Function
    │
    ├─ 1. 认证中间件验证 Token
    ├─ 2. 限流检查（KV counter）
    ├─ 3. 加载 Prompt 模板（D1 + KV cache）
    ├─ 4. 搜索知识库上下文（Knowledge Engine → D1/KV）
    ├─ 5. AI Provider Registry → 选提供商
    ├─ 6. 调 AI API（OpenAI/Gemini/Qwen...）
    └─ 7. 返回统一响应 { success, data, error, meta }
```

### AI 生成任务数据流

```
Browser ──POST /api/v1/ai/queue──→ Pages Function → Queue Service
    │                                   │
    │ 收到 { jobId: "xxx", status: "queued" }
    ▼
[后台] Queue Worker 消费任务
    │ 1. 检查优先级队列取最高优先
    │ 2. 调对应 AI Provider
    │ 3. 结果存 R2 → 得 PreSigned URL
    │ 4. 更新 D1: status="completed"
    │ 5. 发通知 → D1.notifications
    ▼
Browser SSE 监听 /api/v1/ai/stream
    │ 收到 "completed" 事件 → 自动展示结果
```

---

## 5、调用关系（依赖矩阵）

```
API Routes (functions/)
    │
    ├──→ shared/services/           # 业务逻辑（不允许在 API 路由里写业务逻辑）
    │     │
    │     ├──→ D1 Database          # 持久化读写
    │     ├──→ KV Store            # 缓存/会话/配置/限流
    │     ├──→ R2 Storage          # 文件
    │     ├──→ AI Provider         # 外部 AI API（仅服务端可调）
    │     ├──→ Prompt Engine       # Prompt 模板
    │     ├──→ Knowledge Engine    # RAG 检索
    │     ├──→ Queue Service       # 异步队列
    │     ├──→ Config Service      # 配置读取
    │     └──→ Notification Svc    # 消息推送
    │
Frontend (src/)
    │
    ├──→ services/api-client.ts    # API 客户端
    │     └──→ /api/v1/*            # 同源调用（不允许直接调外部 AI）
    │
    └──→ shared/models/types       # 共用 TypeScript 类型
```

**核心规则：**

| 方向 | 允许 | 禁止 |
|------|------|------|
| API Routes → shared/services | ✅ | ❌ 路由里写业务逻辑 |
| shared/services → D1/KV/R2 | ✅ | ❌ 循环依赖 |
| Frontend → API Routes | ✅ (同源) | ❌ 前端直调外部 AI |
| shared/services → AI Provider | ✅ (服务端代理) | ❌ 前端调外部 AI |
| Admin → any module | ✅ (需 admin role) | ❌ 绕过认证 |

---

## 6、模块依赖图

```
                      API Routes
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         Auth Service   User Svc    Billing Svc
              │            │            │
              └────────────┼────────────┘
                           │
               ┌───────────┼───────────┐
               ▼           ▼           ▼
          Prompt E     Knowledge    Queue Svc
          Engine       Engine           │
                                 ┌──────┴──────┐
                                 ▼             ▼
                           Report Engine   Notification
                                    │         Svc
                                    ▼
                                  R2 Files

          所有模块 ←→ Storage Service ←→ R2
          所有模块 ←→ Config Service ←→ KV
          所有模块 ←→ Audit Logger   ←→ D1.audit_logs
```

---

## 7、未来扩展方案

### 阶段一：平台基础（当前设计阶段）
- 用户/认证、基础 AI（Chat + Image）、单 Provider（OpenAI）、简单 Queue、基础 Prompt、Stripe 计费

### 阶段二：多应用上线
- + Gemini/Claude/DeepSeek/Qwen、+ Video Generate、+ Knowledge Engine、+ Creator Platform、+ Report Engine

### 阶段三：运营与商业化
- + 支付宝/微信支付、+ Affiliate Platform、+ Advanced Analytics、+ Feature Flags 灰度发布

### 阶段四：生态开放
- + Open API（第三方开发者）、+ Plugin System、+ Agent Framework、+ Multi-region

---

## 8、架构风险分析

| 风险 | 级别 | 影响 | 缓解措施 |
|------|------|------|---------|
| D1 并发写入上限 | 🔴 高 | 高并发写入排队 | KV 做缓冲，批量落盘；使用 Batch API |
| AI 提供商国内不可达 | 🟡 中 | 功能不可用 | 全部服务端代理；支持 Qwen/DeepSeek 国内可用 |
| Cold Start 首请求慢 | 🟡 中 | 首次体验差 | Keep-Alive 预热；低优先级保活请求 |
| R2 大文件带宽限制 | 🟢 低 | 大文件传输慢 | 浏览器直传 R2（预签名 URL） |
| 单一域名 DNS 故障 | 🔴 高 | 全站不可用 | Cloudflare DNS 自带高可用 |
| AI Provider 宕机 | 🟡 中 | AI 功能不可用 | 降级链自动切换 |
| Prompt 配置出错 | 🟡 中 | 输出异常 | 版本控制 + 灰度发布 + A/B 测试 |
| Token 费用失控 | 🟡 中 | 运营成本上涨 | Queue 中加入 Token 预算管控 + 告警 |

---

## 9、为什么这样设计

### 一、Pages Functions 而非独立 Workers

- 与前端同域部署，天然解决国内网络兼容问题
- Git push 同时部署前端和 API，简化 DevOps
- 不存在 workers.dev 暴露给用户的风险
- 共享同一个 Zone，DNS/TLS/CDN 配置统一

### 二、前端不调用外部 AI API

- 直接前端调用必须暴露 API Key（严重安全风险）
- 国内网络直连 OpenAI/Anthropic 经常不通
- 服务端代理可统一：重试、超时、降级、Token 计费监控

### 三、D1 / KV / R2 各司其职

| 存储 | 用它的理由 | 不用别的的原因 |
|------|----------|--------------|
| **D1** | 关系型数据、事务、JOIN | KV 不支持 JOIN 和复杂查询 |
| **KV** | <1ms 读取、会话/配置/缓存 | D1 对简单键值有 overhead |
| **R2** | 大文件、二进制 | D1 不适合存 Blob |

### 四、AI Provider 注册表 + 接口抽象

- 新增提供商只需加 Adapter + 注册
- 业务代码完全不感知具体提供商
- 运行时动态切换（价格/可用性/偏好）
- 降级链自动实现

### 五、Queue 与 AI 处理分离

- AI 生成是长时间操作，不能占用 HTTP 请求时间
- 队列提供完整生命周期管理（排队/优先级/重试/取消/流式/费用）
- SSE 流式和异步推送两种交付模式都支持

### 六、Prompt 和 Knowledge 完全分离

- Prompt = "怎么说"（指令），Knowledge = "说什么"（知识）
- Prompt 变更频繁，Knowledge 变动低频
- Prompt 不需要向量检索，Knowledge 依赖语义搜索
- 管理员可能是不同角色，权限隔离更安全

### 七、Admin 用 KV 做配置中心

- KV 读取 <1ms，比 D1 快一个数量级
- 配置数据量小但读取极频繁（每个请求都要读 Feature Flags）
- 变更即时生效，无需重启
- D1 只存变更历史用于审计

### 八、整体设计面向中国大陆

- 同域：前端+API+静态资源同一域名，0 次跨域
- 单一 DNS：只解析一次自定义域名
- 单一 TLS：HTTP/2 多路复用
- 服务端代理：所有外部调用在服务端
- Cloudflare 上海/杭州 POP 服务国内用户
- 预签名 URL：大文件直传，不经过服务器
- 不暴露 workers.dev：对外只有自定义域名

---

> 本文档为纯架构设计，未编写任何业务代码、未生成任何页面、未实现任何接口。
> 等待下一步任务。
