import type { MonitorServiceEnv } from "../../types";
import type { MetricRecord, ModuleName } from "../types";

export class MetricRepository {
  db: any;

  constructor(db: any) {
    this.db = db;
  }

  async recordMetric(metric) {
    const { metricName, value, level, module, requestId, userId, metadata } = metric;
    await this.db.prepare(
      "INSERT INTO system_metrics (metric_name, value, level, module, request_id, user_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(metricName, value, level || "info", module, requestId || "", userId || "", JSON.stringify(metadata || {})).run();
  }

  async getMetricsByName(metricName, days = 7) {
    const today = new Date();
    const startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    const whereClauses = [];
    const params = [];
    whereClauses.push("substr(created_at, 1, 10) >= ?");
    params.push(startDate.toISOString().slice(0, 10));
    whereClauses.push("substr(created_at, 1, 10) <= ?");
    params.push(today.toISOString().slice(0, 10));
    if (module) {
      whereClauses.push("module = ?");
      params.push(module);
    }
    const whereClause = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";
    const rows = await this.db.prepare(
      "SELECT substr(created_at,1,10) as date, AVG(value) as avgValue FROM system_metrics WHERE metric_name = ? " + whereClause + " GROUP by substr(created_at,1,10) ORDER by date ASC"
    ).bind(metricName, ...params).all();
    return rows.map(r => ({ date: r.date, value: Number(r.avgValue || 0) }));
  }

  async getLatestMetrics(limit = 100) {
    const rows = await this.db.prepare(
      "SELECT * FROM system_metrics ORDER BY created_at DESC LIMIT ?"
    ).bind(limit).all();
    return rows.map(r => ({
      id: r.id,
      metricName: r.metric_name,
      value: r.value,
      unit: r.unit,
      level: r.level,
      module: r.module,
      requestId: r.request_id,
      userId: r.user_id,
      metadata: r.metadata ? JSON.parse(r.metadata) : {},
      createdAt: new Date(r.created_at)
    }));
  }
}
