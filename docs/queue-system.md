# Queue System 统一调度系统

> 任务编号：Task-Platform-006
> 状态：【已完成】核心包 + 迁移脚本 + 文档

---

## 1. 架构概览

`
                      ┌─────────────────────┐
                      │   apps/api routes    │
                      │   POST /api/queue     │
                      └──────────┬──────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  packages/queue          │
                    │  ┌────────────────────┐  │
                    │  │   QueueService     │  │  add/get/process/retry/cancel
                    │  └────────┬───────────┘  │
                    │           │              │
                    │  ┌────────▼───────────┐  │
                    │  │  QueueRepository   │  │  DB operations
                    │  │  (D1 ai_tasks)     │  │
                    │  └────────┬───────────┘  │
                    │           │              │
                    │  ┌────────▼───────────┐  │
                    │  │   QueueWorker      │  │  polling loop
                    │  │  + handler system  │  │
                    │  └────────┬───────────┘  │
                    └───────────┼──────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
       ┌────────────┐   ┌────────────┐   ┌────────────┐
       │ AI Core    │   │ Billing    │   │ Auth       │
       │ ai-core    │   │ billing    │   │ auth       │
       └────────────┘   └────────────┘   └────────────┘
`

---

## 2. 任务生命周期

`
┌──────────────────────────────────────────────────────────────┐
│                        完整生命周期                            │
│                                                              │
│   add()                                                     │
│    |                                                         │
│    v                                                         │
│  pending ─────┐                                               │
│    |          │ claimTask(worker)                               │
│    v          │                                                │
│  queued       │ (可选，pending可直接转running)                   │
│    |          │                                                │
│    v          │                                                │
│  running ◄────┼──────── markRetry (retry/backoff)              │
│    |          │                                                │
│    | ┌────────┴──────────────────────────┐                     │
│    v v                                     v                  │
│  success                              failed                   │
│                                          |                     │
│                                  retry_count < max_retry?     │
│                                    Yes        No               │
│                                    |          |                │
│                                    v          v                │
│                               retrying    (end)                │
│                                    |                           │
│                                    +---------------------------+ │
└──────────────────────────────────────────────────────────────┘
`

### 状态流转规则

| 转移 | 触发条件 | 约束 |
|------|---------|------|
| pending -> running | Worker claimTask | locked_by IS NULL |
| pending -> retrying | 重试调度器 | next_run_at <= now |
| running -> success | handler 返回成功 | 记录 result |
| running -> failed | handler 抛出异常 | 记录 last_error |
| failed -> retrying | retryCount < maxRetry | 指数退避计算 |
| failed -> end | retryCount >= maxRetry | 永久失败 |
| any -> cancelled | cancel() API | 不可逆 |

---

## 3. Worker 流程

### 3.1 启动

`	ypescript
import { QueueWorker } from '@ai-saas/queue';

const worker = new QueueWorker(env, {
  workerId: 'ai-worker-1',
  pollingIntervalMs: 2000,
});

// Register task handlers
worker.registerHandler('ai.generate', createAIHandler(env));
worker.registerHandler('beauty.analyze', beautyHandler);

await worker.start(); // 进入轮询循环
`

### 3.2 工作循环

`
While running:
  1. claimTask(workerId)
     ├── SELECT pending task by priority + FIFO
     ├── Optimistic lock (WHERE locked_by IS NULL)
     └── Return task if lock succeeded
  2. If no task → sleep(pollingIntervalMs)
  3. Execute task via registered handler
  4. Mark success/fail/retry
  5. Continue
`

### 3.3 并发控制

每个 Worker 最多同时执行 10 个任务（concurrentTasks counter）。

---

## 4. 重试策略

### 4.1 配置

`
retry.enabled = true
retry.maxAttempts = 3

backoff strategy: exponential with jitter
  attempt 1: base 10s + jitter ±10%
  attempt 2: base 30s + jitter ±10%
  attempt 3: base 5min + jitter ±10%

maxBackoff capped at 5 minutes
`

