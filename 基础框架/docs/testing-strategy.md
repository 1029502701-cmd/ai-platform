# 测试策略文档

> 生成日期: 2026-07-27
> 目标: 为项目建立统一的测试框架和覆盖策略

---

## 当前状态

| 指标 | 值 |
|------|-----|
| 总测试文件数 | 32 |
| TypeScript 测试 | ~12 |
| JavaScript 测试 | ~8 |
| CommonJS 测试 | ~10 |
| E2E 测试 | 1 (beauty_e2e.test.ts) |
| 覆盖率 | < 5%（估算） |
| 测试框架 | 无统一配置（散乱的 .js/.ts/.cjs 混用） |
| CI 中的测试运行 | GitHub Actions 存在但未集成测试步骤 |

### 现有测试文件清单

```
tests/
├── ai_core/run_tests.js          # AI Core 测试（CJS）
├── ai_core/run_tests.cjs         # AI Core 测试（CJS，重复）
├── auth_guest_wechat.test.js     # Guest + WeChat 认证
├── beauty_profile.test.js        # 美妆档案
├── beauty_profile.test.ts        # 美妆档案（TS 版）
├── beauty_report_ui.test.js      # 报告 UI 测试
├── beauty_report_ui.test.ts      # 报告 UI 测试（TS 版）
├── beauty_upload.test.js         # 图片上传
├── beauty_upload.test.ts         # 图片上传（TS 版）
├── billing.test.ts               # 计费测试
├── face_analysis_real.test.ts    # 真实人脸分析
├── subscription.test.ts          # 订阅测试
├── e2e/beauty_e2e.test.ts        # E2E 美妆流程
├── fixtures/sample.png           # 测试素材
├── queue/billing-queue.test.cjs  # 队列计费测试（CJS）
├── queue/concurrency.test.cjs    # 并发测试（CJS）
├── queue/full_test.cjs           # 完整测试（CJS）
├── queue/queue.test.cjs          # 队列基础测试（CJS）
├── queue/test_runner.cjs         # 测试运行器（CJS）
├── queue/worker-recovery.test.cjs # Worker 恢复测试（CJS）
├── stress_test.py                # Python 压力测试
└── _r2_emulator/*.png            # R2 模拟图片
```

### 问题发现
1. **大量 JS/TS 重复** — 每个功能都有 .js 和 .ts 两个版本
2. **混合 CommonJS** — queue 测试使用 .cjs，无法被标准 TS 测试框架引用
3. **无测试配置** — package.json 中 `test` 命令指向 `npm run test:unit`，但脚本不存在
4. **依赖缺失** — 无 jest/vitest、testing-library、supertest 等依赖

---

## 建议的测试架构

### 推荐方案: Vitest

Vitest 是 Vite 生态的原生测试框架，与当前项目技术栈完全兼容。

```json
// package.json devDependencies 新增
"vitest": "^1.0.0",
"@vitest/coverage-v8": "^1.0.0",
"happy-dom": "^14.0.0"
```

### 目录结构规划

```
tests/
├── unit/                     # 单元测试（已有部分）
│   ├── auth/                 #   认证模块测试
│   ├── billing/              #   计费模块测试
│   ├── ai-core/              #   AI Core 模块测试
│   └── shared/               #   共享工具测试
├── integration/              # 集成测试（新）
│   ├── api/                  #   API 端点集成
│   ├── database/             #   数据库操作
│   └── queue/                #   队列系统
├── e2e/                      # 端到端测试（已有）
│   ├── beauty-flow.spec.ts   #   美妆全流程
│   ├── auth-flow.spec.ts     #   认证流程
│   └── api-flow.spec.ts      #   API 调用流程
├── fixtures/                 # 测试数据
│   ├── sample.png
│   └── mock-data/
├── helpers/                  # 测试辅助
│   ├── test-db.ts            #   测试数据库实例
│   ├── mock-env.ts           #   Mock Cloudflare Env
│   └── api-client.ts         #   轻量 API 客户端
└── vitest.config.ts          # 测试配置
```

---

## 优先级与实施计划

### Phase 1: 基础框架搭建（第 1 周）

| 任务 | 描述 | 预计工时 |
|------|------|----------|
| 安装依赖 | vitest, @vitest/coverage-v8, happy-dom | 30 min |
| 创建配置 | vitest.config.ts + tsconfig 测试扩展 | 30 min |
| 清理重复 | 删除所有 .js 测试文件，只保留 .ts | 1 hour |
| 迁移 CJS | 将 .cjs 改为 .ts，移除 module.exports | 2 hours |
| 基础 Helper | test-db.ts, mock-env.ts | 2 hours |

### Phase 2: 核心业务测试（第 2-3 周）

| 测试类别 | 覆盖率目标 | 关键测试用例 |
|----------|-----------|--------------|
| Auth | 70% | Session 创建/撤销、WeChat OAuth 流程、RBAC 检查 |
| Billing | 80% | Wallet CRUD、consume/refund 幂等性、Plan 变更 |
| Queue | 60% | Task 提交/消费、重试逻辑、Lock |
| AI Core | 50% | Provider 路由、Model Config 解析 |

### Phase 3: 集成与 E2E（第 4 周）

| 测试类型 | 描述 | 预计工时 |
|----------|------|----------|
| API 集成 | 使用最小请求对象调用 handler，验证响应格式 | 4 hours |
| DB 集成 | 确保 migration 可正确应用到内存 SQLite | 2 hours |
| E2E 扩展 | 补充 auth-flow、api-flow 端到端测试 | 4 hours |

---

## 测试代码规范

### 命名约定
- 测试文件: `<module>.spec.ts` 或 `<module>.test.ts`
- 测试函数: `it('should ...')` 描述预期行为

### 结构模板
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MyService } from '@/services/my-service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService(mockDb);
  });

  it('should return correct balance for active user', async () => {
    // Arrange
    const userId = 'test-user-1';

    // Act
    const result = await service.getBalance(userId);

    // Assert
    expect(result).toBeDefined();
    expect(result.ok).toBe(true);
  });
});
```

### 断言风格
- 优先使用精确断言：`expect(x).toBe(expected)` 而非 `expect(x).toEqual({})`
- 异步操作使用 `await` + `expect(received).resolves.toBe()`

---

## CI 中的测试运行

```yaml
# .github/workflows/ci-cd.yml 新增
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test -- --coverage
```

---

## 测试覆盖目标

| 层级 | 目标覆盖率 | 说明 |
|------|-----------|------|
| packages/shared/errors/ | 90%+ | 基础工具包，高覆盖 |
| packages/shared/logger/ | 80%+ | 基础工具包 |
| packages/shared/types/ | N/A | 纯类型定义 |
| packages/auth/ | 80% | 安全核心，必须高覆盖 |
| packages/billing/ | 85% | 涉及金钱，必须严格 |
| packages/ai-core/ | 70% | 核心但复杂外部依赖 |
| packages/queue/ | 70% | 异步处理边界情况多 |
| functions/api/ | 60% | Handler 层快速通过 |
| src/ (前端) | 50% | React 组件测试 |
