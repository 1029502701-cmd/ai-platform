# Queue & Worker 迁移分析报告

## 一、全项目搜索结果

扫描关键词：queue | worker | ai_tasks | generateViaCore | retry | backoff
排除范围：node_modules/.wrangler/dist/packages/queue/docs/

### 涉及的源代码文件清单

| # | 文件路径 | 模块 | 说明 |
|---|---------|------|------|
| 1 | shared/services/ai_core.ts | AI Core | generateViaCore() - 统一入口，内部调用 ai_service |
| 2 | shared/services/ai_service.ts | AI Service | generateTextWithPipeline/generateChatWithPipeline |
| 3 | shared/services/ai_queue_repository.ts | Queue Repository | ai_tasks CRUD + lockNextPending + markRetry |
| 4 | shared/services/ai_queue_service.ts | Queue Service | submitTask/fetchNextForWorker/markSuccess |
| 5 | shared/services/ai_queue_worker.ts | Queue Worker | 核心worker循环 + beauty处理 + backoff重试 |
| 6 | shared/services/queue.ts | Queue Helper | enqueue()便捷函数 |
| 7 | shared/services/queue_maintenance.ts | Maintenance | cleanupStaleTasks + getHealth |
| 8 | shared/config/queue.ts | Config | QueueConfig (TIMEOUT/STALE/POLLING) |
| 9 | shared/types/ai_queue.ts | Types | AITask interface + TaskStatus |
| 10 | shared/services/plugins/beauty_ai_agent.ts | Beauty AI | analyzeFaceWithAI -> generateViaCore |
| 11 | functions/api/ai/generate.ts | API Route | POST /api/ai/generate -> generateViaCore |
| 12 | functions/api/ai/chat.ts | API Route | POST /api/ai/chat -> generateViaCore |
| 13 | functions/api/ai/tasks/create.ts | API Route | POST -> AIQueueService.submitTask |
| 14 | functions/api/ai/tasks/get.ts | API Route | GET task status |
| 15 | functions/api/admin/ai/tasks/index.ts | Admin API | 任务列表查询 |
| 16 | functions/api/admin/ai/tasks/stats.ts | Admin API | 任务统计 |
| 17 | functions/api/admin/ai/tasks/[id].ts | Admin API | 任务详情 |
| 18 | functions/api/admin/ai/tasks/health.ts | Admin API | 队列健康检查 |
| 19 | tests/ai_core/run_tests.cjs | Tests | 5个测试用例覆盖generateViaCore |
| 20 | packages/queue/src/*.ts | **新包** | Task-Platform-006已创建 |

---

## 二、当前任务执行链路

`
用户请求 (前端POST /api/ai/generate)
    │
    ├─ session cookie → getSession() → userId
    │
    ▼
functions/api/ai/generate.ts          [API Gateway]
    │
    │  直接调用 generateViaCore(env, request)
    │
    ▼
shared/services/ai_core.ts            [AI Core]
    ├── ensureRegistry()              ← 初始化provider
    ├── checkAndConsumeLimit()        ← 免费额度校验
    ├── BillingMiddleware.before()    ← 预扣费
    ├── AI调用: generateTextWithPipeline() / generateChatWithPipeline()
    │   └── provider.generateText()   ← OpenAI/DeepSeek/Mock
    ├── BillingMiddleware.after()     ← 精确结算
    │
    ▼
结果返回 { ok, data/error }

────────────────────────────────────────────

异步队列模式（另一种路径）:

用户请求 (前端POST /api/ai/tasks/create)
    │
    ▼
functions/api/ai/tasks/create.ts      [API Route]
    │
    │  submitTask({ type, payload, created_by })
    │
    ▼
shared/services/ai_queue_service.ts   [Queue Service]
    ├── AIQueueService.submitTask()   ← 写入 ai_tasks 表
    │
    ▼
functions/api/ai/chat.ts             [异步调用场景]
    │
    │  generateViaCore(env, { aiRequest, userId })
    │  (直接同步，不走队列)
    │
    ▼
Worker Loop (AIQueueWorker in backend)
    │
    ├── poll: fetchNextForWorker(workerId)
    │   └── lockNextPending() → optimistic lock
    │
    ├── handleTask(task)
    │   ├── task.type === 'beauty.analyze' → Beauty插件
    │   └── else → fallback: generateViaCore()
    │
    ├── markSuccess / markFailed / markRetry
    │
    └── onTaskFailure()
        ├── if retryCount >= maxRetry → permanent failed
        └── else → backoff delay (10s / 30s / 5min) + schedule retry
`

**关键发现：**
- 存在**两条路径**：同步直调(generate.ts/chat.ts) vs 异步队列(tasks/create.ts)
- 同步路径不经过 Queue Service，直接调用 AI Core
- 队列 Worker 是独立后台进程，不绑定 HTTP 请求
- beauty_ai_agent.ts 也直接走 generateViaCore，不走队列

---

## 三、各文件功能分析

### shared/services/ai_core.ts — AI调度中枢
- **状态**: 活跃，被 generate.ts/chat.ts/beauty_ai_agent 使用
- **可迁移**: 整体保留不动，作为业务层调用接口
- **注意**: 内含 billing middleware 和 usage limit 逻辑

### shared/services/ai_service.ts — Pipeline 层
- **状态**: 活跃，被 ai_core 调用
- **功能**: prompt渲染、知识检索、provider调用串联
- **可迁移**: 保留不动

### shared/services/ai_queue_repository.ts — 队列仓储
- **状态**: 活跃，被 ai_queue_service / queue_maintenance 使用
- **功能**: ai_tasks CRUD, lockNextPending(乐观锁), markRetry
- **可迁移**: ✅ 核心逻辑可直接迁移到 packages/queue/repository.ts

### shared/services/ai_queue_service.ts — 队列服务
- **状态**: 活跃，被 tasks/create.ts / admin routes 使用
- **功能**: submitTask, fetchNextForWorker, cancelTask
- **可迁移**: ✅ 可直接迁移到 packages/queue/core.ts

### shared/services/ai_queue_worker.ts — Worker 主循环
- **状态**: 活跃但无HTTP路由启动
- **功能**: 轮询claim → execute(美业/通用fallback) → success/fail/retry
- **亮点**: beauty分析内聚处理、回退到AI Core执行、指数退避
- **可迁移**: ⚠️ beauty部分依赖 shared/services/plugins/*，暂不迁移

### shared/services/queue.ts — 便捷函数
- **状态**: 被引用但不明确来源
- **功能**: 一行封装 enqueue()
- **可迁移**: ✅ 简单封装，可纳入新包

### shared/services/queue_maintenance.ts — 清理服务
- **状态**: 活跃，被 admin/ai/tasks/health.ts 引用
- **功能**: 清理stale pending/running任务
- **可迁移**: ✅ 核心逻辑已在新包 repository.ts 中实现

### shared/config/queue.ts — 配置常量
- **状态**: 活跃，被 ai_queue_worker 引用
- **功能**: MAX_QUEUE_WORKERS / TASK_EXECUTION_TIMEOUT_MS / STALE_*
- **可迁移**: 保留不动，新包通过默认值兼容

### shared/types/ai_queue.ts — 类型定义
- **状态**: 活跃
- **功能**: AITask interface + TaskStatus enum
- **可迁移**: ⚠️ 新增了 queued/retrying 状态，需兼容性合并

### functions/api/ai/tasks/create.ts — 任务创建API
- **状态**: 活跃
- **认证**: Cookie-based session_user (非标准)
- **功能**: 接收 taskType/payload 写入队列
- **可迁移**: ✅ 可接入新的 QueueService.add()

### functions/api/ai/tasks/get.ts — 任务查询API
- **状态**: 活跃
- **认证**: 仅允许创建者查看
- **功能**: 查询任务状态和结果
- **可迁移**: ✅ 可接入新的 QueueService.get()

---

## 四、当前架构 vs 目标架构对比

### 当前架构
`
┌─────────────────────────────────────────────────────────┐
│                     现有代码                             │
│                                                         │
│  API Routes                                            │
│    ├── /api/ai/generate → ai_core → ai_service         │
│    ├── /api/ai/chat → ai_core → ai_service             │
│    └── /api/ai/tasks/* → AIQueueService                │
│                                                         │
│  同步调用链:                                             │
│    Request → generate.ts → generateViaCore → Provider  │
│                                                         │
│  异步队列:                                              │
│    tasks/create → submitTask(ai_tasks)                  │
│                   ↓                                     │
│    AIQueueWorker.poll() → claim → execute → mark       │
│                   ↓                                     │
│    beauty plugin (内聚)  OR  fallback: generateViaCore  │
│                                                         │
│  Worker 没有 Handler 注册机制，只有固定的 beauty.analyze │
│  分支判断                                                │
│                                                         │
│  问题：                                                   │
│  1. 同步路径完全不经过队列                               │
│  2. Worker 硬编码了 beauty 逻辑                          │
│  3. 没有统一的 task handler 抽象                         │
│  4. retry/backoff 散落在 onTaskFailure() 内部           │
│  5. 两套task API路径(tasks/create vs generate直接调用)   │
└─────────────────────────────────────────────────────────┘
`

### 目标架构
`
┌─────────────────────────────────────────────────────────┐
│                    目标架构                              │
│                                                         │
│  @ai-saas/queue (packages/queue)                        │
│    ├── QueueService.add()     ← 统一任务创建入口          │
│    ├── QueueService.process() ← 带handler的执行          │
│    ├── QueueService.retry()   ← 统一重试                  │
│    ├── QueueWorker.handler system ← 可扩展处理器          │
│    └── QueueRepository.lockMechanism                  │
│                                                         │
│  统一调用链:                                             │
│    Request → QueueService.add() → ai_tasks(table)       │
│                            ↓                            │
│    QueueWorker.poll() → claimTask(handler) → result     │
│                            ↓                            │
│    markSuccess/markFailed → retry/backoff               │
│                                                         │
│  改进：                                                   │
│  1. 所有AI请求统一走队列                                  │
│  2. Handler注册系统替代硬编码分支                          │
│  3. retry/backoff 集中配置                                │
│  4. 与auth/billing整合                                     │
│  5. admin APIs统一访问同一数据源                           │
└─────────────────────────────────────────────────────────┘
`

---

## 五、推荐迁移方案

### Phase 1（已完成）— 创建 @ai-saas/queue 包
- ✅ packages/queue/src/ — 核心服务+仓库+worker+migrations
- ✅ types.ts 扩展了 queued/retrying 状态
- ✅ migrations.ts — ai_results DDL
- ✅ docs/queue-system.md — 完整文档

### Phase 2 — API 路由渐进切换
| 路由 | 操作 | 风险 |
|------|------|------|
| /api/ai/tasks/create | 改用 @ai-saas/queue.QueueService.add() | 低 |
| /api/ai/tasks/get | 改用 @ai-saas/queue.QueueService.get() | 低 |
| /api/ai/generate | **保持同步路径不变** | 无风险 |
| /api/ai/chat | **保持同步路径不变** | 无风险 |

**策略：** 先让异步任务API切换到新包，同步生成路径保持不变。

### Phase 3 — Handler 注册系统
在现有 ai_queue_worker.ts 的 handleTask() 基础上：
- 将 beauty.analyze 抽取为独立 Handler
- 通用 fallback 改为 default handler
- 未来新增 taskType 只需 registerHandler()

### Phase 4 — 重试/回退策略对齐
- 新包默认值与现有完全一致：10s / 30s / 5min
- QueueConfig 保持不变作为全局配置

### Phase 5 — Stale 任务清理
- queue_maintenance.ts → @ai-saas/queue core.cleanupStale*
- 复用已有的 admin/ai/tasks/health.ts 入口

### Phase 6 — 最终统一
- 同步路径 /api/ai/generate 可以可选改为先进入队列再异步处理
- 这需要前端适配（轮询任务状态 → 获取结果）

---

## 六、风险点

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| ai_tasks表结构差异 | 新包repository.ts假设了user_id字段，旧表可能用created_by | 双读兼容：新包和旧包读写同一张表 |
| Handler系统不兼容硬编码 | 现有worker处理beauty逻辑是硬编码的 | Phase 3渐进式：先提取为handler，不改worker循环 |
| 同步路径不经过队列 | generate.ts 完全跳过队列，无法统计 | 可在ai_core层埋点计数，不影响功能 |
| 新旧包并发写入 | 同时使用AIQueueService和QueueService写同一个表 | Phase 2切换是渐进的，API路由互斥 |
| 缺少任务类型枚举 | 新包的type是任意字符串 | 保持灵活，类型由业务决定 |