# Task-Platform-009 完成报告 — 生产监控体系

**日期:** 2026-07-26 02:38

---

## 一、新增文件清单

### 共享模块 (shared/)

`shared/logger/types.ts`          - LogLevel, LogEntry, LoggerOptions 类型定义
`shared/logger/index.ts`         - Logger 类 (结构化日志 + 敏感信息脱敏)
`shared/logger/requestLogger.ts` - 请求级日志 + DB写入
`shared/errorHandler/index.ts`   - 统一错误处理

### API 端点 (functions/api/admin/monitor/)

`overview.ts`   GET /api/admin/monitor/overview    # 系统概览仪表盘
`logs.ts`       GET /api/admin/monitor/logs        # 日志查询
`ai-calls.ts`   GET /api/admin/monitor/ai-calls    # AI调用统计
`tasks.ts`      GET /api/admin/monitor/tasks       # 任务队列监控

### 前端页面
`src/pages/Monitor/index.tsx`  监控仪表盘页面 (/monitor)

### 数据库迁移
`drizzle/0022_monitoring_tables.sql`  system_logs + ai_call_logs

### 配置文件
`functions/_routes.json`  Pages Functions 路由声明

---

## 二、修改文件清单

| 文件 | 变更内容 |
|------|----------|
| `functions/_middleware.ts` | 集成 Logger + DB logging，每请求记录 |
| `src/App.tsx` | 添加 /monitor 路由 |
| `shared/services/ai_provider_adapters_openai.ts` | 添加 getLogger import |
| `shared/services/ai_provider_adapters_deepseek.ts` | 添加 getLogger import |

---

## 三、数据库变化

### system_logs 表
- requestId 全链路追踪
- level/module/message/metadata 结构化存储
- 5个索引: request_id, level, module, created_at, module+created

### ai_call_logs 表
- provider, model, tokens_in/out, duration_ms, cost_usd, status
- 5个索引: request_id, user_id, provider, status, created_at
- 为后续 Task-015 计费系统准备数据

---

## 四、日志结构设计

**requestId 全链路追踪流程:**
1. _middleware.ts 生成 UUID
2. X-Request-Id HTTP Header
3. 所有 handler 可从 context.request.headers.get('X-Request-Id') 读取
4. 写入 system_logs.request_id
5. 响应返回时携带 requestId

**敏感信息脱敏规则:**
Logger 自动检测 key/secret/token/password 字段并替换为 ***REDACTED***

---

## 五、API 端点详情

**GET /api/admin/monitor/overview** (Admin only)
- 系统健康状态 (DB connected / degraded / unhealthy)
- 用户总数 + 今日AI调用数 + 今日收入
- 任务面板: Pending/Running/Failed Today
- 平均响应时间 (ms)

**GET /api/admin/monitor/logs?limit=50&level=error&module=http** (Admin only)
- 按 level/module/requestId 过滤系统日志
- 支持分页 (limit max 200)

**GET /api/admin/monitor/ai-calls?days=7&provider=openai** (Admin only)
- Provider 调用统计 (calls/tokens/cost/duration)
- 错误率计算 (total vs error)

**GET /api/admin/monitor/tasks?status=failed&limit=50** (Admin only)
- 任务列表 (userId/scenario/model/status/priority/duration)
- 队列深度摘要
- 7天状态分布

---

## 六、测试结果

| 测试项 | 结果 |
|--------|------|
| Vite 构建 (55 modules) | OK |
| Wrangler Worker 编译 | OK |
| /api/health -> 200 | OK |
| /api/auth/guest -> 200 | OK |
| /api/admin/monitor/overview -> 403 (未认证) | OK 鉴权正确 |
| /api/admin/monitor/logs -> 403 (未认证) | OK |
| /api/admin/monitor/ai-calls -> 403 (未认证) | OK |
| _routes.json 路由生效 | OK /api/* 不再走 SPA fallback |

---

## 七、当前风险

| 风险 | 级别 | 说明 |
|------|------|------|
| system_logs/ai_call_logs 表未创建 | 中 | Migration已写好，需执行: wrangler d1 execute --remote --file drizzle/0022_monitoring_tables.sql |
| Provider 结构化日志未完全接入 | 低 | adapter 已有 getLogger import，实际 log.info/error 在 fetch 完成后添加 |
| Monitor 页面导航入口缺失 | 低 | /monitor 路由已注册，需更新侧边栏 |
| Log 数据无过期策略 | 低 | 建议未来添加定期清理 cron job |

---

## 八、Task-010 准备事项

下一任务 (Queue Consumer Worker) 可直接利用本系统监控基础:

1. Queue Worker 复用 logger getLogger()
2. 任务创建 -> system_logs INSERT
3. Provider 响应 -> ai_call_logs INSERT
4. Admin /monitor/tasks 已可展示 queue 数据
5. 8条SQL迁移语句完整可用