### 4.2 计算公式

`
delayMs = baseBackoff[attempt - 1] * (1 + jitter)
where jitter = random(-0.1, +0.1)
`

### 4.3 与现有代码对齐

现有 i_queue_worker.ts 使用相同策略：
- 第1次重试：10秒
- 第2次重试：30秒
- 第3次重试：5分钟

新包保持完全兼容。

---

## 5. 集成说明

### 5.1 接入 Auth（user_id 绑定）

`	ypescript
// queue.add 时传入 userId
await queue.add({
  type: 'ai.generate',
  payload: { prompt: 'Hello' },
  userId: session.user.id,  // ← 绑定用户
});
`

所有任务记录中都有 user_id 字段，支持按用户过滤和统计。

### 5.2 接入 Billing（执行前检查额度）

`	ypescript
// handler 中调用 billing.checkQuota()
const quota = await billing.checkQuota(userId);
if (!quota.allowed) throw new Error('QUOTA_EXCEEDED');
`

### 5.3 接入 AI Core

`	ypescript
import { createAIHandler } from '@ai-saas/queue';

const handler = createAIHandler(env);
worker.registerHandler('ai.generate', handler);
`

createAIHandler 内部自动调用 generateViaCore() 并映射结果。

---

## 6. 数据库变更

### 6.1 ai_results 表（新增）

`sql
CREATE TABLE IF NOT EXISTS ai_results (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES ai_tasks(id),
  user_id TEXT NOT NULL,
  service TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT '',
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  error_message TEXT,
  created_at TEXT NOT NULL
);
`

**用途：** 独立存储任务级别的详细产出记录，便于审计和计费分析。

### 6.2 ai_tasks 表字段对齐

| 字段 | 已有 | 说明 |
|------|------|------|
| id | ✓ | 任务ID |
| type | ✓ | 任务类型 |
| status | ✓ | 状态（含retrying扩展） |
| priority | ✓ | 优先级 |
| user_id | ✓ | 用户绑定 |
| payload | ✓ | JSON payload |
| result | ✓ | 成功结果 |
| retry_count | ✓ | 重试计数 |
| max_retry | ✓ | 最大重试 |
| locked_by | ✓ | 锁机制 |
| locked_at | ✓ | 锁时间 |
| next_run_at | ✓ | 下次执行时间 |
| next_retry_at | ✓ | 重试截止时间 |
| created_at/start/finish | ✓ | 时间戳 |
| last_error | ✓ | 错误信息 |

不需要修改现有表结构，仅新增 ai_results 表。

---

## 7. 与现有代码关系

`
现有代码（保留不动）:
├── shared/services/ai_queue_repository.ts  ← 保留
├── shared/services/ai_queue_service.ts     ← 保留
├── shared/services/ai_queue_worker.ts      ← 保留
├── shared/config/queue.ts                  ← 保留
├── shared/types/ai_queue.ts                ← 保留
├── tests/ai_core/run_tests.cjs             ← 保留不变

新包:
├── packages/queue/                         ← 全新
│   ├── core.ts     → QueueService(add/get/process/retry/cancel)
│   ├── repository.ts → 增强版仓库（claimTask, stale cleanup）
│   ├── worker.ts   → QueueWorker (handler系统)
│   ├── ai-handler.ts → AI Core 适配器
│   ├── types.ts    → 扩展类型
│   └── migrations.ts → ai_results DDL
`

---

## 8. 下一阶段建议

1. **Phase 2**: 在现有 Worker (ai_queue_worker.ts) 中渐进切换到新包
2. **Phase 3**: 实现 admin/tasks 页面的实时队列监控 WebSocket
3. **Phase 4**: 添加优先级队列（urgent/high/normal/low 路由分离）
4. **Phase 5**: 水平扩展 — 多 Worker 实例 + Durable Object 协调