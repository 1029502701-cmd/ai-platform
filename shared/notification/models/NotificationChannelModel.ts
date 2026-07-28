import type { NotificationChannel } from '../types';

export class NotificationChannelModel {
  id: number;
  channelName: NotificationChannel;
  displayName: string;
  icon: string;
  config: Record<string, any>;
  isEnabled: boolean;
  weight: number;
  createdAt: string;
  updatedAt: string;

  constructor(data: Omit<NotificationChannelConfig, 'channelId' \| 'createdAt' \| 'updatedAt'>) {
    this.channelName = data.channelId as NotificationChannel;
    this.displayName = data.displayName;
    this.icon = data.icon;
    this.config = data.config;
    this.isEnabled = data.isEnabled;
    this.weight = data.weight;
    this.createdAt = new Date().toISOString();
    this.updatedAt = this.createdAt;
  }

  static fromRow(row: any): NotificationChannelModel {
    const model = new NotificationChannelModel({
      channelName: row.channel_name as NotificationChannel,
      displayName: row.display_name,
      icon: row.icon || '🔔',
      config: row.config ? (typeof row.config === 'string' ? JSON.parse(row.config) : row.config) : {},
      isEnabled: !!row.is_enabled,
      weight: row.weight || 0,
    });
    model.id = row.id;
    model.updatedAt = row.updated_at || model.updatedAt;
    return model;
  }
}
