# API 规范标准 (API Standard)

> 生成日期: 2026-07-27
> 适用范围: functions/api/ 下的所有端点

---

## 1. 请求格式

### Content-Type
| 场景 | Content-Type |
|------|-------------|
| JSON 请求体 | `application/json` |
| 文件上传 | `multipart/form-data` |
| Webhook 回调 | `application/json` |

### 统一请求头
所有 API 请求应携带：

| Header | 必选 | 说明 |
|--------|------|------|
| `Authorization` | 按需 | `Bearer <token>` 或 `Basic <key>` |
| `X-Request-ID` | 推荐 | 全局追踪 ID（UUID v4） |
| `X-Plugin-ID` | 按需 | 插件标识符 |
| `Content-Type` | 按需 | 请求体类型 |

如果客户端未传 `X-Request-ID`，服务端必须自动生成。

---

## 2. 响应格式

### 标准成功响应
```json
{
  "success": true,
  "data": { ... }
}
```

### 标准错误响应
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "参数 'email' 格式不正确",
    "metadata": {
      "field": "email"
    }
  }
}
```

### 分页响应
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "total": 156,
    "page": 1,
    "pageSize": 20,
    "hasNext": true
  }
}
```

---

## 3. HTTP 状态码规范

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | OK | GET / PATCH / PUT 成功 |
| 201 | Created | POST 创建资源成功 |
| 204 | No Content | DELETE 成功（无返回体） |
| 400 | Bad Request | 参数校验失败、格式错误 |
| 401 | Unauthorized | 未认证（缺 token / expired） |
| 403 | Forbidden | 已认证但权限不足 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突（重复创建等） |
| 422 | Unprocessable | 语义错误（余额不足等） |
| 429 | Too Many Requests | 触发限流 |
| 500 | Internal Server Error | 未知服务器错误 |
| 502 | Bad Gateway | Provider 不可用 |
| 503 | Service Unavailable | 队列满 / 维护中 |

**禁止行为：**
- ❌ 400 状态码返回业务错误（应用错误应优先用 4xx）
- ❌ 200 状态码返回结构化错误（应保持错误与成功的状态码一致）
- ❌ 直接 throw 异常而不包装为标准响应

---

## 4. 错误码体系

| 前缀 | 类别 | 示例 |
|------|------|------|
| AUTH_* | 认证 | `AUTH_MISSING`, `AUTH_EXPIRED` |
| VALIDATION_* | 校验 | `VALIDATION_EMAIL_INVALID` |
| FORBIDDEN_* | 权限 | `FORBIDDEN_ADMIN_REQUIRED` |
| NOT_FOUND_* | 资源 | `NOT_FOUND_USER`, `NOT_FOUND_TASK` |
| RATE_LIMIT_* | 限流 | `RATE_LIMIT_GLOBAL` |
| AI_* | AI 相关 | `AI_MODEL_DISABLED`, `AI_PROVIDER_TIMEOUT` |
| BILLING_* | 计费 | `BILLING_INSUFFICIENT_CREDITS` |
| PAYMENT_* | 支付 | `PAYMENT_FAILED` |
| STORAGE_* | 存储 | `STORAGE_UPLOAD_TOO_LARGE` |
| INTERNAL_* | 系统 | `INTERNAL_DATABASE_ERROR` |

---

## 5. 日志要求

每个 API 函数必须记录以下信息（JSON 格式）：

```json
{
  "ts": "2026-07-27T10:00:00.000Z",
  "level": "info",
  "msg": "POST /api/ai/tasks/create completed",
  "req_id": "a1b2c3d4-e5f6...",
  "user_id": "u_12345",
  "method": "POST",
  "path": "/api/ai/tasks/create",
  "status_code": 200,
  "duration_ms": 42,
  "plugin": "ai-core"
}
```

**最低要求：**
- 每个请求必须有 `req_id`（请求追踪 ID）
- 每个请求必须有 `status_code`（响应状态码）
- 每个请求必须有 `duration_ms`（处理耗时）
- 已认证的用户必须有 `user_id`
- 错误响应必须有 `errorCode`

---

## 6. API 分组约定

| 前缀 | 用途 | 认证要求 |
|------|------|----------|
| `/api/health/*` | 健康检查 | 无 |
| `/api/auth/*` | 认证流程 | 公开（部分子路径需认证） |
| `/api/admin/*` | 管理后台 | Admin 角色 |
| `/api/user/*` | 用户个人 | Authenticated |
| `/api/ai/*` | AI 任务 | Authenticated |
| `/api/apps/beauty/*` | 美妆分析 | Authenticated |
| `/api/billing/*` | 计费 | Authenticated |
| `/api/payment/*` | 支付 | Authenticated |
| `/api/openapi/*` | Open API | API Key |
| `/api/knowledge/*` | 知识库 | Authenticated |
| `/api/agents/*` | Agent 引擎 | Authenticated |
| `/api/marketplace/*` | 应用市场 | Authenticated |
| `/api/platform/*` | 平台管理 | Admin |

---

## 7. 安全要求

1. **输入验证:** 所有请求体必须进行 schema 校验
2. **输出过滤:** 禁止返回 password_hash、session_token、secret 等敏感字段
3. **限流:** 高频接口（登录、支付回调）必须配置速率限制
4. **CORS:** 生产环境只允许配置的域名列表
5. **API Key:** 过期自动拒绝，禁止回退到默认 key
