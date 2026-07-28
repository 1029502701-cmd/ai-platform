# Stabilization Plan — Foundation Stabilization

> 任务编号: Task-Platform-002
> 生成日期: 2026-07-27
> 目标: 修复当前架构稳定性问题，不新增业务功能

---

## P0 必须修复（阻塞性/破坏性问题）

### P0-1: 失效导入链
**现状:** `functions/api/ai_test_call.ts` 和 `shared/services/ai_service.ts` 导入已删除的文件：
- `../../shared/services/ai_provider_service.ts`（已被 packages/ai-core 替代）
- `../../shared/services/ai_provider_registry.ts`（已被 packages/ai-core 替代）
- `../../shared/services/ai_provider_adapters_openai.ts`（已被 packages/ai-core 替代）
- `../../shared/services/ai_provider_adapters_mock.ts`（已被 packages/ai-core 替代）

**影响:** 这些文件在运行时会抛 `Cannot resolve module` 错误。

**修复:** 将导入指向 `packages/ai-core/src/` 对应模块。如果这些文件暂时无法迁移，先删除或标记为废弃。

### P0-2: AI Test Call API 暴露完整实现细节
**现状:** `functions/api/ai_test_call.ts` 是一个测试端点，直接暴露了 Provider 注册逻辑，可在生产环境中被恶意调用。

**修复:** 将该 API 仅限 admin 角色访问，或在非 development 模式下屏蔽。

### P0-3: 所有 API 函数使用 `context: any`
**现状:** 全部 137 个 API 函数文件都使用了 `context: any`，缺少类型安全。

**修复:** 创建统一的上下文类型定义，放在 `packages/shared/types/api-context.ts` 中。

### P0-4: 错误返回格式不统一
**现状:** API 响应存在以下多种格式：
```typescript
// 格式 A
return new Response(JSON.stringify({ success: false, error: { code: 'ERR', message: 'msg' } }), { status: 500 })
// 格式 B
return jsonError(500, 'code', 'message')
// 格式 C
throw new Error('raw message')
```

**修复:** 创建统一的 `packages/shared/types/api-response.ts` 定义标准响应结构。

---

## P1 应该修复（显著改善代码质量和一致性）

### P1-1: 创建统一错误包
在 `packages/shared/errors/` 下新建：
- `ApiError.ts` — 结构化错误类（code, message, statusCode, metadata）
- `index.ts` — 统一导出 + 错误码枚举
- `middleware.ts` — 全局错误处理 middleware（catch → ApiError → 统一响应）

### P1-2: 创建统一日志包
在 `packages/shared/logger/` 下新建：
- `Logger.ts` — 结构化日志类（info/warn/error/debug，支持 JSON 输出）
- `index.ts` — 统一导出 + preset 实例

### P1-3: 创建统一类型包
在 `packages/shared/types/` 下新建：
- `api-response.ts` — `{ success, data, error?: {code, message} }`
- `api-context.ts` — 统一的 Request Context 类型
- `pagination.ts` — `{ page, pageSize, total, hasNext }`
- `errors.ts` — 错误码常量

### P1-4: 添加 ESLint 配置
创建 `.eslintrc.cjs` + `eslint.config.js`：
- `@typescript-eslint/recommended`
- `import/no-unused-modules` — 检测死代码
- `prefer-const` / `no-var` — 现代 JS
- `@typescript-eslint/strict` — 关闭 `noImplicitAny: false`

### P1-5: 添加 Prettier 配置
创建 `.prettierrc` + `.prettierignore`：
- 统一缩进（2 spaces）
- 统一引号（单引号）
- 统一分号（有分号）

### P1-6: 修复 tsconfig 路径别名
当前 `tsconfig.json` 只定义了 `@/*` → `./src/*`。需要补充：
- `$shared/*` → `./shared/*`
- `$packages/*` → `./packages/*`
- 或者统一用 `baseUrl` + 相对路径

---

## P2 可以延后（改进性维护）

### P2-1: 删除测试端点
`functions/api/ai_test_call.ts` 应在生产环境移除或严格限制。

### P2-2: API 目录规范化
目前 142 个文件全部散落在 `functions/api/` 下。建议创建统一入口路由文件，减少冷启动时间。

### P2-3: Migration 清理
部分 migration 重复定义表（prompts、permissions）。建议整理为纯净的最终 schema。

### P2-4: 测试框架统一
`tests/` 下有 .js、.ts、.cjs 混用。建议统一到 Vitest + .ts。

### P2-5: E2E 测试报告
`docs/` 下有 3 份测试报告（Beauty Production Test Report.md 等），应归档或移动至独立目录。

### P2-6: worker-configuration.d.ts 过大
该文件 551KB，应加入 `.gitignore` 或使用 `.gitattributes` 标记为可忽略。

---

## 实施计划

### 第一轮：P0 修复（1-2 小时）
1. 删除/迁移 `ai_test_call.ts` 中的失效导入
2. 为 `ai_test_call.ts` 添加 admin 权限保护
3. 建立统一的 API Context 类型
4. 创建标准 API 响应类型

### 第二轮：P1 建设（2-3 小时）
1. 创建 `packages/shared/errors/` 包
2. 创建 `packages/shared/logger/` 包
3. 创建 `packages/shared/types/` 包
4. 添加 ESLint + Prettier 配置
5. 生成代码规范文档

### 第三轮：审查与文档（1-2 小时）
1. 安全审查报告
2. 数据库审查报告
3. 测试策略文档
4. 最终稳定化报告

---

## 风险评估

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 修改 API 响应类型导致前端不兼容 | 中 | 高 | 保持向后兼容的响应结构 |
| 添加 ESLint 导致大量 lint 错误 | 高 | 低 | 先只启用 warning，逐步升级到 error |
| P0-1 失效导入修复后 ai_test_call.ts 仍可运行但功能变化 | 低 | 中 | 保留接口签名相同，仅更新 import 路径 |
