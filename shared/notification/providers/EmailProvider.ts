import type { Notification, NotificationProvider } from '../types';

export class EmailProvider implements NotificationProvider {
  name = 'email';

  async send(notification: Notification, payload: Record<string, any>) {
    // Implementation would use SMTP or email service
    return { success: true, message: 'Email queued', channelId: this.name };
  }

  async preview(notification: Notification, payload: Record<string, any>): Promise<string> {
    return 'Email preview content';
  }

  async validateConfig(): Promise<{ valid: boolean; errors: string[] }> {
    return { valid: true, errors: [] };
  }
}
