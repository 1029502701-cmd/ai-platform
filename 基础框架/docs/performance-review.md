# 性能审查报告 (Performance Review)

> 生成日期: 2026-07-27
> 范围: API 链路 / 数据库查询 / 重复请求 / 大对象返回

---

## 1. AI 请求链路分析

### 调用路径
```
前端 → POST /api/ai/tasks/create
  → shared/services/ai_queue_service.ts
    → packages/queue (Producer)
      → Cloudflare Queue
        → Consumer Worker
          → packages/ai-core/provider-router
            → OpenAI/DeepSeek Provider
              → External API
```

### 瓶颈点

| 环节 | 当前行为 | 问题 | 建议 |
|------|----------|------|------|
| Provider 路由 | 每次请求动态 `import()` Provider 模块 | 增加 cold start 延迟 50-200ms | 启动时预加载所有 Provider |
| 模型配置读取 | 从内存 registry 读取 | ✅ 无问题 | — |
| DB 查询 | Provider 注册从 D1 读取 | 每次部署重新加载 | KV 缓存 + D1 源站 |
| 响应大小 | AI 文本直接返回 | 长回复可能 >10KB | 考虑流式输出 (SSE) |

### 优化建议
1. **Provider 预热** — 在 Worker 初始化时一次性 bootProviders()，而非懒加载
2. **流式响应** — `/api/ai/chat` 改为 Server-Sent Events 推送，提升首字延迟
3. **超时保护** — TASK_EXECUTION_TIMEOUT_MS=300s 合理，但需确保 Queue 消费者正确终止

---

## 2. 数据库查询分析

### 发现的潜在问题

#### Q1: `SELECT *` 查询（需具体化）
以下文件使用了 `SELECT id, ...` 或 `.all()`：
| 文件 | 行号 | 风险 |
|------|------|------|
| `functions/api/admin/users.ts` | 45,47 | 需确认是否全表扫描 |
| `functions/api/knowledge/index.ts` | 10 | `db.prepare(...).all()` |
| `functions/api/orders/list.ts` | 14 | `.all()` 未分页 |
| `functions/api/user/quota.ts` | 14 | `.bind(userId).all()` |
| `functions/api/user/usage.ts` | 14 | `.bind(userId).all()` |

**风险:** 某些查询可能在没有 LIMIT 的情况下返回大量数据。

**建议:** 为所有列表查询添加 `LIMIT` 和分页参数。

#### Q2: 缺失的复合索引
基于查询模式分析，以下索引推荐添加:

| 表 | 当前索引 | 推荐索引 | 理由 |
|----|----------|----------|------|
| `ai_tasks` | user_id PK | `(user_id, status)` | 查询用户任务列表 |
| `transactions` | user_id + txId | `(user_id, created_at DESC)` | 交易历史 |
| `messages` | id PK | `(conversation_id, created_at)` | 对话消息 |
| `beauty_analysis_history` | id PK | `(user_id, created_at DESC)` | 分析历史 |
| `agent_tasks` | id PK | `(agent_id, status)` | Agent 任务列表 |
| `billing_orders` | id PK | `(user_id, status)` | 订单查询 |

#### Q3: 重复查询模式
`functions/api/user/quota.ts` 和 `functions/api/user/usage.ts` 都查询同一表的相同字段，可合并。

---

## 3. 重复查询检测

### 已识别的重复查询

| API 端点 | 重复的查询 | 频率 |
|---------|-----------|------|
| `/api/user/quota` + `/api/user/usage` | 两者都查 user_usage_limits | 每页面加载 2 次 |
| `/api/billing/products/index` + `/api/payment/create/index` | 都查询 billing_products | 高频 |
| `/api/knowledge/index` + `/api/knowledge/search` | 都读 knowledge_bases | 中频 |

**建议:** 使用 KV cache 缓存产品列表和用户配额信息，TTL = 60s。

---

## 4. 大对象返回

| API | 返回字段 | 潜在大小 | 风险等级 |
|-----|---------|---------|----------|
| `/api/ai/chat` | AI 文本响应 | 1-50KB | 🟡 中 |
| `/api/apps/beauty/get-report` | report_json (JSON blob) | 5-50KB | 🔴 高 |
| `/api/admin/tasks/stats` | 统计数据聚合 | <1KB | 🟢 低 |
| `/api/knowledge/context` | RAG 上下文拼接 | 2-20KB | 🟡 中 |

**beauty_report** 是最主要的性能负担 — 每次报告可能包含完整的面部分析 JSON、style_result、多语言描述等。

**建议:** 
- 报告接口改为懒加载：先返回元数据，按需获取详细内容
- 报告存储分片：大文本放在 R2，只存 URL

---

## 5. Cache 命中率评估

| Cache Layer | 当前命中率 | 预估 | 建议 |
|------------|-----------|------|------|
| KV USER_CACHE | 未知 | ~60% | 添加命中统计 |
| KV RATE_LIMITS | N/A | 100% | 小数据量 |
| KV FEATURE_FLAGS | 未知 | ~90% | 低频变更 |
| D1 Read | 基线 | N/A | 考虑 read replicas |

---

## 6. 冷启动影响

### 每个函数的冷启动时间预估

| API Group | 依赖包数量 | 预估冷启动 | 建议 |
|-----------|-----------|-----------|------|
| `/api/auth/*` | auth + db | ~100ms | ✅ |
| `/api/ai/*` | ai-core + queue + db | ~300ms | ⚠️ 优化 provider 启动 |
| `/api/billing/*` | billing + db | ~150ms | ✅ |
| `/api/apps/beauty/*` | beauty + face_analysis + db | ~200ms | ✅ |
| `/api/admin/*` | admin + db | ~150ms | ✅ |
| `/api/knowledge/*` | knowledge + db | ~200ms | ⚠️ embedding 计算消耗 CPU |

---

## 7. 性能评分

| 维度 | 评分 (/100) | 说明 |
|------|:----------:|------|
| Query Optimization | 55 | 多处缺少索引，部分查询无 LIMIT |
| Caching Strategy | 60 | KV 有利用但无 TTL 管理 |
| Response Size | 50 | beauty_report 过大，无分页 |
| Cold Start | 70 | 基本合理，AI 路由有优化空间 |
| Concurrency | 65 | D1 单实例无连接池 |

**综合评分: 60/100 (C+)**

---

## 8. 优化优先级

### Phase 1: 立即实施
1. 为高频查询表添加复合索引 (0038_add_performance_indexes.sql)
2. beauty_report 接口增加分页/懒加载
3. 实现 provider 启动预热

### Phase 2: 中期计划
4. 添加 KV 缓存层（产品列表、配额信息）
5. 大报告分片存储到 R2
6. 流式 AI 响应 (SSE)

### Phase 3: 长期优化
7. D1 read replica（超过 10K DAU 时）
8. 连接池配置
9. CDN 静态资源二级缓存
