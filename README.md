# AI SaaS Platform v1.0

> 基于 Cloudflare 的全功能 AI SaaS 平台 — 面向中国大陆用户

## 🚀 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS |
| 后端 | Cloudflare Pages Functions (Workers) |
| 数据库 | Cloudflare D1 (SQLite) |
| 缓存/会话 | Cloudflare KV |
| 文件存储 | Cloudflare R2 |
| ORM | Drizzle ORM |
| 任务队列 | Cloudflare Queues |
| CI/CD | GitHub Actions |

## 📁 项目结构

```
├── functions/          # Cloudflare Pages Functions (API 路由)
│   └── api/            # 所有 API 端点
├── shared/             # 共享服务层（后端逻辑 + 类型定义）
│   ├── ai/             # AI Core
│   ├── agent/          # Agent Engine
│   ├── billing/        # 计费系统
│   ├── cache/          # 缓存层
│   ├── connectors/     # 第三方集成
│   ├── knowledge/      # RAG 知识库
│   ├── logger/         # 统一日志
│   └── notification/   # 通知服务
├── packages/           # 公共包（auth, queue, etc.）
├── src/                # React 前端
│   ├── components/     # 通用组件
│   ├── pages/          # 页面路由
│   ├── stores/         # 状态管理
│   └── lib/            # 客户端 SDK
├── admin/              # Admin 后台（独立模块）
├── drizzle/            # 数据库迁移脚本
├── tests/              # 测试
├── workers/            # Worker 调度逻辑
├── docs/               # 文档
├── scripts/            # 部署/构建辅助脚本
└── public/             # 静态资源
```

## 🔧 本地开发

### 前置要求

- Node.js 20+
- npm 或 pnpm
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)（可选，用于本地 Workers 模拟）

### 快速开始

```powershell
# 1. 安装依赖
npm install

# 2. 复制环境变量模板
Copy-Item .dev.vars.example .dev.vars
# 编辑 .dev.vars 填入实际 API Key

# 3. 启动开发服务器
npm run dev
```

> 💡 **国内用户提示**: `npm install` 可能较慢，可使用镜像源：
> ```powershell
> npm config set registry https://registry.npmmirror.com
> npm install
> ```

### 可用命令

```powershell
npm run dev          # 启动开发服务器
npm run build        # 生产构建
npm run typecheck    # TypeScript 类型检查
npm test             # 运行测试
npm run deploy       # 部署到 Cloudflare Pages
```

## ☁️ 部署

本项目配置了 **GitHub 自动部署**：

1. 推送到 `main` 分支 → 自动部署到 Staging
2. 触发 Workflow Dispatch 或满足条件后 → 自动部署到 Production

详细步骤见 [docs/production-deployment.md](docs/production-deployment.md)

## 🗄️ 数据库迁移

```powershell
# 查看迁移文件
ls drizzle/*.sql

# 在本地应用迁移
npx wrangler d1 execute ai-platform-db --local --file=drizzle/00_run_all_migrations.sql

# 在生产应用迁移
npx wrangler d1 execute ai-platform-db --remote --file=drizzle/00_run_all_migrations.sql
```

## 📦 环境变量

参考 `.env.example` 和 `.dev.vars.example`。关键配置：

| 变量 | 用途 |
|------|------|
| `OPENAI_API_KEY` | OpenAI Provider 密钥 |
| `ANTHROPIC_API_KEY` | Claude Provider 密钥 |
| `GEMINI_API_KEY` | Gemini Provider 密钥 |
| `JWT_SECRET` | JWT 签名密钥 |
| `WECHAT_APP_ID` | 微信开放平台 AppID |
| `WECHAT_APP_SECRET` | 微信开放平台 Secret |

**⚠️ 永远不要提交 `.env` 或 `.dev.vars` 到 Git！**

## 📄 文档

- [平台架构](docs/platform-architecture.md)
- [AI Core](docs/ai-core.md)
- [认证系统](docs/auth-system.md)
- [计费系统](docs/billing-system.md)
- [队列系统](docs/queue-system.md)
- [监控体系](docs/monitoring.md)
- [用户体系](docs/user-system.md)
- [AI Engine](docs/ai-engine.md)
- [知识引擎](docs/knowledge-engine.md)
- [Agent Engine](docs/agent-engine.md)
- [生产部署](docs/production-deployment.md)
- [DevOps 手册](docs/devops.md)
- [发布说明](docs/release-1.0.md)

## 📝 License

Internal use only.