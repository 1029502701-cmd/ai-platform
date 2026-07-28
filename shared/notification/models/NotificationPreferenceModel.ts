import type { NotificationChannel } from '../types';

export class NotificationPreferenceModel {
  id: number;
  tenantId: number;
  userId: number;
  channel: NotificationChannel;
  enabled: boolean;
  soundEnabled: boolean;
  notificationType: string \| null;
  createdAt: string;
  updatedAt: string;

  constructor(data: Omit<NotificationPreference, 'id' \| 'createdAt' \| 'updatedAt'>) {
    this.userId = data.userId;
    this.channel = data.channel;
    this.enabled = data.enabled;
    this.soundEnabled = data.soundEnabled;
    this.notificationType = data.notificationType;
    this.tenantId = data.tenantId;
    this.createdAt = new Date().toISOString();
    this.updatedAt = this.createdAt;
  }

  static fromRow(row: any): NotificationPreferenceModel {
    const model = new NotificationPreferenceModel({
      tenantId: row.tenant_id,
      userId: row.user_id,
      channel: row.channel,
      enabled: !!row.enabled,
      soundEnabled: !!row.sound_enabled,
      notificationType: row.notification_type || null,
    });
    model.id = row.id;
    model.updatedAt = row.updated_at || model.updatedAt;
    return model;
  }
}
