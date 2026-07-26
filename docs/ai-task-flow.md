# AI 任务执行链路 — 完整文档

## 1. 请求流程（同步路径）

`
用户浏览器 POST /api/ai/generate (或 /api/ai/chat)
    │
    ├─ Cookie/Authorization header
    │
    ▼
functions/api/ai/generate.ts  ──[Auth]── getSession() → userId
    │
    │  generateViaCore(env, { aiRequest, userId })
    │
    ▼
shared/services/ai_core.ts  [AI Core — 唯一入口]
    ├── ensureRegistry()           ← 加载 provider 注册表
    ├── checkAndConsumeLimit()     ← Auth: 免费额度检查 (guest每日3次)
    ├── BillingMiddleware.before() ← Billing: 预扣费
    ├── generateTextWithPipeline()  ← AI Core pipeline
    │   ├── renderPrompt()          ← Prompt管理
    │   ├── assembleContext()       ← 知识库检索
    │   ├── generateText()          ← Provider Router
    │   │   └── OpenAIProvider.generateText()  (or DeepSeek/Mock)
    │   └── Provider              ← 实际HTTP调用 openai.com / deepseek.com
    ├── BillingMiddleware.after()  ← Billing: 精确结算
    │
    ▼
Response { ok, data/error }
`

**核心规则：**
- 所有AI调用必须经过 generateViaCore()
- 业务代码禁止直接调用 Provider API
- Billing middleware 在 AI Core 内部自动执行

---

## 2. Worker流程（异步队列路径）

`
用户 POST /api/ai/tasks/create
    │
    ├─ getSession(session_user cookie) → userId
    │
    ▼
functions/api/ai/tasks/create.ts
    │
    │  submitTask({ type, payload, created_by: userId })
    │
    ▼
shared/services/ai_queue_service.ts → submitTask()
    │  写入 ai_tasks 表: status='pending'
    │
    ▼
return { taskId, status: 'pending' }
    │
    ▼
Worker Loop (AIQueueWorker.start())
    │
    ├── poll: fetchNextForWorker(workerId)
    │   └── lockNextPending() → optimistic lock
    │
    ├── handleTask(task)
    │   ├── task.type === 'beauty.analyze' ?
    │   │   ├─ YES → beauty_analyze() → persist → markSuccess(result)
    │   │   └─ NO  → fallback → generateViaCore() → markSuccess/markFailed
    │   │
    │   ├── markSuccess(taskId, result)
    │   │   └── INSERT INTO ai_results(...)? ← new
    │   │
    │   └── onTaskFailure(task, error)
    │       ├── retryCount >= maxRetry ?
    │       │   ├─ YES → markFailed(permanent)
    │       │   └─ NO  → backoff(10s/30s/5min) → schedule retry
    │       │
    │
    ▼
loop continues...
`

**新的 @ai-saas/queue Worker 替代方案：**
`
queue.consumer.registerHandler('ai.generate', createAIHandler(env))
queue.consumer.runLoop('worker-1')
    ↓
poll() → claimTask(workerId) → execute(handler) → markSuccess/Failed
    ↓
executeAITask(task, env)
    ├── generateViaCore(env, coreReq)  ← 统一AI调用
    ├── ResultSaver.save(...)          ← 写入 ai_results
    └── return { success, data }
`

---

## 3. 状态变化图

`
                    add()
         pending ──────────────┐
              │                │
        claimTask(worker)      │ poll + scheduleAfter
              ▼                │
         queued                │ releaseScheduled()
              │                │
        markRunning()         │ when nextRunAt <= now
              │                │
              ▼                │
         running ◄─────────────┘
              │
        execute(handler)
              │
      ┌───────┴───────┐
      │               │
markSuccess()   markFailed(error, retryCount)
      │               │
      │        retryCount < maxRetry?
      │          Yes      No
      │          │        │
      │    markRetry()   (end) failed permanently
      │          │
      │    next_run_at set
      │          │
      │    scheduler.tick()
      │          │
      └──── pending ── loop continues
`

---

## 4. 错误处理

