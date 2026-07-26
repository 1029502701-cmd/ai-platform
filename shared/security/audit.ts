import { getLogger } from "../logger";
import { redactFields } from "./types.ts";

const log = getLogger("audit");

/**
 * Central audit logging service.
 */
export class AuditService {
  static async record(env: any, entry: Record<string, any>): Promise<void> {
    try {
      const db = env?.DB;
      if (db?.prepare) {
        const actorId = String(entry.actorId || 'system');
        const action = (entry.action || '').replace(/[^a-zA-Z0-9._-]/g, '_');
        const resource = (entry.resource || '').replace(/[^a-zA-Z0-9._-]/g, '_');
        const beforeStr = entry.before ? JSON.stringify(redactFields(entry.before)) : null;
        const afterStr = entry.after ? JSON.stringify(redactFields(entry.after)) : null;
        const metaStr = JSON.stringify({
          actorId, action, resource,
          before: beforeStr, after: afterStr,
          ip: this.redactIP(entry.ip),
          userId: entry.userId,
        });

        await db.prepare(
          "INSERT INTO system_logs (request_id, level, module, message, metadata) VALUES (?, '" + "'info'" + "', '" + "'audit'" + "', ?, ?)"
        ).bind(entry.requestId || crypto.randomUUID(), "action=" + action + " resource=" + resource + " actor=" + actorId, metaStr).run();
      }
    } catch (e) {
      log.error("Audit log failed", { error: String(e) });
    }
    log.info("AUDIT", { actorId: entry.actorId, action: entry.action, resource: entry.resource, ip: this.redactIP(entry.ip) });
  }

  private static redactIP(ip?: string): string {
    if (!ip) return '';
    const parts = ip.split('.');
    if (parts.length === 4) return parts.slice(0, 2).join('.') + '.***.***';
    return ip.substring(0, 8) + ':***';
  }

  static async getLogs(env: any): Promise<any[]> {
    const db = env?.DB;
    if (!db?.prepare) return [];
    const rows: any[] = await db.prepare(
      "SELECT id, request_id, metadata, created_at FROM system_logs WHERE module = '" + "'audit'" + "' ORDER BY created_at DESC LIMIT 100"
    ).all();
    return rows || [];
  }
}