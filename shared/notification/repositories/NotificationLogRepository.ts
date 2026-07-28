import type { NotificationLog } from '../types';
import { NotificationLogModel } from '../models/NotificationLogModel';

export interface NotificationLogRepository {
  create(log: Omit<NotificationLog, 'id' \| 'createdAt'>): Promise<void>;
  listByNotificationId(notificationId: number): NotificationLog[];
  listByChannel(channel: NotificationChannel, limit?: number): NotificationLog[];
  listByStatus(status: LogStatus, limit?: number): NotificationLog[];
  countAttempts(notificationId: number): number;
}

export class DrystoneLogRepository implements NotificationLogRepository {
  private db: any;
  private tenantId: number;

  constructor(db: any, tenantId: number) {
    this.db = db;
    this.tenantId = tenantId;
  }

  async create(log: Omit<NotificationLog, 'id' \| 'createdAt'>): Promise<void> {
    await this.db.prepare(
      'INSERT INTO notification_logs (notification_id, tenant_id, channel, attempt_number, status, payload_sent, response_received, error_details, started_at, completed_at) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      log.notificationId,
      log.tenantId,
      log.channel,
      log.attemptNumber,
      log.status,
      log.payloadSent,
      log.responseReceived,
      log.errorDetails,
      log.startedAt,
      log.completedAt
    );
  }

  async listByNotificationId(notificationId: number): NotificationLogModel[] {
    const sql = 'SELECT * FROM notification_logs WHERE notification_id = ? ORDER BY attempt_number ASC';
    const rows = await this.db.prepare(sql).all(notificationId);
    return rows.map(row => {
      const model = NotificationLogModel.fromRow(row);
      model.tenantId = this.tenantId;
      return model;
    });
  }

  async listByChannel(channel: NotificationChannel, limit?: number): NotificationLogModel[] {
    const sql = limit ? 'SELECT * FROM notification_logs WHERE tenant_id = ? AND channel = ? LIMIT ?' : 'SELECT * FROM notification_logs WHERE tenant_id = ? AND channel = ?';
    const rows = limit ? await this.db.prepare(sql).all(this.tenantId, channel, limit) : await this.db.prepare(sql).all(this.tenantId, channel);
    return rows.map(row => {
      const model = NotificationLogModel.fromRow(row);
      model.tenantId = this.tenantId;
      return model;
    });
  }

  async listByStatus(status: LogStatus, limit?: number): NotificationLogModel[] {
    const sql = limit ? 'SELECT * FROM notification_logs WHERE tenant_id = ? AND status = ? LIMIT ?' : 'SELECT * FROM notification_logs WHERE tenant_id = ? AND status = ?';
    const rows = limit ? await this.db.prepare(sql).all(this.tenantId, status, limit) : await this.db.prepare(sql).all(this.tenantId, status);
    return rows.map(row => {
      const model = NotificationLogModel.fromRow(row);
      model.tenantId = this.tenantId;
      return model;
    });
  }

  countAttempts(notificationId: number): number {
    // This would require async DB access in a real implementation
    return 0;
  }
}
