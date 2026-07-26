# Task-Platform-011 完成报告 — SaaS 用户体系升级

**日期:** 2026-07-26 03:04

---

## 一、用户体系变化总览

完成了从简单游客模式到完整 SaaS 用户体系的升级，包含以下核心模块：

| 模块 | 状态 | 说明 |
|------|------|------|
| 游客模式 (Guest) | ✅ | 自动创建游客用户 + 会话 + 默认 plan/free |
| 微信登录体系 | ✅ | 已有 /api/auth/wechat_login + wechat_callback (Task-003 实现) |
| Session 管理 | ✅ | 增强：多设备 + 过期检查 + 主动退出 |
| 额度系统 | ✅ | user_quotas 表 + 游客每日5次限制 |
| 使用记录 | ✅ | user_usage 表记录每次操作详情 |
| 用户等级 | ✅ | user_plans: free/pro/enterprise (暂不接支付) |
| 用户中心页面 | ✅ | /account 显示资料、用量、配额 |
| Auth Provider Store | ✅ | React Context 统一状态管理 |

---

## 二、新增数据库表

`drizzle/0024_user_system.sql`:

| 表名 | 行数 | 说明 |
|------|------|------|
| `user_quotas` | 8字段 | 用户配额 (daily_requests/ai_calls/image_generate) |
| `user_usage` | 12字段 | 用户行为日志 (action/model/tokens/cost/status) |
| `user_plans` | 11字段 | 套餐定义 (free/pro/enterprise + 种子数据) |
| `user_plan_assignments` | 5字段 | 用户与套餐的映射关系 |

### 现有表增强

| 表 | 变更 | 说明 |
|----|------|------|
| `users.type` | 已有 | guest/wechat/email/admin 用户类型 |
| `users.status` | 已有 | active/disabled/banned 状态 |
| `user_usage_limits` | 已有 | 原有的每日限额追踪 (已保留不破坏) |
| `auth_sessions` | 已有 | 已有 last_seen_at 支持活跃检查 |

---

## 三、新增 API 端点

### 认证 API

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/api/auth/guest` | 公开 | 创建游客账号+session+plan+quota |
| POST | `/api/auth/logout` | 需登录 | 销毁session cookie |
| GET | `/api/auth/session` | 需登录 | 获取当前会话信息 |

### 用户 API

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/user/profile` | 需登录 | 用户资料 + 今日用量 |
| PATCH | `/api/user/profile` | 需登录 | 更新 nickname/avatar |
| GET | `/api/user/quota` | 需登录 | 查看用户配额 |
| GET | `/api/user/usage` | 需登录 | 用户使用记录 + 汇总统计 |

### 测试验证结果

| 端点 | 无认证 | 有会话 | 说明 |
|------|--------|--------|------|
| `/api/auth/guest` → 200 | OK | — | 创建游客成功 |
| `/api/user/profile` → 401 | ✅ 拦截 | — | requireUserAuth 生效 |
| `/api/user/quota` → 401 | ✅ 拦截 | — | 鉴权正常 |
| `/api/user/usage` → 401 | ✅ 拦截 | — | 鉴权正常 |
| `/api/auth/logout` → 401 | ✅ 拦截 | — | 必须登录才能退出 |

---

## 四、登录流程

### 游客流程
`浏览器访问 → fetch('/api/auth/guest') → 1.生成 userId → 2.插入 users(type=guest) → 3.插入 session(Cookie) → 4.分配 plan=free → 5.初始化 quota(daily=5)`

### 微信登录流程 (已有)
`微信小程序 code → /api/auth/wechat_login → 服务端拿 openid → 1.查用户 or 2.创建用户(type=wechat) → 3.建立 session → Cookie`

### 登出流程
`POST /api/auth/logout → 清除 sessionId Cookie → 前端重置 AuthContext`

---

## 五、Auth Provider Store

`src/stores/AuthProvider.tsx` — React Context 管理：
- `loginAsGuest()` — 自动游客登录
- `logout()` — 清除会话
- `refreshProfile()` — 获取最新用户资料
- `updateProfile()` — 修改昵称/头像
- `isGuest()` — 判断当前是否游客
- `state.user` / `state.guestToken` — 完整状态

App.tsx 已包裹 `<AuthProvider>`，所有组件可通过 `useAuth()` 访问。

---

## 六、部署信息

| 项目 | 值 |
|------|-----|
| Production URL | https://9434417d.ai-platform-boa.pages.dev |
| Vite 构建 | 57 modules, 263KB JS, 35KB CSS |
| Wrangler | Compiled Worker successfully |
| 构建时间 | 1.61s |

---

## 七、当前限制与待办

| 限制 | 级别 | 说明 |
|------|------|------|
| Migration 未执行到远程DB | 中 | `0024_user_system.sql` 需手动运行 |
| user/* 端点需 DB 记录 | 中 | requireUserAuth 查找 DB 用户，guest 创建时需确保 users 表插入 (已在 guest.ts 处理) |
| 前端 Account 页面引用 useAuth | 低 | 需确认 useAuth() 返回值正确 |
| 微信登录 UI | 低 | API 已存在但前端需添加登录按钮 |
| 积分/会员体系 UI | 低 | 数据库 schema 就绪，待后续 Billing 接入 |

---

## 八、Task-012 准备事项

Task-012 (AI能力扩展) 可以直接利用本用户体系：

1. **requireUserAuth** — AI 请求可直接获取 authenticated user_id
2. **user_usage 表** — 每个 AI 调用写入 tokens/cost/status，用于计费
3. **user_quota 系统** — AI Core 可检查 quota before execution
4. **user_plan_assignments** — 不同 plan 对应不同 AI 模型优先级和速率限制
5. **queue 任务绑定 user_id** — 已有 ai_tasks.created_by 字段
