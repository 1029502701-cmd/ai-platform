import type { AlertRecord, Severity, AlertStatus } from "../types";

export class AlertRepository {
  db: any;

  constructor(db: any) {
    this.db = db;
  }

  async createAlert(alert: Omit<AlertRecord, "id" | "alertId" | "createdAt">): Promise<string> {
    const alertId = "alert_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    const { ruleName, severity, module, message, details, relatedResourceId, thresholdValue, currentValue } = alert;
    await this.db.prepare(
      "INSERT INTO system_alerts (alert_id, rule_name, severity, status, module, message, details, related_resource_id, threshold_value, current_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(alertId, ruleName, severity || "warning", "active", module, message, details ? JSON.stringify(details) : null, relatedResourceId || null, thresholdValue, currentValue).run();
    return alertId;
  }

  async updateAlertStatus(alertId: string, status: AlertStatus, resolvedBy?: string, resolvedAt?: Date): Promise<void> {
    if (status === "resolved") {
      await this.db.prepare(
        "UPDATE system_alerts SET status = ?, resolved_at = ?, resolved_by = ? WHERE alert_id = ?"
      ).bind(status, resolvedAt || new Date().toISOString(), resolvedBy || "", alertId).run();
    } else {
      await this.db.prepare(
        "UPDATE system_alerts SET status = ? WHERE alert_id = ?"
      ).bind(status, alertId).run();
    }
  }

  async getAlertsBySeverity(severity: Severity | null = null): Promise<Array<AlertRecord>> {
    let query = "SELECT * FROM system_alerts WHERE status = 'active'";
    const params: any[] = [];
    if (severity) {
      query += " AND severity = ?";
      params.push(severity);
    }
    query += " ORDER BY created_at DESC";
    const rows = await this.db.prepare(query).bind(...params).all();
    return rows.map(r => ({
      id: r.id,
      alertId: r.alert_id,
      ruleName: r.rule_name,
      severity: r.severity,
      status: r.status,
      module: r.module,
      message: r.message,
      details: r.details ? JSON.parse(r.details) : {},
      relatedResourceId: r.related_resource_id,
      thresholdValue: r.threshold_value,
      currentValue: r.current_value,
      createdAt: new Date(r.created_at),
      resolvedAt: r.resolved_at ? new Date(r.resolved_at) : undefined,
      resolvedBy: r.resolved_by
    }));
  }

  async getAlertCountByStatus(): Promise<Record<AlertStatus, number>> {
    const rows = await this.db.prepare(
      "SELECT status, COUNT(*) as count FROM system_alerts GROUP BY status"
    ).all();
    const statusCount: Record<AlertStatus, number> = { active: 0, resolved: 0, acknowledged: 0 };
    for (const r of rows) {
      if (statusCount[r.status] !== undefined) {
        statusCount[r.status] = Number(r.count);
      }
    }
    return statusCount;
  }

  async getAlertHistory(days: number = 30): Promise<Array<any>> {
    const rows = await this.db.prepare(
      "SELECT * FROM system_alerts WHERE created_at >= datetime(? , '-' || ? || ' days') ORDER BY created_at DESC"
    ).bind("now", days).all();
    return rows;
  }
}
