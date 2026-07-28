import type { LogRecord } from "../types";

export class LogRepository {
  db: any;

  constructor(db: any) {
    this.db = db;
  }

  async recordLog(log) {
    const messageId = "log_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    const { level, module, message, metadata, requestId } = log;
    await this.db.prepare(
      "INSERT INTO system_logs (request_id, level, module, message, metadata) VALUES (?, ?, ?, ?, ?)"
    ).bind(requestId || "", level || "", module || "", message || "", JSON.stringify(metadata || {})).run();
    return messageId;
  }

  async recordError(module, message, metadata, requestId) {
    await this.recordLog({
      level: "error",
      module,
      message,
      metadata,
      requestId
    });
  }

  async getLogs(count = 50) {
    const rows = await this.db.prepare(
      "SELECT * FROM system_logs ORDER BY created_at DESC LIMIT ?"
    ).bind(count).all();
    return rows;
  }

  async cleanupOldLogs(daysToKeep = 30) {
    const result = await this.db.prepare(
      "DELETE FROM system_logs WHERE created_at < datetime(\"now\", \"-\" || ? || \" days\")"
    ).bind(daysToKeep).run();
    return result.changes || 0;
  }
}
