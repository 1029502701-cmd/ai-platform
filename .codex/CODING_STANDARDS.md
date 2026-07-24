# 编码规范（CODING STANDARDS）

## 一、命名规范

### 文件与文件夹
- **TypeScript 文件**：camelCase.ts（如 auth.service.ts、user.profile.ts）
- **组件文件**：PascalCase.tsx（如 ChatInput.tsx、MessageList.tsx）
- **测试文件**：同名 + .test.ts 后缀（如 auth.service.test.ts）
- **类型/接口文件**：PascalCase + .types.ts（如 user.types.ts）
- **常量文件**：camelCase + .constants.ts（如 api.constants.ts）
- **文件夹**：kebab-case（如 ai-services/、user-profile/、payment-integration/）

### 变量与函数
- **变量**：camelCase（userName、requestCount）
- **函数**：camelCase，动词开头（getUserById()、processImage()）
- **常量**：UPPER_SNAKE_CASE（MAX_RETRIES、API_TIMEOUT_MS）
- **类**：PascalCase（AuthService、PromptEngine）
- **接口**：PascalCase（User、IAuditLog）
- **类型**：PascalCase（UserRole、ApiResponse）
- **私有成员**：_前缀（_internalState）
- **枚举值**：PascalCase（UserStatus.Active）

### 数据库
- **表名**：snake_case 复数（users、ai_jobs、knowledge_base）
- **列名**：snake_case（created_at、user_id、job_status）
- **索引名**：idx_表_列（idx_users_email）
- **外键**：引用表_id 格式（user_id、conversation_id）

---

## 二、文件组织结构

```
项目根目录/
├── functions/              # Pages Functions（API 路由）
│   ├── api/               # API 端点处理器
│   │   ├── auth/          # 认证相关端点
│   │   ├── user/          # 用户相关端点
│   │   ├── ai/            # AI 服务端点
│   │   ├── billing/       # 计费端点
│   │   └── admin/         # 管理端点
│   ├── webhooks/          # Webhook 处理器
│   └── _middleware.ts     # 全局中间件
├── src/                   # 前端源码
│   ├── components/        # React 组件（按功能组织）
│   │   ├── ui/            # 共享 UI 基础组件
│   │   ├── layout/        # 布局组件
│   │   └── common/        # 跨应用共享组件
│   ├── hooks/             # 自定义 React Hooks
│   ├── services/          # API 客户端服务
│   ├── stores/            # 状态管理
│   ├── utils/             # 工具函数
│   ├── types/             # TypeScript 类型定义
│   ├── config/            # 配置文件
│   ├── assets/            # 静态资源
│   └── styles/            # 全局样式
├── drizzle/               # 数据库 Schema 和迁移
├── public/                # 公共静态文件
├── tests/                 # 测试文件
├── docs/                  # 文档
└── scripts/               # 构建/开发脚本
```

---

## 三、文件大小限制

| 文件类型 | 最大行数 | 建议拆分线 |
|---------|---------|-----------|
| TypeScript 模块 | 300 行 | 超过 200 行考虑拆分 |
| React 组件 | 200 行 | 超过 150 行考虑拆分 |
| API 处理器文件 | 150 行 | 只处理一个资源 |
| 测试文件 | 400 行 | 按测试套件分组 |
| 工具模块 | 250 行 | 提取逻辑分组 |

---

## 四、函数大小限制

| 函数类型 | 最大行数 | 参数上限 | 嵌套深度 |
|---------|---------|---------|---------|
| 任意函数 | 50 行 | 最多 5 个 | 最多 3 层 |
| API 处理器 | 30 行 | 最多 2 个 | 最多 2 层 |
| 纯工具函数 | 40 行 | 最多 6 个 | 最多 2 层 |

**设计原则**：一个函数只做一件事；优先使用提前返回减少嵌套。

---

## 五、注释

- **解释为什么，不解释做什么** — 代码本身应该表达做了什么；注释解释为什么这么做
- **复杂算法必须有注释**
- **使用 `// TODO:` 标注待办事项**
- **使用 `// FIXME:` 标注已知问题**
- **导出的函数必须用 JSDoc 注释**

---

## 六、错误处理

- 永远不要静默吞掉错误
- 错误信息包含上下文
- 使用结构化的错误类型
- 区分预期错误和非预期错误

**错误层级示例**：
```
AppError (基类)
├── AuthenticationError（401）
├── NotFoundError（404）
├── ValidationError（400）
├── NetworkError（503/502，可重试标记）
└── PermissionError（403）
```

---

## 七、日志

| 级别 | 用途 | 示例 |
|------|------|------|
| DEBUG | 开发调试 | 请求负载详情 |
| INFO | 正常运行事件 | 用户登录、任务创建 |
| WARN | 可恢复的问题 | 触发重试、已弃用功能 |
| ERROR | 需要关注的失败 | API 调用失败、数据库错误 |
| CRITICAL | 系统级故障 | 安全入侵、数据损坏 |

**规则**：绝不记录敏感数据（密码、令牌、个人隐私信息）；必须包含 requestId 以便追踪。

---

## 八、测试

| 类型 | 位置 | 覆盖率目标 |
|------|------|-----------|
| 单元测试 | 同目录 .test.ts | 业务逻辑 80%+ |
| 集成测试 | tests/integration/ | 关键 API 流程 |
| E2E 测试 | tests/e2e/ | 核心用户路径 |

**测试命名规范**：
```typescript
describe("UserService", () => {
  it("应该用有效凭据创建新用户", async () => {...});
  it("应该拒绝重复的邮箱地址", async () => {...});
});
```

---

## 九、性能要求

- 页面 LCP < 2.5s（国内目标）
- API p95 延迟 < 500ms
- 打包体积尽可能小
- 懒加载非关键组件
- D1 查询必须走索引
- KV 操作不在热路径中频繁读写

---

## 十、安全要求

- 所有用户输入在服务端验证和过滤
- 防止 SQL 注入（使用参数化查询）
- 防止 XSS（内容过滤）
- HTTPS 强制启用
- 密钥存储在 Cloudflare 环境变量中
- 文件上传验证类型、大小和内容

---

## 十一、可维护性

- 严格模式 TypeScript（`strict: true`）
- 禁止使用 `any` 类型
- 魔数/字符串提取为命名常量
- 模块间松耦合、高内聚
- 重构时保持已有行为不变
