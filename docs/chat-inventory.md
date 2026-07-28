# AI Chat Code Inventory

**生成日期**: 2026-07-28  
**任务**: Task-Chat-001 - 将现有 AI Chat 功能整理接入平台插件架构

## 一、已有相关代码清单

### 1. 聊天页面组件

| 文件路径 | 大小 | 说明 |
|---------|------|------|
| src/pages/Chat.tsx | ~700 行 | 当前聊天页面，使用 React + TypeScript，依赖 AuthProvider 进行鉴权，登录后显示欢迎信息。目前内容为空，仅展示占位界面。 |

**可复用代码**:
- 鉴权逻辑：通过 useAuth store 获取当前用户信息
- 路由配置：src/config/routes.config.ts 已定义 /chat 路由，需要鉴权

**需要重构**:
- 当前页面仅为占位，需要替换为完整的聊天 UI
- 需要支持游客模式（当前强制登录）
- 需要对接新的 Chat Plugin API 端点

### 2. AI 聊天函数端点

| 文件路径 | 说明 |
|---------|------|
| unctions/api/ai/chat.ts | 现有 AI 聊天函数，支持游客/登录用户，通过 generateViaCore 调用 AI Core，获取 token 从 Authorization/x-guest-token/cookie 三个来源 |
| unctions/api/openapi/v1/chat.ts | OpenAPI v1 聊天端点，经过 equireOpenApiAuth 鉴权，调用 generateViaCore，记录调用用量 |

**可复用代码**:
- 鉴权逻辑：从多种来源提取 token，验证 session
- AI 调用：generateViaCore 已封装好，通过 AI Core 路由到指定 Provider
- 游客支持：x-guest-token 头部支持游客模式

**需要重构**:
- 端点路径不符合 Chat Plugin 规范（应为 /api/chat/send）
- OpenAPI 端点绑定的是 DeveloperService（开发者 API），不适用于普通用户聊天
- 需要集成 Token 计费（当前 OpenAPI 端点记录的是开发者用量）

### 3. AI Core 服务

| 文件路径 | 说明 |
|---------|------|
| shared/services/ai_core.ts | AI Core 的遗留包装器，调用 packages/ai-core 的 generateViaCore |
| packages/ai-core/src/ai.ts | AI Core 核心入口，提供 generateText、chat 等统一接口 |
| packages/ai-core/src/scenarios/index.ts | 场景管理，支持通过场景关键词（如 chat）加载默认模型、prompt 配置 |
| drizzle/0009_ai_scenarios.sql | i_scenarios 表，已支持存储场景配置 |

**可复用代码**:
- AI Core 已支持场景模式（scenario: "chat"），可通过注册场景获取默认模型和 prompt
- 所有 AI 请求必须经过 AI Core，禁止直接调用 OpenAI/DeepSeek
- model-router.ts 和 provider-router.ts 负责模型到 Provider 的路由

**需要重构**:
- 需要注册 chat 场景到 AI Core（检查 i_scenarios 表中是否有 chat 场景记录）
- Chat Plugin 应使用 i.chat() 或 i.generateText() 统一接口，而不是直接调用 generateViaCore

### 4. 数据库表结构

| 文件 | 表名 | 字段 | 说明 |
|------|------|------|------|
| drizzle/0001_initial.sql | conversations | id, user_id, 	itle, status, created_at, updated_at | 已有对话表，但缺少 model 字段 |
| drizzle/0001_initial.sql | messages | id, conversation_id, ole, content, provider, model, created_at | 已有消息表，但缺少 	okens 字段 |

**需要调整**:
- 任务要求表结构为：
  - chat_conversations: id, user_id, 	itle, model, created_at, updated_at
  - chat_messages: id, conversation_id, ole, content, 	okens, created_at
- 现有表使用 TEXT 为主键，SQLite/D1 习惯；任务要求可能是 INTEGER AUTO_INCREMENT
- 需要考虑向后兼容：现有 conversations 和 messages 表已被 Beauty 等其他功能使用

### 5. 鉴权体系

| 文件路径 | 说明 |
|---------|------|
| packages/auth/src/ | 完整的 auth 包，包含 uth.service.ts, session.ts, cookies.ts, wechat.ts, guest.ts |
| shared/auth/session.ts | 会话创建、验证逻辑，支持会话持久化到 DB 和 CACHE |
| shared/auth/usage.ts | 用户用量跟踪 |
| unctions/api/auth/ | WeChat 登录回调和登录端点 |

**可复用代码**:
- getSession() 验证 session 并返回 user.id
- guest.ts 支持游客登录（生成临时 token）
- WeChat 登录已集成

