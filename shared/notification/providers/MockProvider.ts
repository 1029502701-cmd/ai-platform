import type { Notification, NotificationProvider } from '../types';

export class MockProvider implements NotificationProvider {
  name = 'mock';

  async send(notification: Notification, payload: Record<string, any>) {
    return { success: true, message: 'Mock delivery', channelId: this.name };
  }

  async preview(notification: Notification, payload: Record<string, any>): Promise<string> {
    return \Preview for \: \\;
  }

  async validateConfig(): Promise<{ valid: boolean; errors: string[] }> {
    return { valid: true, errors: [] };
  }
}
