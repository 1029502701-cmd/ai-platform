# Admin Center 管理后台系统

> 任务编号：Task-Platform-005
> 状态：已完成，后台框架+权限接入+基础CRUD

---

## 1. 后台结构

admin/
-- 独立目录
components/
  Layout.tsx -- 侧边栏布局 + 导航
  StatCard.tsx -- 统计卡片
  Table.tsx -- 数据表格（含状态标签）
dashboard/index.tsx -- Dashboard 首页
users/index.tsx -- 用户管理
ai/models.tsx -- AI模型管理
ai/scenarios.tsx -- 场景管理（预留）
tasks/index.tsx -- 任务监控
billing/index.tsx -- 计费管理
beauty/index.tsx -- 美妆管理（预留）
alliance/index.tsx -- 联盟系统（预留）
system/index.tsx -- 系统设置
types.ts -- 全部类型定义
lib/api.ts -- API客户端封装
routes.tsx -- React Router路由定义

---

## 2. 权限设计

访问流程：
请求/admin/* -> readSessionId(cookie) -> getSession() -> 无session:401
有session -> check role -> user:403, operator:403, partner:403, admin/super_admin:PASS

角色权限矩阵：
| admin | 完整访问 |
| operator | 无访问 |
| partner | 无访问 |
| user | 无访问 |

统一认证中间件位置：functions/api/admin/_auth.ts

---

## 3. API列表

GET /api/admin/dashboard/stats -- 统计数据
GET /api/admin/users -- 用户列表
POST /api/admin/users/:id/role -- 修改角色
GET /api/admin/models/list -- 模型列表
POST /api/admin/models/update -- 模型状态切换
GET /api/admin/tasks/list -- 任务列表
GET /api/admin/tasks/stats -- 任务统计
GET /api/admin/tasks/[id] -- 任务详情
GET /api/admin/billing/overview -- 计费概览
GET /api/admin/billing/transactions -- 交易列表
GET /api/admin/billing/wallets -- 钱包列表
GET /api/admin/system/config -- 环境配置
POST /api/admin/system/config -- 更新配置
GET /api/admin/system/providers -- Provider状态

所有接口首行调用requireAdminAuth()进行认证+角色检查。