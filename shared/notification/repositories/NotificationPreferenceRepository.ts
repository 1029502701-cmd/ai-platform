import type { NotificationPreference } from '../types';
import { NotificationPreferenceModel } from '../models/NotificationPreferenceModel';

export interface NotificationPreferenceRepository {
  get(tenantId: number, userId: number, channel: NotificationChannel, notificationType?: string): NotificationPreference \| null;
  update(tenantId: number, userId: number, channel: NotificationChannel, updates: Partial<Omit<NotificationPreference, 'id' \| 'createdAt'>>): Promise<void>;
  enableChannel(tenantId: number, userId: number, channel: NotificationChannel): Promise<void>;
  disableChannel(tenantId: number, userId: number, channel: NotificationChannel): Promise<void>;
  listByUser(tenantId: number, userId: number): NotificationPreference[];
  listEnabledForChannel(tenantId: number, channel: NotificationChannel, userId?: number): NotificationPreference[];
}

export class DrystonePreferenceRepository implements NotificationPreferenceRepository {
  private db: any;
  private tenantId: number;

  constructor(db: any, tenantId: number) {
    this.db = db;
    this.tenantId = tenantId;
  }

  async get(tenantId: number, userId: number, channel: NotificationChannel, notificationType?: string): Promise<NotificationPreference \| null> {
    let sql = 'SELECT * FROM notification_preferences WHERE tenant_id = ? AND user_id = ? AND channel = ?';
    const params: any[] = [tenantId, userId, channel];
    if (notificationType) {
      sql += ' AND notification_type = ?';
      params.push(notificationType);
    }
    const row = await this.db.prepare(sql).first(...params);
    return row ? NotificationPreferenceModel.fromRow(row) : null;
  }

  async update(tenantId: number, userId: number, channel: NotificationChannel, updates: Partial<Omit<NotificationPreference, 'id' \| 'createdAt'>>) {
    const setParts: string[] = [];
    const params: any[] = [];
    
    if (updates.enabled !== undefined) { setParts.push('enabled = ?'); params.push(updates.enabled ? 1 : 0); }
    if (updates.soundEnabled !== undefined) { setParts.push('sound_enabled = ?'); params.push(updates.soundEnabled ? 1 : 0); }
    if (updates.notificationType !== undefined) { setParts.push('notification_type = ?'); params.push(updates.notificationType); }
    if (updates.updatedAt !== undefined) { setParts.push('updated_at = ?'); params.push(updates.updatedAt); }

    if (setParts.length === 0) return;

    const sql = \UPDATE notification_preferences SET \ WHERE tenant_id = ? AND user_id = ? AND channel = ? AND notification_type = ?\;
    await this.db.prepare(sql).run(...params, tenantId, userId, channel, updates.notificationType || null);
  }

  async enableChannel(tenantId: number, userId: number, channel: NotificationChannel): Promise<void> {
    await this.db.prepare(
      'INSERT OR REPLACE INTO notification_preferences (tenant_id, user_id, channel, enabled, sound_enabled, notification_type, updated_at) ' +
      'VALUES (?, ?, ?, 1, 1, ?, CURRENT_TIMESTAMP)'
    ).run(tenantId, userId, channel, null);
  }

  async disableChannel(tenantId: number, userId: number, channel: NotificationChannel): Promise<void> {
    await this.db.prepare(
      'UPDATE notification_preferences SET enabled = 0, updated_at = CURRENT_TIMESTAMP ' +
      'WHERE tenant_id = ? AND user_id = ? AND channel = ?'
    ).run(tenantId, userId, channel);
  }

  async listByUser(tenantId: number, userId: number): NotificationPreferenceModel[] {
    const sql = 'SELECT * FROM notification_preferences WHERE tenant_id = ? AND user_id = ? ORDER BY channel';
    const rows = await this.db.prepare(sql).all(tenantId, userId);
    return rows.map(row => {
      const model = NotificationPreferenceModel.fromRow(row);
      model.tenantId = tenantId;
      return model;
    });
  }

  async listEnabledForChannel(tenantId: number, channel: NotificationChannel, userId?: number): NotificationPreferenceModel[] {
    let sql = 'SELECT * FROM notification_preferences WHERE tenant_id = ? AND channel = ? AND enabled = 1';
    const params: any[] = [tenantId, channel];
    if (userId !== undefined) {
      sql += ' AND user_id = ?';
      params.push(userId);
    }
    const rows = await this.db.prepare(sql).all(...params);
    return rows.map(row => {
      const model = NotificationPreferenceModel.fromRow(row);
      model.tenantId = tenantId;
      return model;
    });
  }
}
