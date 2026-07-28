import type { DB } from 'drizzle-orm';
import type { Notification, NotificationChannel, NotificationStatus, Priority } from '../types';
import { NotificationModel } from '../models/NotificationModel';

export interface NotificationRepository {
  create(notification: Omit<Notification, 'id' \| 'createdAt' \| 'updatedAt'>): Promise<number>;
  findById(id: number): Promise<Notification \| null>;
  findByUserIdAndChannel(userId: number, channel: NotificationChannel, limit?: number, offset?: number): Promise<Notification[]>;
  update(id: number, updates: Partial<Omit<Notification, 'id'>>): Promise<void>;
  updateStatus(id: number, status: NotificationStatus): Promise<void>;
  markAsSent(id: number, sentAt: string, payload: Record<string, any>): Promise<void>;
  markAsFailed(id: number, failedAt: string, errorMessage: string): Promise<void>;
  increaseDeliveryCount(id: number): Promise<void>;
  setNextSendAt(id: number, nextSendAt: string \| null): Promise<void>;
  listByUserId(userId: number, limit?: number, offset?: number, status?: NotificationStatus): Promise<Notification[]>;
  listByTenantAndStatus(tenantId: number, status: NotificationStatus, limit?: number): Promise<Notification[]>;
  listByChannel(channel: NotificationChannel, limit?: number): Promise<Notification[]>;
  listForScheduled(tenantId: number, now: string): Promise<Notification[]>;
  delete(id: number): Promise<void>;
  hasPendingNotifications(userId: number): Promise<boolean>;
  getUnreadCount(userId: number): Promise<number>;
}

export class DrystoneNotificationRepository implements NotificationRepository {
  private db: any;
  private tenantId: number;

  constructor(db: any, tenantId: number) {
    this.db = db;
    this.tenantId = tenantId;
  }

  async create(notification: Omit<Notification, 'id' \| 'createdAt' \| 'updatedAt'>): Promise<number> {
    const result = await this.db.prepare(
      'INSERT INTO notifications (tenant_id, user_id, template_id, trigger_id, notification_type, channel, payload, status, priority, delivery_count, next_send_at, scheduled_by) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      notification.tenantId,
      notification.userId,
      notification.templateId,
      notification.triggerId,
      notification.notificationType,
      notification.channel,
      typeof notification.payload === 'object' ? JSON.stringify(notification.payload) : notification.payload,
      notification.status,
      notification.priority,
      notification.deliveryCount,
      notification.nextSendAt,
      notification.scheduledBy
    );
    return result.lastInsertRowid as number;
  }

  async findById(id: number): Promise<Notification \| null> {
    const row = await this.db.prepare(
      'SELECT * FROM notifications WHERE tenant_id = ? AND id = ?'
    ).bind(this.tenantId, id).first();
    return row ? NotificationModel.fromRow(row) : null;
  }

