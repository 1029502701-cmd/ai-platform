# AI SaaS 平台架构迁移方案

> 任务编号：Task-Platform-001
> 状态：规划中（仅提交方案，未执行代码移动）
> 日期：2026-07-25

---

## 1. 当前结构分析

### 1.1 项目概览

`
AI体验馆/
+-- .env.example, package.json, tsconfig.json, vite.config.ts, wrangler.toml
|
+-- shared/                       【核心共享层 - 约57个文件】
|   +-- auth/                     认证授权：session, cookies, RBAC (7 files)
|   +-- config/                   通用配置：queue (1 file)
|   +-- plugins/                  插件注册 (1 file)
|   +-- services/                 业务服务层 (38 files)
|   |   +-- ai_core.ts            AI模型管理、provider适配
|   |   +-- ai_queue_*.ts         AI任务队列 (repo/service/worker)
|   |   +-- billing_*.ts          计费系统 (含重复实现)
|   |   +-- analytics.*           数据分析
|   |   +-- storage.ts            R2存储
|   |   +-- queue.ts              队列服务
|   |   +-- user.ts               用户服务
|   |   +-- permission.ts         权限管理
|   |   +-- prompt_manager.ts     Prompt管理
|   |   +-- knowledge_manager.ts  知识库
|   |   +-- feature.service.ts    特性管理
|   |   +-- subscription.service.ts 订阅
|   |   +-- plan.repository.ts    套餐仓库
|   |   +-- plugins/              Beauty等插件业务逻辑
|   +-- types/                    类型定义 (ai_queue.ts, beauty.types.ts)
|   +-- user/                     用户资料/设置 (4 files)
|
+-- src/                          【前端应用层 - 约30个文件】
|   +-- App.tsx, main.tsx         入口
|   +-- components/layout/        React布局组件 (Footer/Header/Layout/Sidebar)
|   +-- pages/                    页面路由
|   |   +-- admin/Dashboard.tsx   管理后台
|   |   +-- beauty/               Beauty业务页 (Home/Profile/ReportView/Share)
|   |   +-- Login, Register, Chat, Pricing, Index
|   +-- stores/AuthProvider.tsx   认证状态管理
|   +-- styles/                   全局样式
|   +-- billing/                  前端计费模块 (与shared有重复)
|   +-- analytics/                前端分析模块 (与shared有重复)
|
+-- tests/                        【测试 - 约24个文件】
|   +-- *.test.{js,ts}            混合格式根目录测试
|   +-- ai_core/                  AI核心测试
|   +-- e2e/                      E2E测试
|   +-- fixtures/                 测试资源
|   +-- _r2_emulator/             R2模拟器
|
+-- plugins/beauty/               插件系统
+-- .codex/                       Codex工程规范
+-- .wrangler/                    Wrangler本地状态
+-- *.log                         日志文件
`

### 1.2 技术栈

| 层 | 技术 |
|----|------|
| 运行时 | Cloudflare Workers (Wrangler) |
| 前端 | React 19 + Vite 6 + TypeScript 5.8 |
| 路由 | React Router 7.6 |
| CSS | TailwindCSS v4 |
| ORM | Drizzle ORM |
| DB | Cloudflare D1 (SQLite) |
| 存储 | Cloudflare R2 |
| AI | OpenAI API / DeepSeek / Mock Provider |
| CV | MediaPipe Tasks Vision |

### 1.3 关键发现

**问题1：Shared 层冗余**
- shared/services/billing_service.ts 与 billing.errors.ts 存在命名风格不一致的重复实现
- src/billing/ 与 shared/services/ 中的 billing 模块职责重叠
- src/analytics/ 与 shared/services/ 中的 analytics 模块重复

**问题2：AI Core 分散**
- AI 相关服务分散在 shared/services/ 中，共8+个文件无统一模块
- provider适配器、队列、服务层互相交织

**问题3：Auth 可复用但未打包**
- shared/auth/ 的 session/RBAC 应提取为独立包
- 当前以相对路径引用，没有模块化

**问题4：Queue 混合**
- AI队列(ai_queue_*.ts)与通用队列(queue.ts)混在shared/services
- 配置(shared/config/queue.ts)单独放置

**问题5：Database 缺失抽象层**
- 项目使用 Drizzle ORM + D1，但数据库schema/repository未提取
- 数据访问散落在各service文件中

**问题6：测试无组织**
- tests/ 根目录混合了.js和.ts格式
- E2E、单元测试、模拟器文件层级不清

### 1.4 文件统计

| 区域 | 文件数 | 类别 |
|------|--------|------|
| shared/ | ~57 | 认证、AI、计费、队列、存储、插件等 |
| src/ | ~30 | React组件、页面、样式、状态管理 |
| tests/ | ~24 | 单元、E2E、模拟器、资源文件 |
| 根目录配置 | ~18 | 配置文件、构建配置、环境变量 |

