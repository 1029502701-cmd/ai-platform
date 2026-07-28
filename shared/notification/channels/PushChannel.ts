import type { NotificationProvider } from '../types';

export class PushChannel {
  static readonly name = 'push';
  static readonly displayName = '推送通知';
  static readonly icon = '📲';

  static buildPayload(notification: Notification, payload: Record<string, any>): Record<string, any> {
    return {
      title: notification.payload.title || 'New Notification',
      body: notification.payload.body || '',
      data: payload,
      userId: notification.userId,
    };
  }
}
