# AI Core 模块文档

## 概述

packages/ai-core 是 AI SaaS 平台的统一 AI 调用核心层。它提供了：

- **统一的 i.generate() 接口** - 单文本生成
- **统一的 i.chat() 接口** - 多轮对话
- **Provider Router** - 根据模型配置路由到 OpenAI / DeepSeek / Mock
- **Scenario 管理** - 场景化默认模型和参数配置
- **统一 Response 类型** - 标准化的成功/失败响应结构

> **设计原则：** 只建立核心层，不修改 beauty、companion 等业务代码。
> 现有 shared/services/ 下的所有 AI 文件保持不变。

---

## 目录结构

`
packages/ai-core/
├── package.json
└── src/
    ├── index.ts                 # 统一导出入口
    ├── ai.ts                    # 核心统一接口 (ai.generate / ai.chat)
    ├── model-registry.ts        # 模型注册表 (DB/KV 加载)
    ├── provider-router.ts       # Provider 路由器
    └── providers/
    │   ├── base-provider.ts      # Provider 基类
    │   ├── mock-provider.ts      # Mock Provider
    │   ├── openai-provider.ts    # OpenAI Provider
    │   └── deepseek-provider.ts  # DeepSeek Provider
    ├── scenarios/
    │   └── index.ts              # Scenario 管理器
    └── types/
        ├── index.ts              # 全部类型定义
        └── requests.ts           # 请求构建辅助函数
`

---

## API 参考

### 1. ai.generate() — 文本生成

`	ypescript
import { generate } from '@ai-saas/ai-core';

// 方式一：指定 model ID
const result = await generate({
  prompt: '解释量子计算',
  model: 'gpt-4-turbo',
  userId: 'user_123',
});

if (result.ok) {
  console.log('内容:', result.content);
  console.log('用量:', result.usage);
} else {
  console.error('错误:', result.error, result.code);
}

// 方式二：使用 scenario
const result2 = await generate({
  prompt: '帮我写一段自我介绍',
  scenario: 'chat_default',
  options: {
    temperature: 0.8,
    maxTokens: 500,
  },
});
`

### 2. ai.chat() — 对话

`	ypescript
import { chat } from '@ai-saas/ai-core';

const result = await chat({
  messages: [
    { role: 'system', content: '你是一个专业的中文助手' },
    { role: 'user', content: '今天天气怎么样？' },
  ],
  model: 'deepseek-v4-flash',
  options: { temperature: 0.7 },
});
`

### 3. 统一响应类型

`	ypescript
// 成功时
interface AIGenerationResult {
  ok: true;
  content: string;
  model: string;         // 使用的模型ID
  provider: string;      // openai | deepseek | mock
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    model: string;
    provider: string;
  };
  requestId: string;
  timings: { duration: number };
  meta?: { scenario?: string; cached?: boolean };
}

// 失败时
interface AIErrorResponse {
  ok: false;
  error: string;
  code: string;          // MODEL_NOT_FOUND / PROVIDER_ERROR / RATE_LIMITED / TIMEOUT
  requestId: string;
  timings: { duration: number };
  details?: string;
}
`

### 4. Scenario 管理

`	ypescript
import { registerScenario, getScenario } from '@ai-saas/ai-core';

// 注册场景
registerScenario({
  scenarioKey: 'beauty_chat',
  name: '美容顾问对话',
  type: 'chat',
  defaultModelId: 'gpt-4-turbo',
  systemPrompt: '你是一个专业的美容顾问...',
  maxTokens: 1000,
  temperature: 0.9,
  enabled: true,
});

// 查询场景
const scenario = getScenario('beauty_chat');
`

### 5. Provider 管理

`	ypescript
import { registerProvider, getProvider } from '@ai-saas/ai-core';
import { BaseProvider } from '@ai-saas/ai-core';

// 注册自定义 Provider
class CustomProvider extends BaseProvider {
  constructor() { super('custom', 'Custom AI'); }
  async health() { return 'healthy' as const; }
  async generateText(req) { /* ... */ }
}

registerProvider('custom', new CustomProvider());
`

---

## 类型定义速查

| 类型 | 说明 |
|------|------|
| AITextRequest | 文本生成请求 |
| AIChatRequest | 对话请求 |
| AIGenerationOptions | 通用选项（temperature, maxTokens等） |
| AIResult<T> | 联合类型 = 成功响应 \| 错误响应 |
| ModelConfig | 模型配置（modelId, provider, priority等） |
| ScenarioDefinition | 场景定义（scenarioKey, defaultModelId等） |
| BaseProvider | Provider 抽象基类 |

---

## 新增表结构建议

为了支持 Scenario 管理，建议在 D1 中创建：

`sql
CREATE TABLE IF NOT EXISTS ai_scenarios (
  scenario_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'chat',
  default_model_id TEXT,
  allowed_models TEXT,
  system_prompt TEXT,
  max_tokens INTEGER,
  temperature REAL,
  variables_schema TEXT,
  enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_scenarios_enabled ON ai_scenarios(enabled);
`

---

## 与现有代码的关系

`
┌─────────────────────────────┐
│     packages/ai-core        │  ← 新建，统一核心层
│  ai.generate()  ai.chat()   │
└──────────┬──────────────────┘
           │ 替代/兼容
┌──────────▼──────────────────┐
│   shared/services/ai_core   │  ← 现有（保留不变）
│   generateViaCore()         │
└─────────────────────────────┘
`

现有 shared/services/ 下的文件保持原位不动。迁移阶段可采用双写策略：新功能走 packages/ai-core，旧代码继续用 shared/services。

---

## 迁移计划

### Phase A：引入新接口（当前阶段）
- [x] packages/ai-core 目录创建
- [x] Provider 基类 + Mock/OpenAI/DeepSeek 实现
- [x] Model Registry（从 D1/KV 加载模型）
- [x] Scenario Manager
- [x] 统一 generate() 和 chat() 接口
- [x] 统一 Response 类型
- [x] 文档 docs/ai-core.md

### Phase B：渐进迁移
- [ ] 在现有 API routes 中并行引入 i.generate()
- [ ] 对比新旧接口输出一致性
- [ ] 逐步将 unctions/api/ai/generate.ts 切换到新接口
- [ ] 逐步将 unctions/api/ai/chat.ts 切换到新接口

### Phase C：废弃旧层
- [ ] 确认所有调用方都切换完成后
- [ ] 标记 shared/services/ai_core.ts 为 deprecated
- [ ] 在新版本中移除旧实现

### 注意事项
1. 不删除任何现有文件
2. beauty/companion 业务代码不变
3. 新旧接口共存，通过 scenario 参数控制路由
4. Provider 接口统一后，后续新增 Claude/Gemini 只需添加 provider 类