---

## 2. 目标结构

`
AI体验馆/
|
+-- apps/                           【应用程序】
|   +-- api/                        Cloudflare Worker API服务
|   |   +-- src/routes/             按模块划分的路由
|   |   +-- src/middleware/         中间件
|   |   +-- src/workers/            后台Worker
|   |   +-- wrangler.toml           API Worker配置
|   |
|   +-- worker/                     独立后台Worker
|   |   +-- src/queue-worker.ts     AI队列消费者
|   |
|   +-- web/                        前端应用（现有src/迁移至此）
|       +-- src/
|       +-- public/
|       +-- vite.config.ts
|       +-- package.json
|
+-- packages/                       【可复用包 - Workspace】
|   +-- ai-core/                    AI核心引擎
|   |   +-- src/providers/          OpenAI / DeepSeek / Mock
|   |   +-- src/model_manager.ts    模型注册与路由
|   |   +-- src/queue/              AI队列管理
|   |   +-- src/prompt_manager.ts   Prompt管理
|   |   +-- index.ts
|   |   +-- package.json
|   |
|   +-- auth/                       认证与授权
|   |   +-- src/session.ts          Session管理
|   |   +-- src/rbac.ts             RBAC权限
|   |   +-- src/cookies.ts          Cookie处理
|   |   +-- src/authorization.ts    授权逻辑
|   |   +-- index.ts
|   |   +-- package.json
|   |
|   +-- billing/                    计费系统
|   |   +-- src/service.ts          计费逻辑
|   |   +-- src/repository.ts       数据访问
|   |   +-- src/middleware.ts       计费中间件
|   |   +-- src/types.ts            类型定义
|   |   +-- index.ts
|   |   +-- package.json
|   |
|   +-- queue/                      通用队列
|   |   +-- src/core.ts             队列核心
|   |   +-- src/maintenance.ts      维护机制
|   |   +-- src/config.ts           配置
|   |   +-- index.ts
|   |   +-- package.json
|   |
|   +-- database/                   数据库访问层
|   |   +-- src/schema/             Drizzle Schema
|   |   +-- src/repositories/       数据仓库(user/storage/analytics等)
|   |   +-- index.ts
|   |   +-- package.json
|   |
|   +-- shared-utils/               通用工具
|       +-- src/storage.ts          R2存储封装
|       +-- src/analytics.ts        分析工具
|       +-- src/user/               用户资料/设置
|       +-- src/types.ts            公共类型
|       +-- src/plugins/            插件注册
|       +-- package.json
|
+-- admin/                          管理后台应用
|   +-- src/Dashboard.tsx           迁移自src/pages/admin/
|   +-- src/components/             管理组件
|   +-- src/index.tsx
|   +-- package.json
|
+-- workers/                        云Workers（独立部署单元）
|   +-- ai-queue-worker/            AI队列消费
|   +-- notification-worker/        通知推送
|   +-- analytics-worker/           数据采集
|
+-- docs/                           文档
|   +-- platform-architecture.md    本文件
|   +-- migration-guide.md          迁移指南
|   +-- api/                        API文档
|
+-- tests/                          保留原有测试结构
|   +-- unit/                       单元测试
|   +-- e2e/                        E2E测试
|   +-- ai-core/                    AI核心测试
|   +-- billing/                    计费测试
|   +-- fixtures/                   测试资源
|   +-- _r2_emulator/               R2模拟
|
+-- plugins/beauty/                 插件系统（保持不变）
+-- .codex/                         Codex工程规范（保持不变）
+-- .env.example                    环境变量模板
+-- .gitignore
+-- package.json                    Workspace根配置(monorepo)
+-- tsconfig.json                   根TS配置
+-- README.md
`

---

## 3. 迁移步骤

### Phase 1：创建 Monorepo 基础结构 【状态：目录已创建】

| 序号 | 步骤 | 涉及文件 | 风险 |
|------|------|---------|------|
| 1.1 | 创建apps/, packages/, admin/, workers/, docs/目录 | -- | 无 |
| 1.2 | 初始化各workspace包的package.json | 新文件 | 低 |
| 1.3 | 更新根package.json为monorepo workspace | package.json | 低 |

### Phase 2：迁移公共能力到 packages/

#### 2.1 packages/ai-core

