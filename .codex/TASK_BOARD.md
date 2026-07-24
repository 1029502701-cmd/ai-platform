# 任务板（TASK BOARD）

## 说明

本任务板基于里程碑划分，仅创建里程碑和任务占位符。不添加任何业务实现细节。任务将根据路线图逐步填充。

---

## M1：开发组织（已完成）

| ID | 任务 | 状态 | 负责人 | 备注 |
|----|------|------|--------|------|
| M1-001 | 创建 .codex/ 目录结构 | ✅ 完成 | CTO | — |
| M1-002 | 定义所有角色职责 | ✅ 完成 | CTO | 23 个角色已定义 |
| M1-003 | 创建团队规范文档 | ✅ 完成 | CTO | RULES、WORKFLOW 等 |

---

## M2：项目初始化（待开始）

**负责人**：CTO + DevOps 工程师

| ID | 任务 | 状态 | 负责人 | 备注 |
|----|------|------|--------|------|
| M2-001 | 初始化 Git 仓库 | ✅ Complete | DevOps 工程师 | |
| M2-002 | 配置 Cloudflare Pages 项目 | ☐ 待开始 | DevOps 工程师 | |
| M2-003 | 设置 wrangler.toml | ☐ 待开始 | DevOps 工程师 | |
| M2-004 | 创建 D1 数据库基础表 | ☐ 待开始 | 数据库工程师 | |
| M2-005 | 配置 KV 命名空间 | ☐ 待开始 | Cloudflare 架构师 | |
| M2-006 | 创建 R2 Bucket | ☐ 待开始 | Cloudflare 架构师 | |
| M2-007 | 搭建 Vite + React + TS 前端 | ☐ 待开始 | 前端工程师 | |
| M2-008 | 配置 Pages Functions API 结构 | ☐ 待开始 | 后端工程师 | |
| M2-009 | 建立 CI/CD 管道 | ☐ 待开始 | DevOps 工程师 | |
| M2-010 | 配置自定义域名（国内可访问） | ☐ 待开始 | DevOps 工程师 + 中国网络兼容专家 | |
| M2-011 | 设置多环境管理 | ☐ 待开始 | DevOps 工程师 | dev/staging/prod |

---

## M3：核心基础设施（待开始）

**负责人**：后端工程师 + 安全工程师

| ID | 任务 | 状态 | 负责人 | 备注 |
|----|------|------|--------|------|
| M3-001 | 实现认证服务 | ☐ 待开始 | 后端工程师 | JWT 认证 |
| M3-002 | 实现用户服务 | ☐ 待开始 | 后端工程师 | 档案管理 |
| M3-003 | 创建共享中间件 | ☐ 待开始 | 后端工程师 | 日志、错误处理、认证 |
| M3-004 | 构建共享工具库 | ☐ 待开始 | 后端工程师 | |
| M3-005 | 配置日志系统 | ☐ 待开始 | DevOps 工程师 | 结构化日志 |
| M3-006 | 实现安全中间件 | ☐ 待开始 | 安全工程师 | CORS、安全头 |
| M3-007 | 实现限流机制 | ☐ 待开始 | 安全工程师 | KV 计数器 |

---

## M4：国内网络适配（待开始）

**负责人**：中国网络兼容专家 + Cloudflare 架构师

| ID | 任务 | 状态 | 负责人 | 备注 |
|----|------|------|--------|------|
| M4-001 | 配置 CDN 缓存策略 | ☐ 待开始 | Cloudflare 架构师 | |
| M4-002 | 优化 DNS 策略 | ☐ 待开始 | 中国网络兼容专家 | 减少查询 |
| M4-003 | 实现客户端重试逻辑 | ☐ 待开始 | 前端工程师 + 后端工程师 | |
| M4-004 | 实现超时控制 | ☐ 待开始 | 前端工程师 + 后端工程师 | |
| M4-005 | 实现降级方案 | ☐ 待开始 | 前端工程师 | 优雅降级 |
| M4-006 | 国内网络连通性测试 | ☐ 待开始 | QA + 中国网络兼容专家 | |

---

## M5-M9：AI 相关服务（待开始）

| ID | 任务 | 状态 | 负责人 | 备注 |
|----|------|------|--------|------|
| M5-001 | AI 提供商抽象层 | ☐ 待开始 | AI 工程师 | |
| M6-001 | Prompt 引擎 | ☐ 待开始 | AI 工程师 + Prompt 工程师 | |
| M7-001 | 知识库引擎 MVP | ☐ 待开始 | 知识库工程师 + AI 工程师 | |
| M8-001 | AI Queue 系统 | ☐ 待开始 | 后端工程师 + AI Queue 工程师 | |
| M9-001 | 报告引擎 MVP | ☐ 待开始 | 后端工程师 + 报告引擎工程师 | |

