import type { Notification, NotificationChannel, NotificationStatus, Priority } from '../types';

export class NotificationModel {
  id: number;
  tenantId: number;
  userId: number;
  templateId: number \| null;
  triggerId: string \| null;
  notificationType: string \| null;
  channel: NotificationChannel;
  payload: Record<string, any>;
  status: NotificationStatus;
  priority: Priority;
  deliveryCount: number;
  nextSendAt: string \| null;
  scheduledBy: number \| null;
  sentAt: string \| null;
  failedAt: string \| null;
  errorMessage: string \| null;
  createdAt: string;
  updatedAt: string;

  constructor(data: Omit<Notification, 'id' \| 'createdAt' \| 'updatedAt'>) {
    this.templateId = data.templateId;
    this.triggerId = data.triggerId;
    this.notificationType = data.notificationType;
    this.channel = data.channel;
    this.payload = data.payload;
    this.status = data.status;
    this.priority = data.priority;
    this.deliveryCount = data.deliveryCount;
    this.nextSendAt = data.nextSendAt;
    this.scheduledBy = data.scheduledBy;
    this.sentAt = data.sentAt;
    this.failedAt = data.failedAt;
    this.errorMessage = data.errorMessage;
    this.createdAt = new Date().toISOString();
    this.updatedAt = this.createdAt;
  }

  static fromRow(row: any): NotificationModel {
    const model = new NotificationModel({
      userId: row.user_id,
      templateId: row.template_id || null,
      triggerId: row.trigger_id || null,
      notificationType: row.notification_type || null,
      channel: row.channel,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      status: row.status,
      priority: row.priority || 1,
      deliveryCount: row.delivery_count || 0,
      nextSendAt: row.next_send_at || null,
      scheduledBy: row.scheduled_by || null,
      sentAt: row.sent_at || null,
      failedAt: row.failed_at || null,
      errorMessage: row.error_message || null,
    });
    model.id = row.id;
    model.tenantId = row.tenant_id;
    model.updatedAt = row.updated_at || model.updatedAt;
    return model;
  }
}