| 源文件 | 目标路径 | 说明 |
|--------|---------|------|
| shared/services/ai_core.ts | packages/ai-core/src/ai_core.ts | 核心入口 |
| shared/services/ai_model_manager.ts | packages/ai-core/src/model_manager.ts | 模型管理 |
| shared/services/ai_provider_adapters_openai.ts | packages/ai-core/src/providers/openai.ts | OpenAI适配器 |
| shared/services/ai_provider_adapters_deepseek.ts | packages/ai-core/src/providers/deepseek.ts | DeepSeek适配器 |
| shared/services/ai_provider_adapters_mock.ts | packages/ai-core/src/providers/mock.ts | Mock适配器 |
| shared/services/ai_provider_provider.ts | packages/ai-core/src/providers/provider.ts | Provider基类 |
| shared/services/ai_provider_registry.ts | packages/ai-core/src/providers/registry.ts | 注册中心 |
| shared/services/ai_provider_types.ts | packages/ai-core/src/providers/types.ts | 类型定义 |
| shared/services/ai_service.ts | packages/ai-core/src/service.ts | AI服务 |
| shared/services/ai_queue_repository.ts | packages/ai-core/src/queue/repository.ts | 队列仓储 |
| shared/services/ai_queue_service.ts | packages/ai-core/src/queue/service.ts | 队列服务 |
| shared/services/ai_queue_worker.ts | packages/ai-core/src/queue/worker.ts | 队列Worker |
| shared/services/prompt_manager.ts | packages/ai-core/src/prompt_manager.ts | Prompt管理 |
| shared/types/ai_queue.ts | packages/ai-core/src/types/ai_queue.ts | 类型 |

#### 2.2 packages/auth

| 源文件 | 目标路径 | 说明 |
|--------|---------|------|
| shared/auth/authorization.ts | packages/auth/src/authorization.ts | 授权逻辑 |
| shared/auth/authorization_rbac.ts | packages/auth/src/rbac.ts | RBAC |
| shared/auth/authorization_rbac_types.ts | packages/auth/src/rbac_types.ts | RBAC类型 |
| shared/auth/cookies.ts | packages/auth/src/cookies.ts | Cookie处理 |
| shared/auth/session.ts | packages/auth/src/session.ts | Session管理 |
| shared/auth/types.ts | packages/auth/src/types.ts | 类型 |
| shared/auth/usage.ts | packages/auth/src/usage.ts | 用量统计 |
| shared/services/auth.ts | packages/auth/src/auth_service.ts | Auth服务 |
| shared/services/permission.ts | packages/auth/src/permission.ts | 权限 |

#### 2.3 packages/billing