---

## M10-M12：前端共享模块与管理后台（待开始）

| ID | 任务 | 状态 | 负责人 | 备注 |
|----|------|------|--------|------|
| M10-001 | 共享组件库 | ☐ 待开始 | 前端工程师 + UI 设计师 | |
| M10-002 | 共享 API 客户端（含重试） | ☐ 待开始 | 前端工程师 | |
| M11-001 | 监控与可观测性 | ☐ 待开始 | DevOps 工程师 + 数据分析工程师 | |
| M12-001 | 管理后台平台 | ☐ 待开始 | 前端工程师 + 后端工程师 | |

---

## M13+：应用上线（待开始）

按优先级顺序依次上线：

| 里程碑 | 应用 | 状态 |
|--------|------|------|
| M13 | AI 聊天（首发） | ☐ 待开始 |
| M14 | AI 美妆 / AI 图片 / AI 视频 | ☐ 待开始 |
| M15 | AI 陪伴 / 淘宝联盟 / 创作者平台 / AI Agent | ☐ 待开始 |

---

## 当前活跃里程碑

**当前活跃里程碑：无**（组织架构已建立）

启动下一个里程碑前，CTO 需：
1. 指定目标里程碑
2. 制定详细的实施方案
3. 经过完整流程评审后启动

---

## 独立任务执行记录

| ID | 任务 | 状态 | 备注 |
|----|------|------|------|
| Task-101 | 初始化项目脚手架 | ✅ Completed | 已完成基础 Git、Vite、React、TypeScript 配置 |
| Task-102 | 接线基础前端应用与 Pages Functions 运行骨架 | ✅ Completed | 已完成 SPA 路由、共享布局、Cloudflare 中间件基础接线 |
| Task-103 | 配置 Cloudflare Pages 与基础 API | ✅ Completed | 已完成 Pages 配置、`/api/health` 和同源 API 基础入口 |
| Task-104 | 创建 D1 数据库基础表 | ✅ Completed | 已创建 users、profiles、conversations、messages、ai_jobs 及首个版本化迁移 |
| Task-105 | 配置 KV 命名空间 | ✅ Completed | 已配置 USER_CACHE、RATE_LIMITS、FEATURE_FLAGS 绑定结构及本地占位 ID |
| Task-106 | 创建并配置 Cloudflare R2 Bucket | ✅ Completed | 已配置 ASSETS_BUCKET 生产与预览 Bucket 绑定 |
| Task-107 | 搭建 Vite + React + TypeScript 前端 | ✅ Completed | 已完成前端基础结构、路由、样式和生产构建验证 |
| Task-201 | 建立平台认证系统基础架构 | ✅ Completed | 已完成 D1 会话迁移、KV opaque Session、认证 Cookie、Session API 和基础 RBAC |
| Task-202 | 建立平台用户资料系统 | ✅ Completed | 已完成用户 Profile 查询、白名单更新、输入验证和同源 API |
| Task-203 | 建立平台权限管理基础 | ✅ Completed | 已完成 RBAC 基础表迁移、权限校验服务、Admin 角色查询与用户角色分配/撤销 API |
| Task-204 | 建立用户设置系统 | ✅ Completed | 已完成迁移、shared modules、KV 缓存与 API（用户与 Admin）实现 |
| Task-301 | AI 提供商抽象层（Provider Abstraction） | ✅ Completed | 已完成 OpenAI 适配器、Registry D1/KV 加载、迁移与基础超时/重试 |
| Task-302 | AI 模型管理系统 | ✅ Completed | 已完成 Model Manager、KV 缓存、Admin CRUD 与 ai_model_limits 迁移 |
| Task-303 | Prompt Engine（提示词管理引擎） | ✅ Completed | 已实现 prompts/prompt_versions 迁移、Prompt Manager、KV 缓存、Admin CRUD、render API |
| Task-304 | Knowledge Engine（Knowledge Engine） | ✅ Completed | 已实现 knowledge_bases/documents/chunks 迁移、Knowledge Manager、KV 缓存、Admin CRUD、search/context API |
| Task-305 | AI Service（统一 AI 调用服务层） | ✅ Completed | 已实现 AIService 核心、统一请求/响应、AI endpoints、Prompt/Knowledge 集成 |
| Task-306 | AI Core（AI Platform Core） | ✅ Completed | 已实现 AI Core 协调器、场景映射、AI endpoints 路由 |
