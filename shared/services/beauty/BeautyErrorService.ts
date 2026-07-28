import { D1Database } from "@cloudflare/workers-types";

export class BeautyErrorService {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  async recordError(userId: string | null, errorType: string, message: string, metadata = {}) {
    try {
      const errorId = "err_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      await this.db.prepare(
        "INSERT INTO beauty_errors (id, user_id, error_type, error_message, metadata_json) VALUES (?, ?, ?, ?, ?)"
      ).bind(
        errorId,
        userId || null,
        errorType,
        message,
        JSON.stringify(metadata)
      ).run();
    } catch (e) {
      console.warn("Error tracking failed:", errorType);
    }
  }

  async listErrors(userId?: string, limit = 50): Promise<Array<{id: string, errorType: string, message: string, createdAt: string}>> {
    const where = userId ? ["user_id = ?"] : [];
    const binds = userId ? [userId] : [];
    const sql = `SELECT id, error_type, error_message, created_at FROM beauty_errors ${where.length ? "WHERE " + where.join(" AND") : ""} ORDER BY created_at DESC LIMIT ?`;
    const results = await this.db.prepare(sql).bind(...binds, limit).all();
    return results.map(r => ({id: r.id, errorType: r.error_type, message: r.error_message, createdAt: r.created_at}));
  }

  async getErrorStats(): Promise<{total: number, byType: Record<string, number>}>> {
    try {
      const total = await this.db.prepare("SELECT COUNT(*) as c FROM beauty_errors").first();
      const typeResult = await this.db.prepare("SELECT error_type as t, COUNT(*) as c FROM beauty_errors GROUP BY error_type").all();
      const byType: any = {};
      typeResult.forEach(r => byType[r.t] = r.c);
      return { total: Number(total?.c || 0), byType };
    } catch (e) {
      return { total: 0, byType: {} };
    }
  }
}

export default BeautyErrorService;

