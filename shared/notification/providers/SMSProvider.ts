import type { Notification, NotificationProvider } from '../types';

export class SMSProvider implements NotificationProvider {
  name = 'sms';

  async send(notification: Notification, payload: Record<string, any>) {
    // Implementation would use SMS gateway
    return { success: true, message: 'SMS queued', channelId: this.name };
  }

  async preview(notification: Notification, payload: Record<string, any>): Promise<string> {
    return 'SMS preview content';
  }

  async validateConfig(): Promise<{ valid: boolean; errors: string[] }> {
    return { valid: true, errors: [] };
  }
}