  async findByUserIdAndChannel(userId: number, channel: NotificationChannel, limit = 50, offset = 0): Promise<Notification[]> {
    const rows = await this.db.prepare(
      'SELECT * FROM notifications WHERE tenant_id = ? AND user_id = ? AND channel = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(this.tenantId, userId, channel, limit, offset).all();
    return rows.map(row => NotificationModel.fromRow(row));
  }

  async update(id: number, updates: Partial<Omit<Notification, 'id'>>) {
    const setParts: string[] = [];
    const params: any[] = [];
    
    if (updates.payload !== undefined) {
      setParts.push('payload = ?');
      params.push(typeof updates.payload === 'object' ? JSON.stringify(updates.payload) : updates.payload);
    }
    if (updates.status !== undefined) {
      setParts.push('status = ?');
      params.push(updates.status);
    }
    if (updates.sentAt !== undefined) {
      setParts.push('sent_at = ?');
      params.push(updates.sentAt);
    }
    if (updates.failedAt !== undefined) {
      setParts.push('failed_at = ?');
      params.push(updates.failedAt);
    }
    if (updates.errorMessage !== undefined) {
      setParts.push('error_message = ?');
      params.push(updates.errorMessage);
    }
    if (updates.nextSendAt !== undefined) {
      setParts.push('next_send_at = ?');
      params.push(updates.nextSendAt);
    }
    if (updates.deliveryCount !== undefined) {
      setParts.push('delivery_count = ?');
      params.push(updates.deliveryCount);
    }

    if (setParts.length === 0) return;

    const sql = \UPDATE notifications SET \ WHERE id = ? AND tenant_id = ?\;
    await this.db.prepare(sql).run(...params, id, this.tenantId);
  }

  async updateStatus(id: number, status: NotificationStatus): Promise<void> {
    await this.update({ status });
  }

  async markAsSent(id: number, sentAt: string, payload: Record<string, any>): Promise<void> {
    await this.db.prepare(
      'UPDATE notifications SET sent_at = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?'
    ).run(sentAt, 'sent', id, this.tenantId);
  }

  async markAsFailed(id: number, failedAt: string, errorMessage: string): Promise<void> {
    await this.db.prepare(
      'UPDATE notifications SET failed_at = ?, error_message = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?'
    ).run(failedAt, errorMessage, 'failed', id, this.tenantId);
  }

  async increaseDeliveryCount(id: number): Promise<void> {
    await this.db.prepare(
      'UPDATE notifications SET delivery_count = delivery_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?'
    ).run(id, this.tenantId);
  }

  async setNextSendAt(id: number, nextSendAt: string \| null): Promise<void> {
    await this.db.prepare(
      'UPDATE notifications SET next_send_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?'
    ).run(nextSendAt, id, this.tenantId);
  }

  async listByUserId(userId: number, limit = 50, offset = 0, status?: NotificationStatus): Promise<Notification[]> {
    let sql = 'SELECT * FROM notifications WHERE tenant_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const params: any[] = [this.tenantId, userId, limit, offset];
    
    if (status) {
      sql = sql.replace('WHERE ', 'status = ? AND ');
      params.unshift(status);
    }
    
    const rows = await this.db.prepare(sql).all(...params);
    return rows.map(row => NotificationModel.fromRow(row));
  }

  async listByTenantAndStatus(tenantId: number, status: NotificationStatus, limit = 50): Promise<Notification[]> {
    const sql = 'SELECT * FROM notifications WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC LIMIT ?';
    const rows = await this.db.prepare(sql).all(tenantId, status, limit);
    return rows.map(row => {
      const model = NotificationModel.fromRow(row);
      model.tenantId = tenantId;
      return model;
    });
  }

  async listByChannel(channel: NotificationChannel, limit = 50): Promise<Notification[]> {
    const sql = 'SELECT * FROM notifications WHERE tenant_id = ? AND channel = ? ORDER BY created_at DESC LIMIT ?';
    const rows = await this.db.prepare(sql).bind(this.tenantId, channel, limit).all();
    return rows.map(row => NotificationModel.fromRow(row));
  }

  async listForScheduled(tenantId: number, now: string): Promise<Notification[]> {
    const sql = 'SELECT * FROM notifications WHERE tenant_id = ? AND status = ? AND next_send_at <= ? AND (scheduled_by IS NOT NULL OR 1) ORDER BY next_send_at ASC LIMIT 100';
    const rows = await this.db.prepare(sql).all(tenantId, 'pending', now);
    return rows.map(row => {
      const model = NotificationModel.fromRow(row);
      model.tenantId = tenantId;
      return model;
    });
  }

  async delete(id: number): Promise<void> {
    await this.db.prepare('DELETE FROM notifications WHERE id = ? AND tenant_id = ?').run(id, this.tenantId);
  }

  async hasPendingNotifications(userId: number): Promise<boolean> {
    const row = await this.db.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE tenant_id = ? AND user_id = ? AND status = ?'
    ).bind(this.tenantId, userId, 'pending').first();
    return (row?.count || 0) > 0;
  }

  async getUnreadCount(userId: number): Promise<number> {
    // Note: is_read column would need to be added to notifications table for full implementation
    return 0;
  }
}
