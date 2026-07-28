import type { NotificationProvider } from '../types';

export class WebhookChannel {
  static readonly name = 'webhook';
  static readonly displayName = 'Webhook';
  static readonly icon = '🌐';

  static buildPayload(notification: Notification, payload: Record<string, any>): Record<string, any> {
    return {
      notificationId: notification.id,
      channel: notification.channel,
      type: notification.notificationType,
      payload: payload,
      userId: notification.userId,
      tenantId: notification.tenantId,
      createdAt: notification.createdAt,
    };
  }
}
