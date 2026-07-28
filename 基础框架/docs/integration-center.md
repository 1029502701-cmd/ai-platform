# Integration Center Guide

## Supported Connectors (9 services)

| Service | Connector Class | Environment Keys |
|---------|----------------|------------------|
| WeChat Mini Program | `WeChatMiniProgramConnector` | WECHAT_APP_ID, WECHAT_TOKEN |
| WeCom (企微) | `WecomConnector` | WECOM_CORP_ID, WECOM_WEBHOOK_KEY |
| Feishu (飞书) | `FeishuConnector` | FEISHU_APP_ID, FEISHU_TENANT_TOKEN |
| DingTalk (钉钉) | `DingTalkConnector` | DINGTALK_APP_KEY, DINGTALK_ACCESS_TOKEN |
| Slack | `SlackConnector` | SLACK_BOT_TOKEN |
| Discord | `DiscordConnector` | DISCORD_WEBHOOK_URL |
| Telegram | `TelegramConnector` | TELEGRAM_BOT_TOKEN |
| Email | `EmailConnector` | SMTP_HOST |
| Webhook | `WebhookConnector` | OUTBOUND_WEBHOOK_URL |

## Usage

```typescript
import { createConnector } from "../../connectors/base";

const connector = createConnector('feishu', context.env);
await connector.sendEvent('app.installed', { appId: 123 });
```

## Adding a New Connector

1. Extend `ConnectorBase`:
```typescript
export class MyConnector extends ConnectorBase {
  constructor(env?: Record<string, unknown>) {
    super('my-service', env);
  }
  // Implement all abstract methods
}
```

2. Add to factory in `createConnector()`:
```typescript
factories['myservice'] = MyConnector;
```

## Mini Program Support

- **WeChat Mini Program**: Full support with unified API surface
- **Alipay Mini Program**: Reserved slot (future)
- **H5**: Standard web interface

All platforms share the same `/api/marketplace/*` endpoints.