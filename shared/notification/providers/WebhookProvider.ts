import type { Notification, NotificationProvider } from '../types';

export class WebhookProvider implements NotificationProvider {
  name = 'webhook';

  async send(notification: Notification, payload: Record<string, any>) {
    // Implementation would send HTTP webhook
    return { success: true, message: 'Webhook queued', channelId: this.name };
  }

  async preview(notification: Notification, payload: Record<string, any>): Promise<string> {
    return 'Webhook preview content';
  }

  async validateConfig(): Promise<{ valid: boolean; errors: string[] }> {
    return { valid: true, errors: [] };
  }
}
