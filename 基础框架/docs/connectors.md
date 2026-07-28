# Connector Framework Guide

## Supported Services

| Service | Description |
|---------|-------------|
| WeChat Mini Program | Official WeChat app |
| WeCom (企微) | Enterprise WeChat |
| Feishu (飞书) | Lark/Feishu collaboration |
| DingTalk (钉钉) | Alibaba DingTalk |
| Slack | Team messaging |
| Discord | Community chat |
| Telegram | Messenger |
| Email | SMTP/email sending |
| Webhook | Generic HTTP callbacks |

## Usage

```typescript
import { createConnector } from "../../connectors/base";

const slack = createConnector('slack', {
  SLACK_BOT_TOKEN: env.SLACK_BOT_TOKEN,
});

await slack.sendEvent('app.installed', { appId: 123 });
```

## Health Check

```typescript
const health = await slack.getHealth();
// { healthy: true/false, error?: string }
```

## Adding a New Connector

1. Extend `ConnectorBase` class
2. Implement abstract methods (connect, disconnect, fetchData, sendEvent, getHealth)
3. Add to factory mapping in `createConnector()`