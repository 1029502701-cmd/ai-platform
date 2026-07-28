# Chat Plugin Integration Documentation

**Task**: Task-Chat-001 - Integrate Existing AI Chat into Platform Plugin Architecture  
**Date**: 2026-07-28  
**Author**: Sapiens AI

---

## 1. 架构概览

Chat Plugin 遵循平台插件架构标准，通过标准化的 PluginManifest 定义插件能力、权限和路由。所有 AI 请求经过 AI Core 路由到指定 Provider，实现与平台其他插件的解耦。

`
前端 (/chat)
  ↓ (POST /api/chat/send)
Chat Plugin (routes/chat.ts)
  ├─ 鉴权：读取 user_id (guest/real/wechat)
  ├─ 配额检查：调用 BillingService
  ├─ AI Core: ai.execute({ scenario: "chat", ... })
  ├─ 持久化：ConversationRepository / MessageRepository
  └─ 事件：conversation.created, message.sent, chat.completed
`

## 2. API 设计

### 2.1 发送聊天消息

**Endpoint**: POST /api/chat/send

**请求体**:
`json
{
  "conversationId": "string | null",
  "message": "string",
  "model": "string (optional)",
  "temperature": "number (optional)",
  "maxTokens": "number (optional)"
}
`

**响应成功** (200):
`json
{
  "success": true,
  "data": {
    "message": "AI 回复内容",
    "usage": {
      "inputTokens": 123,
      "outputTokens": 456,
      "totalTokens": 579
    },
    "conversationId": "string",
    "modelUsed": "deepseek-chat",
    "timestamp": "2026-07-28T10:00:00Z"
  }
}
`

**响应错误** (401/400/500):
`json
{
  "success": false,
  "error": "错误信息"
}
`

### 2.2 获取对话历史

**Endpoint**: GET /api/chat/history/:id

**响应**:
`json
{
  "success": true,
  "data": {
    "conversation": {
      "id": "string",
      "userId": "string",
      "title": "string | null",
      "model": "string",
      "status": "active | archived | deleted",
      "messageCount": 10,
      "lastMessageAt": "2026-07-28T10:00:00Z",
      "createdAt": "2026-07-28T09:00:00Z",
      "updatedAt": "2026-07-28T10:00:00Z"
    },
    "messages": [
      {
        "id": "string",
        "conversationId": "string",
        "role": "user | assistant",
        "content": "消息内容",
        "tokens": 10,
        "createdAt": "2026-07-28T09:00:00Z"
      }
    ],
    "hasMore": false
  }
}
`

### 2.3 列出对话

**Endpoint**: GET /api/chat/conversations

**响应**:
`json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "string",
        "userId": "string",
        "title": "string | null",
        "model": "string",
        "status": "active",
        "messageCount": 5,
        "lastMessageAt": "2026-07-28T10:00:00Z",
        "createdAt": "2026-07-28T09:00:00Z",
        "updatedAt": "2026-07-28T10:00:00Z"
      }
    ],
    "hasMore": false
  }
}
`

## 3. 数据库设计

### 3.1 表结构

复用现有数据库表，通过迁移添加缺失字段：

**conversations** (已存在，已添加 model 列):
- id (TEXT PK)
- user_id (TEXT FK → users.id)
- title (TEXT)
- model (TEXT) - 新增
- status (TEXT: active/archived/deleted)
- created_at (TEXT)
- updated_at (TEXT)

**messages** (已存在，已添加 tokens 列):
- id (TEXT PK)
- conversation_id (TEXT FK → conversations.id)
- role (TEXT: system/user/assistant/tool)
- content (TEXT)
- model (TEXT) - 已存在
- tokens (INTEGER) - 新增
- created_at (TEXT)

### 3.2 视图兼容层

为保持向后兼容性，创建视图：
`sql
CREATE VIEW IF NOT EXISTS chat_conversations AS SELECT * FROM conversations;
CREATE VIEW IF NOT EXISTS chat_messages AS SELECT * FROM messages;
`

## 4. AI Core 集成

### 4.1 场景注册

Chat Plugin 使用 AI Core 的 chat 场景。需要在平台启动时注册该场景：

`	s
import { registerScenario } from '../../../packages/ai-core/src/scenarios/index';

registerScenario({
  scenarioKey: 'chat',
  name: 'AI 聊天',
  type: 'chat',
  defaultModelId: 'deepseek-chat', // 可配置的默认模型
  systemPrompt: '你是一个 helpful assistant，用中文回答用户问题。',
  maxTokens: 4096,
  temperature: 0.7,
  enabled: true,
});
`

