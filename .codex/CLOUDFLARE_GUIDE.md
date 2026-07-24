# Cloudflare 使用指南（CLOUDFLARE GUIDE）

## 一、推荐架构

```
Cloudflare Pages（前端 + 函数）
    ↓
Pages Functions（API 层 / 边缘函数）
    ↓
服务层（内部逻辑）
    ↓
D1 / KV / R2（存储层）
```

- 单一部署目标，Git push 即自动构建部署
- 前端静态资源通过 CDN 全球分发
- API 请求通过 Pages Functions 处理，零服务器管理
- 同域 API，无跨域问题

---

## 二、Pages Functions 组织方式

```
functions/
├── _middleware.ts              # 全局中间件
├── api/
│   ├── auth/
│   │   ├── register.ts         # POST /api/auth/register
│   │   ├── login.ts            # POST /api/auth/login
│   │   └── refresh.ts          # POST /api/auth/refresh
│   ├── user/
│   │   ├── [id].ts             # GET/PUT /api/user/:id
│   │   └── profile.ts          # GET /api/user/profile
│   ├── ai/
│   │   ├── chat.ts             # POST /api/ai/chat
│   │   └── queue.ts            # POST /api/ai/queue
│   ├── billing/
│   │   └── subscription.ts     # POST /api/billing/subscription
│   └── admin/
│       └── dashboard.ts        # GET /api/admin/dashboard
└── webhooks/
    └── payment.ts              # POST /webhooks/payment
```

---

## 三、最佳实践

### 保持函数精简
- Pages Functions 文件尽量 <30 行
- 一个文件只处理一个资源的 CRUD
- 复杂逻辑抽到服务层模块

### 使用中间件处理通用逻辑
- 全局中间件：请求 ID、耗时记录
- API 中间件：认证验证、输入校验
- 错误处理中间件：统一错误响应格式

### 统一响应格式
```typescript
// 成功响应
{ success: true, data: {...}, error: null, meta: { requestId, timestamp } }

// 错误响应
{ success: false, data: null, error: { code: "ERR_001", message: "描述" }, meta: {...} }
```

---

## 四、D1 使用指南

- 结构化数据放 D1（用户、对话、任务等）
- 每个表必须有明确的 PRIMARY KEY
- 外键和频繁查询的列必须建索引
- 永远使用参数化查询防止 SQL 注入
- 避免 SELECT *，只 SELECT 需要的列

### 配置
```toml
[d1_databases]
binding = "DB"
database_name = "ai-platform-db"
database_id = "xxx"
```

---

## 五、KV 使用指南

- 会话存储
- 功能开关（Feature Flags）
- 限流计数器
- API 响应缓存
- 分布式锁

### 注意事项
- 键值上限 10MB，不要存大对象
- 热路径中尽量减少读写次数
- 序列化/反序列化用 JSON.stringify/parse

### 配置
```toml
[kv_namespaces]
binding = "USER_CACHE"
id = "xxx"
```

---

## 六、R2 使用指南

- 用户上传的文件（图片、视频、文档）
- AI 生成内容（AI 图片、报告等）
- 备份和导出文件

### 最佳做法
- **使用预签名 URL**：浏览器直传到 R2，不经过服务器
- 不代理大文件通过服务器（浪费带宽）
- 不在 D1/KV 中存二进制数据

### 配置
```toml
[r2_buckets]
binding = "ASSETS_BUCKET"
bucket_name = "ai-platform-assets"
```

---

## 七、绑定（Bindings）管理

Pages Functions 通过 `event.context.cloudflare.env` 访问绑定：

```typescript
export async function POST({ request, context }: EventContext) {
  const db = context.cloudflare.env.DB;      // D1 数据库
  const cache = context.cloudflare.env.USER_CACHE;  // KV 命名空间
  const bucket = context.cloudflare.env.ASSETS_BUCKET;  // R2 Bucket
  const apiKey = context.cloudflare.env.OPENAI_API_KEY;  // 环境变量
}
```

---

## 八、部署策略

- **开发环境**：`npx wrangler pages dev ./dist`
- **生产部署**：`npx wrangler pages deploy ./dist --project-name=项目名`
- Git push 到 main 分支 → 自动触发构建和部署
- Preview 部署：每个 Pull Request 自动生成预览链接

---

## 九、缓存策略

| 资源类型 | Cache-Control |
|---------|---------------|
| HTML 页面 | no-cache, must-revalidate |
| JS/CSS 打包文件（带 hash） | public, max-age=31536000, immutable |
| 图片资源 | public, max-age=31536000, immutable |
| 认证相关 API | no-store |
| 普通列表 API | public, max-age=60（根据实际情况调整） |

---

## 十、安全配置

- SSL/TLS：Full (Strict)
- HSTS 启用
- WAF 规则配置（Cloudflare Dashboard）
- 应用层：限流、输入过滤、安全头

---

## 十一、国内网络兼容性建议

1. 所有 API 同域调用，不走外部域名
2. 利用 Cloudflare 上海/杭州 POP 节点
3. 预签名 URL 直传 R2，绕过服务器中转
4. 客户端实现重试 + 超时逻辑
5. 所有外部 AI 调用在服务端进行，不暴露在前端
6. 不引入任何第三方外部的字体/图标 CDN（全部本地打包）
