# Billing + Queue 深度事务绑定设计文档

## 一、概述

将 Billing 与 Queue 系统深度集成，实现三阶段计费流程：**reserve → commit/refund**。通过冻结额度保证任务执行期间的余额安全，避免并发超额调用和任务失败后的积分争议。

## 二、核心概念

### 2.1 冻结余额（frozen_balance）

钱包新增字段：

  ALTER TABLE wallets ADD COLUMN frozen_credits INTEGER DEFAULT 0;

可用余额 = credits - frozen_credits

- credits — 总可用积分
- frozen_credits — 已被 pending reservation 冻结的积分
- real_available = credits - frozen_credits（真正的可消费余额）

### 2.2 预分配表（billing_reservations）

CREATE TABLE billing_reservations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  task_id TEXT,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  reserved_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id),
  INDEX idx_user_status (user_id, status)
);

状态机：

    reserve --> pending --commit--> committed (任务成功)
                      | refund --> refunded (任务失败)
                      | expire --> expired  (超时未处理)

### 2.3 幂等键

每个 reservation 有唯一的 idempotency_key，数据库 UNIQUE 约束确保同一 taskId 不会双重冻结。

## 三、完整流程

### 3.1 Reserve（冻结额度）— 任务创建时

  POST /api/ai/tasks/create
  -> Auth middleware: 获取 userId
  -> BillingService.reserve(userId, credits, { taskId, idempotencyKey })
  -> 检查幂等：是否存在 pending reservation？有且未过期 → 直接返回
  -> 计算可用余额：wallet.credits - wallet.frozen_credits
  -> 不足 → 返回 INSUFFICIENT_CREDITS
  -> 冻结：wallet.credits -= credits；wallet.frozen_credits += credits
  -> 写入 billing_reservations(status='pending')
  -> 创建 ai_tasks 记录（status='queued'）
  -> 返回 reservationId

代码位置：packages/billing/src/core.ts::reserve()

### 3.2 Commit（正式扣费）— Worker 执行成功后

  Queue Consumer 收到 ai_tasks[id]（status='running'）
  -> 调用 AI Core -> generateViaCore()
  -> AI Provider 返回结果
  -> 实际消耗计算：根据 token 数 x 定价规则
  -> BillingService.commit(reservationId, actualCost)
  -> 查找 reservation(status=pending)
  -> 结算逻辑：
     - actualCost <= reservedAmount: excessReturn = reserved - actual，返还到 credits
     - actualCost > reservedAmount: extra = actual - reserved，额外从 credits 扣除
  -> reservation 标记为 committed
  -> 记录 consume transaction
  -> 更新 ai_tasks(status='success')

### 3.3 Refund（退款解冻）— Worker 执行失败后

  Queue Consumer 捕获到异常或 timeout
  -> BillingService.refund(reservationId)
  -> 查找 reservation(status=pending 或 expired)
  -> 解冻：frozen_credits -= amount -> credits += amount
  -> reservation 标记为 refunded
  -> 记录 refund transaction
  -> 更新 ai_tasks(status='failed', retry_count++)
  -> RetryEngine 判断是否重试

### 3.4 Expired（过期释放）— 定时清理

  QueueScheduler 每 60s 运行一次
  -> SELECT * FROM billing_reservations WHERE status='pending' AND expires_at < NOW()
  -> FOR each expired: releaseFrozenBalance(), updateReservationStatus(expired)
  -> reclassify ai_tasks(stale running) -> pending

## 四、异常恢复机制

### 4.1 任务超时检测

QueueScheduler.cleanupStale() 定期运行：
  -> SELECT * FROM ai_tasks WHERE locked_at < NOW() - max_age AND status IN ('running', 'retrying')
  -> FOR each stale task:
     - 查找关联的 billing_reservations
     - 若 reservation.status='pending'，自动 refund
     - 释放 locked_by，重置任务为 pending
     - 更新 ai_tasks 状态

### 4.2 竞态保护

reservation status 是单一真实来源：
  - commit() 仅接受 status==='pending'
  - refund() 仅接受 status==='pending' 或 'expired'
  - committed/reserved 状态不可重复操作
  - 幂等检查防止双重扣费

