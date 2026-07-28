import { type HealthCheckResult, HealthStatus } from "../types";

export class HealthRepository {
  db: any;

  constructor(db: any) {
    this.db = db;
  }

  async recordCheck(checkName: string, status: HealthStatus, module: string, details?: any, errorMessage?: string): Promise<void> {
    await this.db.prepare(
      "INSERT INTO health_checks (check_name, status, module, details, error_message, checked_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(checkName, status, module, details ? JSON.stringify(details) : null, errorMessage || null, new Date().toISOString()).run();
  }

  async getLatestCheck(checkName: string): Promise<any | null> {
    const row = await this.db.prepare(
      "SELECT * FROM health_checks WHERE check_name = ? ORDER BY checked_at DESC LIMIT 1"
    ).bind(checkName).first();
    return row ? { ...row, checkedAt: new Date(row.checked_at) } : null;
  }

  async getAllChecks(limit: number = 100): Promise<Array<any>> {
    const rows = await this.db.prepare(
      "SELECT * FROM health_checks ORDER BY checked_at DESC LIMIT ?"
    ).bind(limit).all();
    return rows.map(r => ({ ...r, checkedAt: new Date(r.checked_at) }));
  }

  async getModuleHealthStatus(module: string): Promise<Record<string, HealthStatus>> {
    const results: Record<string, HealthStatus> = {};
    const checks = await this.db.prepare(
      "SELECT check_name, status FROM health_checks WHERE module = ? ORDER BY checked_at DESC"
    ).bind(module).all();
    
    const latestMap = new Map<string, any>();
    for (const c of checks) {
      if (!latestMap.has(c.check_name)) {
        latestMap.set(c.check_name, c);
      }
    }
    for (const [checkName, check] of latestMap) {
      results[checkName] = check.status;
    }
    return results;
  }

  async getStatusSummary(): Promise<Record<string, number>> {
    const rows = await this.db.prepare(
      "SELECT status, COUNT(*) as count FROM health_checks GROUP BY status"
    ).all();
    const summary: Record<string, number> = { pass: 0, fail: 0, warning: 0 };
    for (const r of rows) {
      if (summary[r.status] !== undefined) {
        summary[r.status] = Number(r.count);
      }
    }
    return summary;
  }

  async cleanupOldChecks(daysToKeep: number = 30): Promise<number> {
    const result = await this.db.prepare(
      "DELETE FROM health_checks WHERE checked_at < datetime(? , '-' || ? || ' days')"
    ).bind("now", daysToKeep).run();
    return result.changes || 0;
  }
}