| 源文件 | 目标路径 | 说明 |
|--------|---------|------|
| shared/services/billing.service.ts | packages/billing/src/service.ts | 计费主服务 |
| shared/services/billing.repository.ts | packages/billing/src/repository.ts | 仓储 |
| shared/services/billing.middleware.ts | packages/billing/src/middleware.ts | 中间件 |
| shared/services/billing.types.ts | packages/billing/src/types.ts | 类型 |
| shared/services/billing.errors.ts | packages/billing/src/errors.ts | 错误定义 |
| shared/services/plan.repository.ts | packages/billing/src/plan_repo.ts | 套餐 |
| shared/services/subscription.service.ts | packages/billing/src/subscription.ts | 订阅 |
| src/billing/*.ts (7files) | packages/billing/src/client.ts | 客户端侧合并 |

#### 2.4 packages/queue

| 源文件 | 目标路径 | 说明 |
|--------|---------|------|
| shared/services/queue.ts | packages/queue/src/core.ts | 队列核心 |
| shared/services/queue_maintenance.ts | packages/queue/src/maintenance.ts | 维护 |
| shared/config/queue.ts | packages/queue/src/config.ts | 配置 |

#### 2.5 packages/database

| 源文件 | 目标路径 | 说明 |
|--------|---------|------|
| shared/services/user.ts | packages/database/src/repos/user_repo.ts | 用户仓库 |
| shared/services/storage.ts | packages/database/src/repos/storage_repo.ts | 存储仓库 |
| shared/services/knowledge_manager.ts | packages/database/src/repos/knowledge_repo.ts | 知识仓库 |
| new | packages/database/src/schema/ | Drizzle Schema定义 |

#### 2.6 packages/shared-utils

| 源文件 | 目标路径 | 说明 |
|--------|---------|------|
| shared/plugins/index.ts | packages/shared-utils/src/plugins.ts | 插件注册 |
| shared/user/profile.ts | packages/shared-utils/src/user/profile.ts | 用户档案 |
| shared/user/settings.ts | packages/shared-utils/src/user/settings.ts | 设置 |
| shared/user/settings_cache.ts | packages/shared-utils/src/user/settings_cache.ts | 缓存 |
| shared/user/types.ts | packages/shared-utils/src/user/types.ts | 类型 |
| shared/services/analytics.* | packages/shared-utils/src/analytics.ts | 分析工具 |
| 其他跨包共享类型 | packages/shared-utils/src/types/ | 公共类型 |

### Phase 3：迁移 Frontend

| 序号 | 步骤 | 说明 |
|------|------|------|
| 3.1 | src/ -> apps/web/src/ | 整个前端应用整体迁移 |
| 3.2 | 更新 import 路径 | ../shared/* -> @ai-saas/auth 等workspace引用 |
| 3.3 | 更新 vite.config.ts | 路径别名重新映射 |
| 3.4 | 迁移 plugins/beauty/ 到 apps/web | 保持功能不变 |

### Phase 4：迁移 Admin

| 序号 | 步骤 | 说明 |
|------|------|------|
| 4.1 | src/pages/admin/Dashboard.tsx -> admin/src/ | 管理页迁移 |
| 4.2 | 补充 Admin 基础框架 | Vite + React 最小可用配置 |
| 4.3 | 共享 Layout 组件 | 复用 apps/web/components/layout/ |

### Phase 5：迁移 Workers

| 序号 | 步骤 | 说明 |
|------|------|------|
| 5.1 | AI Queue Worker -> workers/ai-queue-worker/ | 提取worker逻辑 |
| 5.2 | Analytics Worker -> workers/analytics-worker/ | 采集worker |
| 5.3 | 补充通知 Worker 骨架 | 预留接口 |

### Phase 6：整理测试

| 序号 | 步骤 | 说明 |
|------|------|------|
| 6.1 | tests/ 按包分类 | ai-core/, billing/, auth/, etc. |
| 6.2 | 统一文件格式 | .js -> .ts |
| 6.3 | 更新测试脚本 | package.json scripts.test |

---

## 4. 风险点

### 高风险

| 风险 | 描述 | 缓解措施 |
|------|------|---------|
| **Billing重复实现** | shared/services/billing_* 与 src/billing/ 存在两套不同风格的billing实现，需确定权威版本并进行差异对比 | 先做逐文件对比，合并最优实现 |
| **Import链路断裂** | 跨模块引用密集，手动修改import路径易出错 | 使用TypeScript编译检查逐包验证；每个Phase完成后run typecheck |
| **Worker/Web共享类型** | 部分类型同时被Worker和前端使用，迁移后可能两边断裂 | shared-utils统一导出类型，确保两边都能正确引用 |

### 中风险

| 风险 | 描述 | 缓解措施 |
|------|------|---------|
| **Drizzle D1 Schema** | 迁移涉及数据库schema文件化，需确保本地D1状态不丢失 | 从.wrangler/state/v3/d1/元数据中提取表结构 |
| **Vite路径别名** | 现有vite.config.ts中的路径别名(@/shared/*)需重新映射到workspace包 | 在根tsconfig.json配置workspace path mapping |
| **包间循环依赖** | ai-core可能依赖queue，queue又可能用到auth | 定义清晰的包依赖图谱，禁止循环引用 |

### 低风险

| 风险 | 描述 | 缓解措施 |
|------|------|---------|
| **测试失败** | 路径变更后测试可能找不到模块 | 每个Phase完成后运行npm test验证 |
| **Wrangler配置碎片化** | 多个worker需要wrangler.toml | 建立共享base配置+各worker继承扩展 |

---

## 5. 包依赖图谱

`
                 packages/database
                        |
            +-----------+-----------+
            v                       v
    packages/auth <-----> packages/shared-utils
            |                       ^
            v                       |
    packages/billing ---------------+
            |
            v
    packages/queue --------+
            |              |
            v              v
    packages/ai-core <-----+
            |
    +-------+-------+-------+
    v               v       v
 apps/api       apps/web   admin
`

**依赖规则：**
- database -> 无依赖（最底层）
- shared-utils -> database
- auth -> database, shared-utils
- billing -> auth, database
- queue -> database
- ai-core -> queue, auth
- apps/api, apps/web, admin -> 引用所有必要packages

---

## 6. 推荐迁移顺序

1. **Phase 1** -> 搭建 monorepo 基础（目录已创建，下一步）
2. **Phase 2a** -> 迁移 shared-utils + database（基础层，零风险）
3. **Phase 2b** -> 迁移 auth（依赖基础层，中等风险）
4. **Phase 2c** -> 迁移 billing（需解决重复实现问题）
5. **Phase 2d** -> 迁移 queue（依赖 database）
6. **Phase 2e** -> 迁移 ai-core（依赖 auth + queue，最高复杂度）
7. **Phase 3** -> 迁移 apps/web（前端整体搬迁，影响最大）
8. **Phase 4** -> 迁移 admin（管理后台独立）
9. **Phase 5** -> 迁移 workers（云端部署单元）
10. **Phase 6** -> 整理测试 + 最终验证

---

## 7. 后续行动计划

- [ ] 确认此架构方案
- [ ] 选择从哪个 Phase 开始迁移
- [ ] 对 billing 重复文件进行差异比对
- [ ] 执行代码迁移（需后续任务 Task-Platform-002+）

---

> **本文件为规划文档，未执行任何代码移动操作。**
> **所有现有文件保持原位。**
