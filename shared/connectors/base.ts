/**
 * Connector Framework 鈥?unified interface for third-party integrations.
 */

export type ServiceType = 'wechat' | 'wecom' | 'feishu' | 'dingtalk' | 'slack' | 'discord' | 'telegram' | 'email' | 'webhook';

export abstract class ConnectorBase {
  protected service: ServiceType;
  protected env: Record<string, unknown>;

  constructor(service: ServiceType, env?: Record<string, unknown>) {
    this.service = service;
    this.env = env || {};
  }

  abstract connect(_config: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }>;
  abstract disconnect(): Promise<{ success: boolean }>;
  abstract fetchData(path: string, params?: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }>;
  abstract sendEvent(event: string, data: Record<string, unknown>): Promise<{ success: boolean; error?: string }>;
  abstract getHealth(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }>;

  protected getEnv(key: string): string | undefined {
    return (this.env as Record<string, string>)[key];
  }
}

/** --- Concrete Connectors --- */

export class WeChatMiniProgramConnector extends ConnectorBase {
  constructor(env?: Record<string, unknown>) { super('wechat', env); }
  async connect(_config: Record<string, unknown>): Promise<{ success: boolean }> {
    const appId = this.getEnv('WECHAT_APP_ID');
    if (!appId) return { success: false };
    return { success: true };
  }
  async disconnect(): Promise<{ success: boolean }> { return { success: true }; }
  async fetchData(path: string, params?: Record<string, unknown>): Promise<{ success: boolean; data?: unknown }> {
    return { success: true, data: {} };
  }
  async sendEvent(event: string, data: Record<string, unknown>): Promise<{ success: boolean }> {
    try {
      await fetch(`https://api.weixin.qq.com/cgi-bin/message/wxopenapikey/-send?access_token=${this.getEnv('WECHAT_TOKEN')}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, event }),
      });
      return { success: true };
    } catch { return { success: false }; }
  }
  async getHealth(): Promise<{ healthy: boolean }> { return { healthy: !!this.getEnv('WECHAT_APP_ID') }; }
}

export class WecomConnector extends ConnectorBase {
  constructor(env?: Record<string, unknown>) { super('wecom', env); }
  async connect(_config: Record<string, unknown>): Promise<{ success: boolean }> { return { success: !!this.getEnv('WECOM_CORP_ID') }; }
  async disconnect(): Promise<{ success: boolean }> { return { success: true }; }
  async fetchData(path: string, _params?: Record<string, unknown>): Promise<{ success: boolean; data?: unknown }> { return { success: true, data: {} }; }
  async sendEvent(event: string, data: Record<string, unknown>): Promise<{ success: boolean }> {
    try {
      await fetch(`https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${this.getEnv('WECOM_WEBHOOK_KEY')}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ msgtype: 'text', text: { content: `${event}: ${JSON.stringify(data)}` } }),
      });
      return { success: true };
    } catch { return { success: false }; }
  }
  async getHealth(): Promise<{ healthy: boolean }> { return { healthy: !!this.getEnv('WECOM_CORP_ID') }; }
}

export class FeishuConnector extends ConnectorBase {
  constructor(env?: Record<string, unknown>) { super('feishu', env); }
  async connect(_config: Record<string, unknown>): Promise<{ success: boolean }> { return { success: !!this.getEnv('FEISHU_APP_ID') }; }
  async disconnect(): Promise<{ success: boolean }> { return { success: true }; }
  async fetchData(path: string, _params?: Record<string, unknown>): Promise<{ success: boolean; data?: unknown }> { return { success: true, data: {} }; }
  async sendEvent(event: string, data: Record<string, unknown>): Promise<{ success: boolean }> {
    try {
      const token = this.getEnv('FEISHU_TENANT_TOKEN');
      await fetch(`https://open.feishu.cn/open-apis/bot/v2/hook/${this.getEnv('FEISHU_WEBHOOK_ID')}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ msg_type: 'interactive', card: { header: { title: { plain_text: event }, template: 'blue' }, elements: [{ tag: 'div', text: { content: JSON.stringify(data), tag: 'lark_md' } }] } }),
      });
      return { success: true };
    } catch { return { success: false }; }
  }
  async getHealth(): Promise<{ healthy: boolean }> { return { healthy: !!this.getEnv('FEISHU_APP_ID') }; }
}

export class SlackConnector extends ConnectorBase {
  constructor(env?: Record<string, unknown>) { super('slack', env); }
  async connect(_config: Record<string, unknown>): Promise<{ success: boolean }> { return { success: !!this.getEnv('SLACK_BOT_TOKEN') }; }
  async disconnect(): Promise<{ success: boolean }> { return { success: true }; }
  async fetchData(path: string, _params?: Record<string, unknown>): Promise<{ success: boolean; data?: unknown }> { return { success: true, data: {} }; }
  async sendEvent(event: string, data: Record<string, unknown>): Promise<{ success: boolean }> {
    try {
      await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.getEnv('SLACK_BOT_TOKEN')}` },
        body: JSON.stringify({ channel: data.channel, text: `[${event}] ${JSON.stringify(data)}` }),
      });
      return { success: true };
    } catch { return { success: false }; }
  }
  async getHealth(): Promise<{ healthy: boolean }> { return { healthy: !!this.getEnv('SLACK_BOT_TOKEN') }; }
}

