import { getLogger } from "../logger";

const log = getLogger("notification_service");

export type NotificationType = 'system' | 'app_install' | 'plugin_update' | 'order' | 'payment' | 'notification' | 'warning' | 'error';
export type DeliveryMethod = 'in-app' | 'email' | 'webhook' | 'wecom' | 'feishu' | 'slack';

interface NotificationRow {
  id: number; user_id: number; tenant_id: number; type: string; title: string; body?: string; metadata_json: string; is_read: number; created_at: string;
}

/**
 * Notification Service — stores and delivers notifications to users.
 */
export class NotificationService {
  static async send(env: any, params: { userId: number; type: NotificationType; title: string; body?: string; metadata?: Record<string, unknown>; deliveries?: DeliveryMethod[] }): Promise<{ success: boolean; error?: string }> {
    const { userId, type, title, body, metadata = {}, deliveries = ['in-app'] } = params;
    const db = env?.DB;
    if (!db?.prepare) return { success: false, error: 'No database available' };
    try {
      await db.prepare("INSERT INTO notifications (user_id, type, title, body, metadata_json) VALUES (?, ?, ?, ?, ?)").run(userId, type, title, body || '', JSON.stringify(metadata));
      for (const method of deliveries) { if (method === 'in-app') continue; try { await this.deliverViaChannel(method, env, { userId, type, title, body, metadata }); } catch { /* notification storage must not break */ } }
      return { success: true };
    } catch (e: any) {
      log.error("Failed to send notification", { userId, type, error: e.message });
      return { success: false, error: e.message };
    }
  }

  static async markAsRead(env: any, notifId: number): Promise<boolean> {
    const db = env?.DB;
    if (!db?.prepare) return false;
    await db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").run(notifId);
    return true;
  }

  static async getUnreadCount(env: any, userId: number): Promise<number> {
    const db = env?.DB;
    if (!db?.prepare) return 0;
    const row: any = await db.prepare("SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0").bind(userId).first();
    return row?.count || 0;
  }

  static async getUserNotifications(env: any, userId: number, limit = 50, offset = 0): Promise<NotificationRow[]> {
    const db = env?.DB;
    if (!db?.prepare) return [];
    const rows: any[] = await db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?").bind(userId, limit, offset).all();
    return rows || [];
  }

  private static async deliverViaChannel(_method: DeliveryMethod, _env: any, _data: any): Promise<void> {
    switch (_method) {
      case 'email': log.info(`[email] would deliver: ${_data.title}`); break;
      case 'wecom': log.info(`[wecom] would deliver: ${_data.title}`); break;
      case 'feishu': log.info(`[feishu] would deliver: ${_data.title}`); break;
      case 'slack': log.info(`[slack] would deliver: ${_data.title}`); break;
      default: break;
    }
  }
}