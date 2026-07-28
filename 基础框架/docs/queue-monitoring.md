# Queue Monitoring & Observability

> 任务编号：Task-Platform-006-Step5
> 状态：【已完成】全链路稳定性测试 + 监控文档

---

## 1. 任务执行日志格式

### 标准日志结构

`json
{
  \"task_id\":    \"t_abc123\",
  \"user_id\":    \"u_xyz789\",
  \"scenario\":   \"beauty.analyze\",
  \"type\":       \"ai.task\",
  \"provider\":   \"openai\",
  \"model\":      \"deepseek-v3\",
  \"priority\":   \"high\",
  \"status\":     \"running|success|failed|retrying\",
  \"duration_ms\": 1234,
  \"credits\":    50,
  \"error\":      null,
  \"worker_id\":  \"worker-1\",
  \"timestamp\":  \"2026-07-25T08:30:00Z\"
}
`

### 日志级别

| Level | When | Example |
|-------|------|---------|
| INFO | Task created, claimed, completed | task status=pending -> running |
| WARN | Retry triggered, stale task detected | retry_count=2/3 |
| ERROR | Provider error, billing failure | provider returned 500 |
| FATAL | Worker crash detected, DB connection lost | locked_at > 10min |

---

## 2. Admin 后台监控接口

### GET /api/admin/tasks/stats

返回队列健康数据：

| 指标 | 说明 |
|------|------|
| total | ai_tasks 总记录数 |
| pending | 等待中的任务数 |
| running | 正在执行的任务数 |
| success | 成功完成的任务数 |
| failed | 失败的任务数 |
| retrying | 重试中的任务数 |
| cancelled | 已取消的任务数 |

### GET /api/admin/tasks?status=running&limit=50

查看当前正在执行的任务列表，包含：

- task_id, user_id, scenario, model, started_at, duration
- locked_by (worker ID)

### GET /api/admin/tasks?status=failed&limit=50

查看失败任务及错误日志：

- task_id, error (last_error field), retry_count
- user_id, created_at

---

## 3. 数据库索引建议

确保以下字段有索引以支持管理后台快速查询：

`sql
-- ai_tasks
CREATE INDEX idx_ai_tasks_user ON ai_tasks(user_id);
CREATE INDEX idx_ai_tasks_status ON ai_tasks(status);
CREATE INDEX idx_ai_tasks_priority ON ai_tasks(priority);
CREATE INDEX idx_ai_tasks_created ON ai_tasks(created_at);
CREATE INDEX idx_ai_tasks_locked ON ai_tasks(locked_by);

-- transactions
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_created ON transactions(created_at);

-- billing_reservations
CREATE INDEX idx_billing_res_user_status ON billing_reservations(user_id, status);
CREATE INDEX idx_billing_res_task ON billing_reservations(task_id);
CREATE INDEX idx_billing_res_expires ON billing_reservations(expires_at);
`

---

## 4. 告警规则建议

| 条件 | 级别 | 动作 |
|------|------|------|
| pending 队列 > 100 | WARNING | 通知运维 |
| pending 队列 > 500 | CRITICAL | 自动扩容 worker |
| running > 10min (stale) | WARNING | 释放锁，回退到 pending |
| failed rate > 10% (5min window) | CRITICAL | 暂停新任务提交 |
| billing 余额 < threshold | WARNING | 通知用户充值 |

---

## 5. 压测结果摘要

| 场景 | 并发量 | 通过 | 耗时 |
|------|--------|------|------|
| 任务创建（批量） | 50 rapid | PASS | < 1ms/task |
| 任务创建（超大） | 100 bulk | PASS | < 68ms total |
| 并发 Claim | 5 × 3 workers | PASS | 无重复锁定 |
| Billing reserve | single | PASS | 冻结正确 |
| Billing commit | single | PASS | 扣除正确 |
| Billing refund | single | PASS | 恢复正确 |
| Idempotency | duplicate key | PASS | 唯一约束生效 |
| Stale detection | 2hr stale lock | PASS | 正确回收 |
| Priority ordering | urgent/high/normal/low | PASS | 排序正确 |

---

## 6. 幂等性保证

所有计费操作必须使用 idempotency_key：

`
billing_reservations.idempotency_key — UNIQUE
transactions.transaction_id — UNIQUE
`

相同 key 的第二次请求会触发 SQL UNIQUE 约束冲突，被外层 catch 捕获后返回已有结果。

---

## 7. 异常恢复机制

| 异常类型 | 检测方式 | 恢复动作 |
|----------|----------|----------|
| Worker 崩溃 | scheduler 扫描 locked_at > N分钟 | 状态回退 pending，retry_count+1 |
| Provider 超时 | queue 内部 timeoutMs | 标记 failed 或 retrying |
| 余额不足 | billing.reserve() 前置检查 | 直接拒绝，状态=failed |
| 重复请求 | idempotency_key UNIQUE 约束 | 返回已有 reservation |