export class DingTalkConnector extends ConnectorBase {
  constructor(env?: Record<string, unknown>) { super('dingtalk', env); }
  async connect(_config: Record<string, unknown>): Promise<{ success: boolean }> { return { success: !!this.getEnv('DINGTALK_APP_KEY') }; }
  async disconnect(): Promise<{ success: boolean }> { return { success: true }; }
  async fetchData(path: string, _params?: Record<string, unknown>): Promise<{ success: boolean; data?: unknown }> { return { success: true, data: {} }; }
  async sendEvent(event: string, data: Record<string, unknown>): Promise<{ success: boolean }> {
    try {
      const secret = this.getEnv('DINGTALK_APP_SECRET');
      await fetch(`https://oapi.dingtalk.com/robot/send?access_token=${this.getEnv('DINGTALK_ACCESS_TOKEN')}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ msgtype: 'markdown', markdown: { title: event, text: JSON.stringify(data) } }),
      });
      return { success: true };
    } catch { return { success: false }; }
  }
  async getHealth(): Promise<{ healthy: boolean }> { return { healthy: !!this.getEnv('DINGTALK_APP_KEY') }; }
}

export class TelegramConnector extends ConnectorBase {
  constructor(env?: Record<string, unknown>) { super('telegram', env); }
  async connect(_config: Record<string, unknown>): Promise<{ success: boolean }> { return { success: !!this.getEnv('TELEGRAM_BOT_TOKEN') }; }
  async disconnect(): Promise<{ success: boolean }> { return { success: true }; }
  async fetchData(path: string, _params?: Record<string, unknown>): Promise<{ success: boolean; data?: unknown }> { return { success: true, data: {} }; }
  async sendEvent(event: string, data: Record<string, unknown>): Promise<{ success: boolean }> {
    try {
      const token = this.getEnv('TELEGRAM_BOT_TOKEN');
      const chatId = data.chat_id || this.getEnv('TELEGRAM_DEFAULT_CHAT');
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: `[${event}] ${JSON.stringify(data)}` }),
      });
      return { success: true };
    } catch { return { success: false }; }
  }
  async getHealth(): Promise<{ healthy: boolean }> { return { healthy: !!this.getEnv('TELEGRAM_BOT_TOKEN') }; }
}

export class EmailConnector extends ConnectorBase {
  constructor(env?: Record<string, unknown>) { super('email', env); }
  async connect(_config: Record<string, unknown>): Promise<{ success: boolean }> { return { success: !!this.getEnv('SMTP_HOST') }; }
  async disconnect(): Promise<{ success: boolean }> { return { success: true }; }
  async fetchData(path: string, _params?: Record<string, unknown>): Promise<{ success: boolean; data?: unknown }> { return { success: true, data: {} }; }
  async sendEvent(event: string, data: Record<string, unknown>): Promise<{ success: boolean }> {
    // Email sending via SMTP 鈥?stubbed for Cloudflare Workers (would use SMTP tunnel or SendGrid API in production)
    return { success: true };
  }
  async getHealth(): Promise<{ healthy: boolean }> { return { healthy: !!this.getEnv('SMTP_HOST') }; }
}

export class WebhookConnector extends ConnectorBase {
  constructor(env?: Record<string, unknown>) { super('webhook', env); }
  async connect(_config: Record<string, unknown>): Promise<{ success: boolean }> { return { success: true }; }
  async disconnect(): Promise<{ success: boolean }> { return { success: true }; }
  async fetchData(path: string, _params?: Record<string, unknown>): Promise<{ success: boolean; data?: unknown }> {
    try {
      const resp = await fetch(path);
      return { success: resp.ok, data: await resp.json() };
    } catch { return { success: false }; }
  }
  async sendEvent(event: string, data: Record<string, unknown>): Promise<{ success: boolean }> {
    try {
      const url = this.getEnv('OUTBOUND_WEBHOOK_URL');
      if (!url) return { success: false };
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event, data }) });
      return { success: resp.ok };
    } catch { return { success: false }; }
  }
  async getHealth(): Promise<{ healthy: boolean }> { return { healthy: !!this.getEnv('OUTBOUND_WEBHOOK_URL') }; }
}

export class DiscordConnector extends ConnectorBase {
  constructor(env?: Record<string, unknown>) { super('discord', env); }
  async connect(_config: Record<string, unknown>): Promise<{ success: boolean }> { return { success: !!this.getEnv('DISCORD_WEBHOOK_URL') }; }
  async disconnect(): Promise<{ success: boolean }> { return { success: true }; }
  async fetchData(path: string, _params?: Record<string, unknown>): Promise<{ success: boolean; data?: unknown }> { return { success: true, data: {} }; }
  async sendEvent(event: string, data: Record<string, unknown>): Promise<{ success: boolean }> {
    try {
      const webhookUrl = this.getEnv('DISCORD_WEBHOOK_URL');
      await fetch(String(webhookUrl || ""),  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: `[${event}] ${JSON.stringify(data)}` }) });
      return { success: true };
    } catch { return { success: false }; }
  }
  async getHealth(): Promise<{ healthy: boolean }> { return { healthy: !!this.getEnv('DISCORD_WEBHOOK_URL') }; }
}

/** --- Factory --- */

export function createConnector(service: ServiceType, env?: Record<string, unknown>): ConnectorBase {
  const factories: Record<ServiceType, new (env?: Record<string, unknown>) => ConnectorBase> = {
    wechat: WeChatMiniProgramConnector, wecom: WecomConnector, feishu: FeishuConnector,
    dingtalk: DingTalkConnector, slack: SlackConnector, discord: DiscordConnector,
    telegram: TelegramConnector, email: EmailConnector, webhook: WebhookConnector,
  };
  const Ctor = factories[service];
  if (!Ctor) throw new Error(`Unknown connector service: ${service}`);
  return new Ctor(env);
}


