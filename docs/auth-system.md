# AI SaaS 平台 — 统一认证系统设计文档

> 任务编号：Task-Platform-003
> 状态：【已完成】核心包已创建，未修改任何现有业务代码

---

## 1. 设计哲学

### 1.1 核心理念

本系统的核心是 **游客优先 → 微信绑定** 的渐进式认证路径，符合国内用户使用习惯。

| 原则 | 说明 |
|------|------|
| 游客优先 | 访问即获得身份（Cookie 匿名 ID），无需注册即可体验基础功能 |
| 微信绑定 | 未来通过 wx.login() 绑定openid，升级为正式用户 |
| 无邮箱注册 | 遵循国内场景，不设计邮箱验证流程 |
| 向后兼容 | 所有现有 shared/auth/* 文件保留不动 |

### 1.2 认证生命周期

`
阶段 1: 游客 (Guest)
┌─────────────────────────────────────┐
│ 首次访问 → 生成 guest-id cookie      │
│ DB自动创建 user(type='guest')        │
│ 每日限3次免费AI调用                  │
│ 可绑定微信升级 → 阶段2               │
└─────────────────────────────────────┘

阶段 2: 微信绑定用户 (WeChat)
┌─────────────────────────────────────┐
│ 点击「绑定微信」                     │
│ wx.login(code) → 后端换openid        │
│ openid存入用户表                     │
│ 额度解锁、会话刷新                   │
│ 可登录/登出管理                      │
└─────────────────────────────────────┘

阶段 3: 管理员权限 (Admin)
┌─────────────────────────────────────┐
│ 由超级管理员通过RBAC分配角色         │
│ admin/super_admin 拥有管理后台权限   │
│ 基于 user_roles + role_permissions   │
└─────────────────────────────────────┘
`

---

## 2. 数据表设计

### 2.1 users 表

已有表结构（drizzle/schema.ts），需扩展字段：

`sql
-- 现有字段保持不变
id TEXT PRIMARY KEY,
email TEXT,
password_hash TEXT,
role TEXT NOT NULL DEFAULT 'user', -- user | admin | super_admin
type TEXT NOT NULL DEFAULT 'guest',-- guest | wechat | user (用于区分认证方式)
status TEXT NOT NULL DEFAULT 'active',-- active | suspended | deleted
nickname TEXT,
avatar TEXT,
created_at TEXT NOT NULL,
updated_at TEXT NOT NULL,

-- 微信登录扩展字段 (现有)
openid TEXT UNIQUE,
unionid TEXT UNIQUE,

-- 索引
CREATE INDEX idx_users_type ON users(type);
CREATE INDEX idx_users_openid ON users(openid);
CREATE INDEX idx_users_unionid ON users(unionid);
`

### 2.2 auth_sessions 表

已有表结构，保持不变：

`sql
id              TEXT PRIMARY KEY,    -- SHA-256(sessionId)，安全存储
user_id         TEXT,                -- REFERENCES users(id)
session_version INTEGER DEFAULT 1,
created_at      TEXT,
expires_at      TEXT,
last_seen_at    TEXT,
revoked_at      TEXT DEFAULT NULL
`

### 2.3 user_roles 表（新增）

已有表结构，从 shared/auth/authorization_rbac.ts 可知：

`sql
-- 已有表
user_id   TEXT NOT NULL REFERENCES users(id),
role_id   TEXT NOT NULL,            -- role_guest | role_user | role_admin | role_super_admin
PRIMARY KEY(user_id, role_id)
`

### 2.4 permissions 表（预留）

`sql
CREATE TABLE IF NOT EXISTS permissions (
  id          TEXT PRIMARY KEY,       -- perm_ai_generate, perm_billing_manage, perm_admin_dashboard...
  name        TEXT NOT NULL UNIQUE,
  description TEXT
);
`

### 2.5 role_permissions 表（已有）

`sql
role_id     TEXT NOT NULL REFERENCES user_roles(role_id),
permission_id TEXT NOT NULL REFERENCES permissions(id),
PRIMARY KEY(role_id, permission_id)
`

### 2.6 user_usage_limits 表

已有表结构，从 shared/auth/usage.ts 可知：

`sql
CREATE TABLE IF NOT EXISTS user_usage_limits (
  user_id       TEXT PRIMARY KEY REFERENCES users(id),
  daily_free_count INTEGER DEFAULT 3, -- 默认每日3次
  used_count    INTEGER DEFAULT 0,
  reset_time    TEXT NOT NULL          -- 下次重置时间(middle of night)
);
`

### 2.7 Drizzle Schema 对应

在 packages/auth/src/schema.ts 中应定义对应模型（待后续Phase实现）。

---

## 3. API 设计

### 3.1 认证路由

`
用户获取/验证登录状态
→ GET /api/auth/session
   返回 { authenticated: true, user: { id, nickname, type }, sessionId }

用户退出登录
→ POST /api/auth/logout
   清除 cookie + 撤销DB中的session
   返回 { success: true }
`

### 3.2 微信绑定路由

`
用户点击"绑定微信"后调用前端 wx.login(code) 传给后端
→ POST /api/auth/wechat/bind
   body: { code, userInfo?: { nickName, avatarUrl } }
   → 后端调微信API换openid
   → 更新用户记录: type='wechat'
   → 新建session + 返回cookie
   → 返回 { success: true, session }

纯微信登录（新用户）
→ POST /api/auth/wechat/login
   body: { code }
   → 检查openid是否存在
     → 存在: 登录已绑定用户
     → 不存在: 创建新wechat类型用户
   → 返回session
`

### 3.3 管理员路由

`
管理员为普通用户分配角色
→ PUT /api/admin/users/:userId/roles
   body: { roleId: 'role_admin' }
   → 需要super_admin权限

撤销用户角色
→ DELETE /api/admin/users/:userId/roles
   body: { roleId: 'role_admin' }
`

---

## 4. RBAC 角色体系

### 4.1 内置角色

| 角色ID | 显示名 | 级别 | 说明 |
|--------|--------|------|------|
| ole_super_admin | 超级管理员 | 100 | 全部权限，含角色管理 |
| ole_admin | 管理员 | 50 | 管理后台可用 |
| ole_user | 普通用户 | 10 | 正常用户，无额度限制 |
| ole_guest | 游客 | 1 | 默认游客身份，限3次/天 |

### 4.2 默认权限矩阵

| 操作 | guest | user | admin | super_admin |
|------|-------|------|-------|-------------|
| AI文本生成 | 3次/日 | 不限 | 不限 | 不限 |
| AI对话 | 3次/日 | 不限 | 不限 | 不限 |
| Beauty分析 | 3次/日 | 不限 | 不限 | 不限 |
| 管理后台 | × | × | ✓ | ✓ |
| 角色管理 | × | × | × | ✓ |
| 计费管理 | × | × | ✓ | ✓ |

### 4.3 角色层级校验逻辑

`	ypescript
// packages/auth/src/rbac.ts
// 
// 1. hasRole(env, userId, roleId)          // 用户是否有指定角色
// 2. hasPermission(env, userId, perm)      // 用户是否有指定权限
// 3. checkRoleIdLevel(roleId, minLevel)    // 角色级别是否满足要求
// 4. hasRoleLevel(env, userId, minLevel)   // 用户最高角色级别
`

缓存策略：KV 缓存 TTL = 300秒

---

## 5. 游客系统详细设计

### 5.1 Guest ID 生成

`
用户首次请求:
1. Cookie: __Host-guest-id 不存在?
   → 生成 UUID: guest_随机16位字符
   → 设置 HttpOnly Cookie
   → 创建用户记录: users(type='guest')

用户再次请求:
1. Cookie: __Host-guest-id 存在
   → 验证格式 guest_[a-f0-9]{16}
   → 使用现有ID
`

### 5.2 游客额度控制

`	ypescript
// packages/auth/src/guest.ts
//
// checkGuestLimit(guestId):
//   1. 查询 user_usage_limits.used_count vs daily_free_count
//   2. 检查 reset_time 已过 → 重置计数
//   3. 达到上限 → 返回 limitExceeded=true
//   4. 未达上限 → used_count++
//      用户看到「再试3次将用光今日免费次数」提示
//   5. 绑定微信后 → unlimited
`

### 5.3 游客 → 微信升级流程

`
1. 前端渲染「绑定微信」按钮
2. 点击 → 触发 wx.login() 获取 code
3. POST /api/auth/wechat/bind 带 code + userInfo
4. 后端:
   a. code → 微信API → openid + unionid + session_key
   b. UPDATE users SET type='wechat', openid=?, unionid=? WHERE id=guestId
   c. revokeSession() 所有旧session
   d. 删除daily_free_count限制
   e. createNewSession() 返回新cookie
5. 前端更新状态 → 显示已绑定
`

---

## 6. Session 管理

### 6.1 安全设计

`
sessionId (48字节随机) 
  → SHA-256 哈希
  → KV key: auth:session:{hash}
  → D1表: auth_sessions.id = hash
  
安全性:
- sessionId对客户端不透明(不可预测)
- D1存储的是哈希值(即使泄漏也无法还原)
- HttpOnly + SameSite=Lax 防止CSRF/XSS
- 7天过期
`

### 6.2 Session 生命周期

`
创建: createSession(user)
  → KV + D1双写
  → 返回 sessionId → set-cookie

验证: getSession(sessionId)
  → 解析cookie → SHA-256 → KV查找 → 验证D1状态
  → 命中 → refreshLastSeen → 返回session
  → 未命中 → 清除cookie → null

撤销: revokeSession(sessionId)
  → KV删除 + D1 revoked_at = now

登出: logoutAllSessions(userId)
  → 批量撤销用户所有有效session
`

---

## 7. 与现有代码关系

`
当前状态: 新包已创建, 现有代码零改动

┌──────────────────────────────────────────┐
│  packages/auth/                          │
│  ├── types.ts        ← 扩展用户模型       │
│  ├── guest.ts        ← 游客系统(新)       │
│  ├── wechat.ts       ← 微信绑定(新)       │
│  ├── rbac.ts         ← 增强版RBAC         │
│  ├── middleware.ts   ← 认证中间件(新)     │
│  ├── session.ts      ← 增强版session      │
│  └── cookies.ts      ← Cookie工具         │
└──────────────┬───────────────────────────┘
               │ 共存但不冲突
┌──────────────▼───────────────────────────┐
│  shared/auth/                            │
│  ├── types.ts           ← 旧类型保留     │
│  ├── session.ts         ← 旧逻辑保留     │
│  ├── cookies.ts         ← 旧逻辑保留     │
│  ├── authorization.ts   ← 旧RBAC保留     │
│  └── usage.ts           ← 旧额度保留     │
└──────────────────────────────────────────┘
`

迁移策略：
1. **双写阶段**: 新功能同时写旧包和新包验证一致性
2. **路由切换**: /api/auth/session 逐步改为 @ai-saas/auth
3. **标记废弃**: shared/auth 标注 @deprecated
4. **清理移除**: 新包完全接管后移除旧包

---

## 8. 依赖关系

`
packages/auth (独立包，无运行时依赖)
  ↓ 依赖
Cloudflare: D1 + KV + Web Crypto API
  ↓ 使用
@ai-saas/ai-core → 额度检查
@ai-saas/billing → 用户识别
apps/api       → 路由集成
apps/web       → 前端认证组件
admin          → 角色管理界面
`

---

## 9. 后续计划

- [ ] Phase 2: 创建 Drizzle Schema (packages/database/src/schema/auth.schema.ts)
- [ ] Phase 3: 创建 /api/auth/session 路由集成 uthenticate()
- [ ] Phase 4: 创建 /api/auth/wechat/bind 路由
- [ ] Phase 5: Admin 角色管理页面 (dmin/src/Roles.tsx)
- [ ] Phase 6: 旧路由切换到新包
- [ ] Phase 7: 清理 deprecated 旧代码
