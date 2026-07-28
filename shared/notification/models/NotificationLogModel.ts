import type { NotificationChannel, LogStatus } from '../types';

export class NotificationLogModel {
  id: number;
  notificationId: number;
  tenantId: number;
  channel: NotificationChannel;
  attemptNumber: number;
  status: LogStatus;
  payloadSent: string \| null;
  responseReceived: string \| null;
  errorDetails: string \| null;
  startedAt: string \| null;
  completedAt: string \| null;
  createdAt: string;

  constructor(data: Omit<NotificationLog, 'id' \| 'createdAt'>) {
    this.notificationId = data.notificationId;
    this.tenantId = data.tenantId;
    this.channel = data.channel;
    this.attemptNumber = data.attemptNumber;
    this.status = data.status;
    this.payloadSent = data.payloadSent;
    this.responseReceived = data.responseReceived;
    this.errorDetails = data.errorDetails;
    this.createdAt = new Date().toISOString();
  }

  static fromRow(row: any): NotificationLogModel {
    const model = new NotificationLogModel({
      notificationId: row.notification_id,
      tenantId: row.tenant_id,
      channel: row.channel,
      attemptNumber: row.attempt_number || 1,
      status: row.status,
      payloadSent: row.payload_sent || null,
      responseReceived: row.response_received || null,
      errorDetails: row.error_details || null,
    });
    model.id = row.id;
    model.startedAt = row.started_at || null;
    model.completedAt = row.completed_at || null;
    return model;
  }
}