场景配置也可通过 i_scenarios 数据库表动态加载。

### 4.2 调用流程

1. Chat Plugin 调用 i.generateText() 或 i.chat()
2. AI Core 解析场景配置，确定模型和参数
3. Model Router 将模型路由到对应的 Provider
4. Provider 执行实际 AI 生成
5. 返回结果包含 usage 信息（tokens）

**重要**: 所有 AI 请求必须经过 AI Core，禁止在插件内部直接调用 OpenAI/DeepSeek。

## 5. 账号体系接入

### 5.1 用户身份识别

Chat Plugin 支持三种认证方式：

| 方式 | Token 来源 | user_id 格式 | 配额限制 |
|------|-----------|-------------|---------|
| 游客 | x-guest-token 头部或 Cookie | guest:{uuid} | 体验次数限制 |
| 正式用户 | Cookie / Authorization Bearer | 用户 ID (TEXT) | 套餐余额扣除 |
| WeChat | WeChat 会话 | 微信 UnionID | 套餐余额扣除 |

### 5.2 游客体验限制

通过 shared/auth/guest.ts 生成和验证游客 token。建议实现：
- 每个游客 token 限制 N 次聊天体验
- TTL 过期后自动失效
- 登录后自动合并对话历史

## 6. Token 计费集成

### 6.1 计费流程

1. 用户发送消息前，Chat Plugin 估算输入 token 数
2. 调用 BillingService.consume() 扣除积分
3. 调用 AI Core 生成回复
4. 成功后输出 token 记入消息记录
5. 失败时退款并删除用户消息

### 6.2 计费记录

所有聊天消耗记录在 illing_transactions 表：
- 	x_type: 'consume'
- eason: 'AI_CHAT'
- metadata: JSON 包含 conversationId、inputTokens、outputTokens、model 等信息

### 6.3 费率配置

可在 shared/billing/rules.ts 中配置 chat 场景的费率规则，例如：
- input: .0001 / 1000 tokens
- output: .0003 / 1000 tokens

## 7. 前端整合

### 7.1 路由配置

src/config/routes.config.ts 已包含 /chat 路由，需要鉴权。

### 7.2 页面改造

原 src/pages/Chat.tsx 需改造为：
- 使用平台统一的 AI 聊天 UI 组件
- 通过 /api/chat/send POST 发送消息
- 通过 /api/chat/history/:id GET 加载对话历史
- 支持游客模式（显示游客输入框或提示登录）
- 登录后自动同步历史对话

### 7.3 鉴权集成

使用 useAuth Store 获取当前用户状态：
- 未登录：可切换游客模式或跳转登录
- 游客：显示体验次数剩余
- 已登录：显示用户昵称和积分余额

## 8. 文件清单

### 插件文件

`
plugins/chat/
├── manifest.ts          # PluginManifest 定义 (已完成)
├── README.md            # 插件说明
├── types/chat.ts        # 类型定义
├── routes/chat.ts       # API 端点 (待实现)
├── services/
│   ├── ChatService.ts   # 核心聊天逻辑 (待实现)
│   ├── ConversationService.ts # 对话管理 (待实现)
│   └── PromptService.ts # Prompt 模板管理 (待实现)
└── repositories/
    ├── ConversationRepository.ts # 数据访问 (待实现)
    └── MessageRepository.ts      # 消息数据访问 (待实现)
`

### 数据库迁移

`
drizzle/20260728_chat_system.sql   # 添加 model/tokens 列
`

### 文档

`
docs/chat-inventory.md             # 代码盘点 (已完成)
docs/chat-plugin-integration.md    # 集成文档 (本文件)
`

## 9. 后续扩展

- 支持对话分享和公开链接
- 支持消息流式输出
- 支持多轮对话上下文记忆
- 支持 Attachment 上传和 RAG 查询
- 支持 Admin 端对话审计和监控
- 支持模型切换下拉菜单
- 支持温度、max_tokens 等参数调整

## 10. 测试清单

- [ ] 游客聊天 (无登录)
- [ ] 登录用户聊天
- [ ] 对话历史加载
- [ ] AI Core 调用成功
- [ ] Token 正确扣除
- [ ] 余额不足时拒绝
- [ ] AI 失败时退款
- [ ] 对话归档功能
- [ ] 多用户隔离验证
