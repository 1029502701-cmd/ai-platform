# Queue Core 统一任务调度系统

## 架构概览

`
┌──────────────────────────────────────────────┐
│  @ai-saas/queue (packages/queue)              │
│                                              │
│  ┌──────────┐ ┌──────────┐ ┌───────────────┐ │
│  │ Producer │ │Consumer  │ │  Scheduler    │ │
│  │ add/enq  │ │ poll/evx │ │ delayed-tasks │ │
│  └────┬─────┘ └────┬─────┘ └───────┬───────┘ │
│       │            │               │          │
│  ┌────▼────────────▼───────────────▼───────┐  │
│  │         QueueRepository (D1 ai_tasks)   │  │
│  └────────────────┬────────────────────────┘  │
│                   │                            │
│  ┌────────────────▼────────────────────────┐  │
│  │   RetryEngine  LockEngine  PriorityQueue│  │
│  └─────────────────────────────────────────┘  │
└──────────────────┬───────────────────────────┘
                   │ depends on D1 ai_tasks table
`

所有6个子模块共享同一个 QueueRepository 操作同一张 i_tasks 表。

## Task生命周期

`
enqueue() --pending--> claimTask(worker) --running--> execute(handler)
                                                      ├── success → markSuccess()
                                                      └── failure
                                                             │
                                                          retryCount < maxRetry?
                                                           Yes      No
                                                            │        │
                                                         retrying  failed(end)
                                                           │
                                                     next_run_at set
                                                           │
                                                    scheduler.tick() promotes to pending
`

状态转换：
- pending -> running : Worker claimTask (乐观锁)
- running -> success : handler.execute 返回成功
- running -> failed  : handler.execute 抛异常
- failed -> retrying : RetryEngine.decideNextRetry + markRetry
- retrying -> pending: Scheduler tick promotes via nextRunAt <= now
- any -> cancelled   : cancel() API
- pending -> queued  : enqueue with scheduleAfter (延迟入队)

## Retry策略

默认配置：
- backoffBaseMs: 10000 (10秒)
- backoffFactor: 2 (指数增长)
- maxBackoffMs: 300000 (5分钟上限)
- jitter: true (+/-10%随机偏移)
- maxAttempts: 3次

计算公式: min(base * factor^(attempt-1), maxBackoff) +/- 10% jitter
- attempt 1: 10s +/-1s
- attempt 2: 20s +/-2s
- attempt 3: 40s +/-4s (被maxBackoff cap住)

与现有 ai_queue_worker.ts 的硬编码回退策略 (10s / 30s / 5min) 完全兼容。

## Lock机制

采用乐观锁 (Optimistic Locking) 模式：
1. find: SELECT id FROM ai_tasks WHERE locked_by IS NULL ... LIMIT 1
2. lock: UPDATE ai_tasks SET locked_by=?, locked_at=? WHERE id=? AND locked_by IS NULL
3. verify: 检查 affected rows > 0，否则让出给其他worker

防崩溃恢复：
- stale_pending: 超过STALE_PENDING_MS(24h)仍pending且locked_by非空 -> force reset
- stale_running: 超过STALE_RUNNING_MS(2h)仍running -> force release

优先级排序：
- urgent(4) > high(3) > normal(2) > low(1)
- FIFO within same priority level (ORDER BY created_at ASC)

## Queue调用方式

基本用法：

import { createQueueService } from '@ai-saas/queue';

const queue = createQueueService(db);

// Add task
await queue.add({ type: 'ai.generate', payload, userId, priority: 'high' });

// Get task detail
const task = await queue.get(taskId);

// Process (worker side)
queue.registerHandler('ai.generate', myHandler);
await queue.startWorker('worker-1');

// Retry failed task
await queue.retry(taskId, 10000); // delay 10s then retry

// Cancel
await queue.cancel(taskId);