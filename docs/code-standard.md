# 代码规范 (Code Standards)

> 生成日期: 2026-07-27
> 适用范围: 整个 monorepo

---

## 1. TypeScript 规范

### 严格模式
- `strict: true` — 启用所有类型检查
- 禁止 `any` — 使用 `unknown` 或具体类型代替
- 文件: `tsconfig.json` → `compilerOptions.noImplicitAny = true`

### 路径别名
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "$shared/*": ["./shared/*"],
      "$packages/*": ["./packages/*"]
    }
  }
}
```

### Import 顺序
1. Node 内置模块
2. npm/外部包
3. `$packages/*` 内部包
4. `$shared/*` 共享层
5. `@/` 相对路径的本地模块

同一组内按字母排序。

---

## 2. 命名规范

### 文件命名
- **TypeScript**: `kebab-case.ts`（如 `billing.service.ts`）
- **React 组件**: `PascalCase.tsx`（如 `Layout.tsx`）
- **配置文件**: `.xxx` 或 kebab-case（如 `.eslintrc.cjs`）

### 变量/函数命名
- **函数/变量**: `camelCase`（如 `getUserById`）
- **常量**: `UPPER_SNAKE_CASE`（如 `MAX_RETRY_COUNT`）
- **类**: `PascalCase`（如 `BillingService`）
- **接口**: `I` 前缀可选，推荐用名词（如 `ApiResponse`）
- **枚举**: `PascalCase`，成员 `UPPER_SNAKE_CASE`

### 禁止混用命名约定
- ❌ 禁止同时存在 `billing.service.ts` 和 `billing_service.ts`
- ❌ 禁止在同一个模块中使用两种命名风格

---

## 3. API 响应格式

### 统一结构
```typescript
// 成功响应
{ success: true, data: <T> }

// 错误响应
{ success: false, error: { code: string, message: string } }
```

### HTTP 状态码
| 状态码 | 含义 | 示例 |
|--------|------|------|
| 200 | 成功 | 查询、更新 |
| 201 | 创建成功 | POST 后返回新资源 |
| 400 | 参数错误 | 校验失败 |
| 401 | 未授权 | 未登录 |
| 403 | 权限不足 | 需要 admin |
| 404 | 未找到 | 资源不存在 |
| 429 | 限流 | 请求过快 |
| 500 | 服务器错误 | 未知异常 |
| 502 | 第三方错误 | Provider 不可用 |
| 503 | 服务不可用 | 队列满 |

### 错误码体系
- `1xxx` — 认证相关（UNAUTHORIZED, SESSION_EXPIRED）
- `2xxx` — 校验相关（VALIDATION_ERROR, INVALID_PARAMS）
- `3xxx` — 业务相关（NOT_FOUND, INSUFFICIENT_CREDITS）
- `4xxx` — 外部依赖（PROVIDER_ERROR, PAYMENT_FAILED）
- `5xxx` — 系统（INTERNAL_ERROR, SERVICE_UNAVAILABLE）

---

## 4. 日志格式

### 结构化日志
```
2026-07-27T10:00:00.000Z [INFO] User login successful {"userId":"u123","ip":"1.2.3.4"}
```

### 级别使用
- **debug** — 开发调试（详细参数、中间结果）
- **info** — 正常运行记录（登录、任务完成、支付成功）
- **warn** — 非致命异常（缓存未命中、降级处理）
- **error** — 故障记录（API 失败、数据库错误）

---

## 5. 错误处理

### API 函数中的 catch 块
```typescript
try {
  // business logic
} catch (e: unknown) {
  const message = e instanceof Error ? e.message : 'Unknown error';
  return new Response(
    JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message } }),
    { status: 500, headers: { 'Content-Type': 'application/json' } },
  );
}
```

### 不要做的事
- ❌ 裸 `catch` 吞掉异常
- ❌ `throw new Error('raw text')` — 使用结构化错误码
- ❌ 直接返回用户调试信息（SQL 语句等敏感内容）

---

## 6. 安全规范

### 输入验证
- 所有 API 端点必须验证输入参数
- 禁止直接使用未转义的 query params 构建 SQL
- 限制文件大小（图片上传 ≤ 5MB）

### 权限检查
- Admin API (`/api/admin/*`) 必须检查角色
- 用户数据查询必须验证 ownership（用户只能访问自己的数据）
- API Key 端点必须验证 key 有效性和配额

### 敏感信息
- ❌ 禁止在日志中输出 password_hash、API keys、session tokens
- ❌ 禁止在前端响应中返回 `password_hash`、`openid`、`unionid`
- ✅ 使用 `metadata` 和 `redaction` 过滤

---

## 7. 配置工具

### ESLint
- 配置文件: `.eslintrc.cjs`
- 运行: `npm run lint` / `npm run lint:fix`
- 规则级别: warning（避免 CI 阻塞）

### Prettier
- 配置文件: `.prettierrc`
- 格式化: `npx prettier --write "**/*.ts" "**/*.tsx"`
- 忽略: `.prettierignore`

---

*此文档随项目演进持续更新。*