| 场景 | 处理方式 | HTTP 状态码 |
|------|---------|-------------|
| 未认证 | Session 不存在 → 返回 null | 401 UNAUTHORIZED |
| 额度不足 | checkAndConsumeLimit() 失败 | 500 DAILY_LIMIT_EXCEEDED |
| 余额不足 | BillingMiddleware.before() 抛 InsufficientCreditsError | 500 INSUFFICIENT_CREDITS |
| AI Provider 超时 | fetchWithTimeout 触发 AbortController | 500 |
| AI Provider 错误 | try-catch → onFailure() → refund | 500 |
| Worker 崩溃 | 超过 STALE_RUNNING_MS → 强制释放 | N/A |
| Task 重试耗尽 | retryCount >= maxRetry → permanent fail | N/A |

**退款策略：**
- AI Core 内 BillingMiddleware 的 onFailure() 会在生成失败时自动 refund 预扣积分
- 确保不重复计费

---

## 5. 兼容性说明

### Beauty / Companion / 其他未来应用

现有 i_queue_worker.handleTask() 使用硬编码分支：

`	ypescript
if (task.type === 'beauty.analyze') {
  // 处理美业逻辑
} else {
  // fallback: 调用 AI Core
  generateViaCore(env, { aiRequest: task.payload });
}
`

新包 @ai-saas/queue 提供 handler 注册系统：

`	ypescript
// 替代方案（渐进迁移）:
const consumer = queue.consumer;
consumer.registerHandler('beauty.analyze', beautyHandler);  // beauty 独立 handler
consumer.registerHandler('ai.generate', createAIHandler(env)); // AI 通用 handler
consumer.registerHandler('companion', companionHandler);      // companion handler
consumer.runLoop();
`

迁移不影响现有共享代码——shared/services/ai_queue_worker.ts 保持不变，新 Worker 通过 @ai-saas/queue 运行。

---

## 6. 当前完整AI执行链路

### 同步路径（实时调用）

`
Browser → /api/ai/generate POST
    → getSession(cookie) → userId
    → generateViaCore(env, request)
        ├── auth/usage.checkAndConsumeLimit()
        ├── billing.beforeAIRequest(userId, service, model)
        │   ├── calculateCost() → credits estimate
        │   ├── checkBalance() → ensure wallet exists
        │   └── consumeCredits(estCredits, txId)
        ├── AI pipeline:
        │   ├── AI request → Model Config → Provider Router
        │   └── Provider.generateText(prompt) → fetch() → external API
        ├── billing.afterAIResponse(actualInput, actualOutput)
        │   └── createUsageRecord(inputTokens, outputTokens, creditsUsed, costUsd)
        └── billing.onFailure(refund) if error
    → Response { ok, data, error }
`

### 异步路径（队列模式）

`
Browser → /api/ai/tasks/create POST
    → session_user cookie → userId
    → AIQueueService.submitTask(type, payload, userId)
    → INSERT INTO ai_tasks (status='pending')
    → return { taskId }

User polls /api/tasks/:id
    → GET /api/tasks/{taskId}
    → SELECT FROM ai_tasks WHERE id = taskId
    → RETURN { status, result, createdAt, finishedAt }

Worker polling loop (in background)
    → fetchNextForWorker(workerId) → claimTask() → optimistic lock
    → handleTask(task):
        ├── beauty.analyze → beauty service + persist
        ├── else → generateViaCore(env, task.payload)  ← same as sync!
    → markSuccess(taskId, result) OR markFailed(taskId, error)
        └── ResultSaver.save(taskId, userId, success, data, error)
    → onTaskFailure: retry with backoff or permanent fail
`

### 关键设计决策

1. **generateViaCore() 是唯一AI入口** — 无论是同步API还是异步worker都经过它
2. **Beauty 插件不走AI Core主线** — beauty.analyze 是独立处理路径，后续可改为 handler 注册
3. **Billing middleware 在 AI Core 内部** — 业务代码不直接接触 Billing
4. **Async tasks 复用同样的 generateViaCore** — 保证两次行为一致
5. **ai_results 作为审计层** — 每个任务产出独立记录，便于追溯和统计