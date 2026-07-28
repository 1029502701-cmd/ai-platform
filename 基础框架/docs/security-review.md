# 安全审查报告

> 生成日期: 2026-07-27
> 范围: 全部 137+ API 函数文件 + shared 层服务

---

## 审查方法

通过对以下区域的手动扫描与模式分析：
- `functions/api/` — 所有 API 端点
- `shared/services/` — 共享业务逻辑
- `packages/auth/` — 认证核心
- `packages/billing/` — 计费核心

---

## 发现的安全问题

### 🔴 P0: 高危

#### S0-1: ai_test_call.ts 公开暴露 AI Provider 注册
**文件:** `functions/api/ai_test_call.ts`  
**风险等级:** HIGH  

该端点 (`GET /api/ai_test_call`) 无需任何认证即可调用，并执行：
- `seedExample()` — 向内存写入示例数据
- `registerProvider('mock', ...)` — 注册 Provider
- 直接调用外部 AI API（OpenAI、DeepSeek）

**攻击面:** 任何人可调用此端点消耗你的 AI API 配额（token 计费等）。

**修复建议:** 
```typescript
// 方案 A: 添加 admin 权限检查
if (!user || user.role !== 'admin') {
  return new Response(JSON.stringify({ error: { code: 'FORBIDDEN', message: '仅限管理员' } }), { status: 403 });
}

// 方案 B (推荐): 从生产部署中移除
// 通过 wrangler.toml 排除此文件或 GitHub CI 不部署
```

---

### 🟡 P1: 中危

#### S1-1: Cookie Session 解析过于简单
**涉及文件:** 多个 functions/api/*.ts 中的 `Cookie` header 解析  

```typescript
const cookie = request.headers.get('Cookie') || '';
const match = cookie.match(/session_user=([^;\s]+)/);
const userId = match ? decodeURIComponent(match[1]) : null;
```

**风险:**
- 无签名验证 — 用户可伪造任意 userId
- 无过期检查 — 过期 session 仍有效
- 无 CSRF 防护

**修复建议:** 迁移到 signed JWT 或使用 packages/auth 中已实现的 `createSessionCookie` 签名机制。

---

#### S1-2: Admin API 缺乏严格的 RBAC 检查
**涉及文件:** 多个 `functions/api/admin/**/*.ts`  

大量 admin API 使用自定义的 `hasRoleForRequest` 检查，但存在：
- 部分 admin API 完全没有权限检查
- `hasRoleForRequest` 的实现不一致

**修复建议:** 统一使用 `packages/auth/src/middleware.ts` 中的 `requireAdmin`。

---

#### S1-3: Beauty Report 图片 URL 无 URL 校验
**涉及文件:** `functions/api/apps/beauty/upload.ts`, `functions/api/apps/beauty/profile.ts`  

用户上传的图片 URL 或未经验证直接存储到数据库。如果 R2 bucket 策略配置不当，可能导致：
- 图片注入恶意内容
- 通过 URL 路径遍历访问其他文件

**修复建议:** 
- 对所有文件上传做 MIME 类型校验
- R2 Bucket 设置为私有，仅通过预签名 URL 访问
- URL 路径白名单过滤

---

#### S1-4: AI 输出未做内容过滤
**涉及文件:** `functions/api/ai/chat.ts`, `functions/api/ai/generate.ts`, `packages/ai-core/src/providers/openai-provider.ts`  

AI Provider 的原始响应直接返回给前端，未经任何内容审核。

**风险:**
- AI 可能输出有害内容
- 模型可能泄露训练数据
- prompt injection 攻击

**修复建议:** 
- 在 Provider 响应和前端之间添加内容审核中间件
- 对 system prompt 做注入防护
- 记录所有 AI 调用供审计

---

### 🟢 P2: 低危 / 改进项

#### S2-1: Billing 钱包更新缺少并发保护
**涉及文件:** `shared/services/billing.service.ts`  

```typescript
let w = await this.repo.getWallet(userId);
// ... 直接 updateCredits
```

在高并发场景下可能出现：
- 同时两次扣费导致余额为负
- 缺少数据库层面的乐观锁/行级锁

**修复建议:** 使用 `UPDATE wallets SET credits = credits - $1 WHERE user_id = $2 AND credits >= $1 RETURNING *` 原子操作。

---

#### S2-2: 敏感字段可能在 API 响应中泄露
**涉及文件:** 多处查询 `users` 表的代码  

部分 admin API 查询用户时可能返回 `password_hash`、`openid`、`unionid` 等敏感字段。

**修复建议:** 
- 使用 Drizzle 的 `omit` 或 select 白名单
- 建立统一的 UserResponse 类型（不含敏感字段）

---

#### S2-3: CORS 策略未配置
**涉及文件:** 全局无 CORS middleware  

当前项目没有统一的 CORS 中间件。在生产环境中应明确配置允许的域名。

**修复建议:** 
```typescript
// 在 wrangler.toml 中配置
[site]
bucket = "./dist"
entry-point = "functions"

[[routes]]
domain = "your-domain.com"
```

或在每个 API 函数的 Response 中添加 `Access-Control-Allow-Origin`。

---

#### S2-4: API Key 存储未加密
**涉及文件:** `functions/api/openapi/keys/`  

API Keys 存储在数据库中但未做额外加密（除了数据库本身的静态加密）。

**修复建议:** 考虑对 API key hash 存储（bcrypt/scrypt），验证时用 hash 比较。

---

#### S2-5: Webhook 回调无签名验证
**涉及文件:** `functions/api/payment/callback/index.ts`, `functions/api/openapi/v1/webhooks.ts`  

支付回调和 webhook 端点可能接受伪造请求。

**修复建议:** 对每个 webhook 源实现签名验证（如 Stripe 的 webhook signatures）。

---

## 安全矩阵

| 模块 | Auth | RBAC | Input Validation | Rate Limit | Audit Log | Status |
|------|:----:|:----:|:----------------:|:----------:|:---------:|--------|
| Auth APIs | ✅ | ✅ | ⚠️ | ❌ | ✅ | 中等 |
| Admin APIs | ✅ | ⚠️ | ❌ | ⚠️ | ✅ | 待改进 |
| AI APIs | ⚠️ | ✅ | ❌ | ❌ | ⚠️ | 需加强 |
| Beauty APIs | ⚠️ | ✅ | ❌ | ⚠️ | ❌ | 需加强 |
| Billing APIs | ✅ | ✅ | ❌ | ⚠️ | ✅ | 中等 |
| Payment APIs | ✅ | ✅ | ⚠️ | ❌ | ✅ | 中等 |
| OpenAPI | ✅ | ✅ | ⚠️ | ❌ | ✅ | 中等 |
| Public APIs | N/A | N/A | ❌ | ❌ | ❌ | 最低 |

---

## 修复优先级

| 优先级 | 编号 | 问题 | 预计工时 |
|--------|------|------|----------|
| P0 | S0-1 | ai_test_call.ts 公开暴露 | 30 min |
| P1 | S1-1 | Cookie Session → JWT | 2-3 hours |
| P1 | S1-2 | Admin RBAC 统一化 | 1 hour |
| P1 | S1-3 | Beauty 文件上传安全 | 1 hour |
| P1 | S1-4 | AI 输出内容过滤 | 2 hours |
| P2 | S2-1 | Billing 并发保护 | 1 hour |
| P2 | S2-3 | CORS 配置 | 30 min |
| P2 | S2-5 | Webhook 签名验证 | 1 hour |