**需要适配**:
- Chat Plugin 需要兼容三种认证方式：游客 token、正式 session、wechat session
- 需要限制游客体验次数（现有系统有用量跟踪，但需扩展支持 chat 配额）

### 6. 计费系统

| 文件路径 | 说明 |
|---------|------|
| shared/billing/service.ts | BillingService.consume() 扣除 credits，grantQuota() 充值，checkQuota() 检查余额 |
| shared/billing/types.ts | 定义了 BillingTransaction 等类型 |
| drizzle/ | 已有 illing_transactions、illing_orders、wallets 表 |

**可复用代码**:
- BillingService.consume(env, { userId, amountCents, reason, metadata }) 已存在
- 事务扣款逻辑安全，支持余额检查和原子操作

**需要适配**:
- 需要根据 token 用量计算费用（已有 estimateCostFromRules 方法）
- 需要记录 	x_type = 'AI_CHAT' 的交易（现有代码用 consume 类型）

### 7. 消息存储和历史

| 文件路径 | 说明 |
|---------|------|
| shared/ai/rag_pipeline.ts | RAG 管道，涉及上下文管理 |
| shared/ai/knowledge_service.ts | 知识服务，与 prompt 和上下文相关 |

**需要实现**:
- ConversationService：管理对话生命周期（创建、归档、删除）
- MessageService：管理消息记录（追加、查询、分页）
- 需要支持查询对话历史（按 conversation_id 排序）

## 二、可复用代码总结

| 模块 | 可复用内容 | 备注 |
|-----|-----------|------|
| 鉴权 | packages/auth/session.ts、shared/auth/session.ts | 支持游客/微信/账号登录 |
| AI 调用 | packages/ai-core + shared/services/ai_core.ts | 必须经过 AI Core |
| 计费 | shared/billing/service.ts | 需设计 chat 扣费规则 |
| 数据库 | conversations、messages 表 | 需根据新需求调整 |
| 场景配置 | i_scenarios 表 | 需注册 chat 场景 |
| 路由 | /chat 路由已配置 | 在 outes.config.ts |

## 三、需要新建/重构的代码

### Chat Plugin 新文件（按任务要求）

`
plugins/chat/
├── manifest.ts          # 插件声明（根据 PluginManifest 规范）
├── routes/
│   └── chat.ts        # /api/chat/send 和 /api/chat/history 端点
├── services/
│   ├── ChatService.py     # 聊天业务逻辑（调用 AI Core + 计费）
│   ├── ConversationService.py # 对话管理（CRUD）
│   └── PromptService.py   # Prompt 模板管理
├── repositories/
│   ├── ConversationRepository.py # 对话数据访问
│   └── MessageRepository.py      # 消息数据访问
├── types/
│   └── chat.py           # 类型定义（Request/Response/Domain Models）
└── README.md             # 插件说明
`

### 数据库迁移

`
drizzle/xxxx_chat_system.sql
-- 如果需要，创建 chat_conversations / chat_messages 表
-- 或者复用 existing conversations/messages 表并添加 model/tokens 字段
`

### AI Core 场景注册

需要在 packages/ai-core/src/scenarios/ 或应用启动时注册 chat 场景：

`	s
registerScenario({
  scenarioKey: 'chat',
  name: 'AI 聊天',
  type: 'chat',
  defaultModelId: 'deepseek-chat',  // 或配置的默认模型
  systemPrompt: '你是一个 AI 助手...',
  maxTokens: 4096,
  temperature: 0.7,
});
`

## 四、依赖关系图

`
前端 (src/pages/Chat.tsx)
    ↓ POST /api/chat/send
Chat Plugin (plugins/chat/routes/chat.ts)
    ↓ 调用 user_id
    ├── Auth: 获取当前用户 (guest/real)
    ├── Billing: 检查配额/扣除 credits
    ├── AI Core: ai.execute({ scenario: 'chat', ... })
    └── Repository: 保存对话和消息
`

## 五、需要特别注意的事项

1. **China Network Compatibility**: 所有 AI 请求必须经过 AI Core，不能直连 OpenAI/DeepSeek 端点
2. **No Beauty Plugin Modification**: 不能修改 plugins/beauty/ 的任何代码
3. **Plugin Independence**: Chat Plugin 必须独立，不依赖具体 Provider 实现
4. **Backward Compatibility**: 现有 conversations/messages 表已被 Beauty 功能使用，迁移需小心
5. **Guest Support**: 游客需要配额限制（现有用量系统需扩展）
6. **Token Billing**: 需根据 token 用量计算并扣除 credits