## 五、队列集成流程总览

  用户请求
    -> [Auth Middleware] 验证 session，获取 userId
    -> [Billing.reserve()] 冻结 credits，创建 billing_reservations
    -> [Queue.add()] 创建 ai_tasks(status='queued'), priority 入队
    -> [QueueScheduler] 按优先级调度
    -> [QueueConsumer.poll()] 获取最高优先级任务，设置 locked_by
    -> [Queue.execute()] 查找注册的 handler
    -> [Handler] 调用 AI Core -> generateViaCore()
    -> [Provider] OpenAI / DeepSeek / Mock
    -> AI 返回成功
    -> [Billing.commit()] 实际扣费，释放冻结余额
    -> [ResultSaver.save()] 写入 ai_results 表
    -> ai_tasks(status='success')
    -> (失败分支) [Billing.refund()] 解冻回 credits
    -> [RetryEngine] 判断是否 backoff 重试
    -> ai_tasks(status='failed' 或 'retrying')

## 六、数据流对照表

| 阶段 | DB 操作 | 钱包变化 | Reservation | ai_tasks |
|------|---------|----------|-------------|----------|
| Reserve | INSERT reservation | frozen_credits += N | pending | queued |
| Commit | INSERT transaction | credits -= actual, frozen -= reserve | committed | success |
| Refund | INSERT transaction | frozen -= N, credits += N | refunded | failed |
| Expire | UPDATE reservation | frozen -= N, credits += N | expired | pending(retry) |

## 七、API 接口定义

### 7.1 Billing Service 新增方法（packages/billing/src/core.ts）

- reserve(userId: string, credits: number, opts?: ReserveOpts): Promise<ReserveResultType>
- commit(reservationId: string, actualCost: number): Promise<CommitResultType>
- refund(reservationId: string): Promise<RefundResultType>
- expireReservations(before?: Date): Promise<ExpiredReservationReport>

### 7.2 ReserveOpts

- taskId: string — 关联的 ai_tasks.id
- idempotencyKey: string — 幂等键，默认为 taskId

### 7.3 Repository 层新增方法（packages/billing/src/repository.ts）

- addFrozenBalance(userId, amount):冻结余额增加
- releaseFrozenBalance(userId, amount):冻结余额释放
- commitFromFrozen(userId, releaseAmount, actualCost):实际扣费结算
- createReservation(res):创建预分配记录
- getReservationByTaskId(taskId):通过任务ID查找预分配
- expirePendingReservations(before):过期预分配批量处理
- listUserReservations(userId, limit):用户历史预分配列表

## 八、幂等设计

1. **应用层**：所有 transaction/reservation 使用 UUID 作为 idempotency_key
2. **数据库层**：transactions.transaction_id UNIQUE, billing_reservations.idempotency_key UNIQUE
3. **重复请求处理**：
   - 相同 txId 调用 consume -> 返回已存在的 result
   - 相同 reservationId 调用 commit -> 返回 ALREADY_COMMITTED
   - 相同 reservationId 调用 refund -> 检查当前 status 拒绝操作

## 九、钱包类型更新

interface Wallet {
  id: WalletId;
  userId: string;
  credits: number;                // 可用积分/额度
  frozenCredits?: number;         // 冻结中积分（新增）
  totalUsed: number;
  totalToppedUp: number;
  mode: CreditType;
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

## 十、数据表汇总

### 10.1 已有表（复用）

| 表名 | 用途 | 来源 |
|------|------|------|
| wallets | 用户钱包余额 + frozen_credits | packages/billing |
| transactions | 消费/充值/退款记录 | packages/billing |
| ai_usage | AI调用用量追踪 | packages/billing |
| ai_tasks | 任务调度状态 | packages/queue |
| ai_results | 任务执行结果 | packages/queue |

### 10.2 新增表

| 表名 | 说明 | 迁移脚本来源 |
|------|------|-------------|
| billing_reservations | 额度冻结预分配记录 | packages/billing/src/migrations.ts |

## 十一、限制与注意事项

1. **不修改业务应用**：beauty / companion 等业务逻辑不变
2. **兼容模式**：direct/sync API 仍走 generateViaCore() + consume() 老路径
3. **迁移策略**：新功能优先用 Queue+Billing 三阶段流程，老代码保持不变
4. **监控告警**：pending reservation 超过 TTL 自动 refund，防止余额永久冻结
5. **不做支付集成**：仅完成计费基础能力，充值需后续对接微信支付
6. **Worker 数量**：建议初期 1-3 个 worker，根据队列深度动态扩展
