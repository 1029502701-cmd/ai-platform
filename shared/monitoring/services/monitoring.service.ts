import { MetricRepository } from "../repositories/metric.repository";
import { LogRepository } from "../repositories/log.repository";
import { AlertRepository } from "../repositories/alert.repository";
import { HealthRepository } from "../repositories/health.repository";
import type { 
  MetricRecord, 
  LogRecord, 
  AlertRecord, 
  HealthCheckResult,
  DashboardOverview,
  Severity,
  ModuleName
} from "../types";

// Available modules for monitoring
export const MONITORED_MODULES: ModuleName[] = [
  "ai_core", "workflow", "queue", "billing", "storage", 
  "plugin", "notification", "identity", "permission"
];

export class MonitoringService {
  private metricRepo: MetricRepository;
  private logRepo: LogRepository;
  private alertRepo: AlertRepository;
  private healthRepo: HealthRepository;

  constructor(db: any) {
    this.metricRepo = new MetricRepository(db);
    this.logRepo = new LogRepository(db);
    this.alertRepo = new AlertRepository(db);
    this.healthRepo = new HealthRepository(db);
  }

  // Record a metric
  async recordMetric(metric: Omit<MetricRecord, "metricName" | "value">): Promise<string> {
    await this.metricRepo.recordMetric({
      metricName: metric.metricName || "unknown",
      value: metric.value || 0,
      level: metric.level || "info",
      module: metric.module,
      requestId: metric.requestId,
      userId: metric.userId,
      metadata: metric.metadata
    });
    return "metric_" + Date.now();
  }

  // Record an event
  async recordEvent(eventType: string, details?: any, module: ModuleName = "unknown"): Promise<void> {
    await this.recordLog({
      level: "info",
      module,
      message: "Event: " + eventType,
      metadata: details,
      requestId: details && (details as any).requestId ? (details as any).requestId : undefined
    });
  }

  // Record a log entry
  async recordLog(log: Omit<LogRecord, "messageId">): Promise<string> {
    const messageId = await this.logRepo.recordLog(log);
    return messageId;
  }

  // Record an error
  async recordError(module: string, message: string, metadata?: any, requestId?: string): Promise<void> {
    await this.logRepo.recordError(module, message, metadata, requestId);
    // Optionally create an alert for critical errors
    if (metadata && (metadata as any).severity === "critical") {
      await this.createAlert({
        ruleName: "error_" + module,
        severity: "critical",
        module,
        message,
        details: metadata,
        relatedResourceId: requestId
      });
    }
  }

  // Health check for a component
  async healthCheck(checkName: string, module: ModuleName, checkFn: () => Promise<any>): Promise<HealthCheckResult> {
    try {
      const result = await checkFn();
      const healthResult: HealthCheckResult = {
        checkName,
        status: "pass",
        module,
        checkedAt: new Date(),
        details: result
      };
      await this.healthRepo.recordCheck(checkName, "pass", module, result);
      return healthResult;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const healthResult: HealthCheckResult = {
        checkName,
        status: "fail",
        module,
        checkedAt: new Date(),
        details: {},
        error_message: errorMsg
      };
      await this.healthRepo.recordCheck(checkName, "fail", module, {}, errorMsg);
      // Create an alert for failed checks
      await this.createAlert({
        ruleName: "health_" + checkName,
        severity: "critical",
        module,
        message: checkName + " check failed",
        details: { error: errorMsg },
        relatedResourceId: checkName
      });
      return healthResult;
    }
  }

  // Take a performance snapshot
  async snapshot(snapshotName: string, value: number, module: ModuleName, summary?: string, metadata?: any): Promise<void> {
    await this.metricRepo.recordMetric({
      metricName: snapshotName,
      value,
      unit: summary ? "units" : undefined,
      level: value > 100 ? "critical" : value > 80 ? "warning" : "info",
      module,
      metadata: { summary, ...metadata }
    });
  }

  // Query metrics over time
  async queryMetrics(metricName: string, options: { module?: string; days?: number }): Promise<Array<{ date: string; value: number }>> {
    return await this.metricRepo.getMetricsByName(metricName, options.module, options.days || 7);
  }

  // Query logs
  async queryLogs(options: { module?: string; level?: string; days?: number; limit?: number }): Promise<Array<any>> {
    return await this.logRepo.getLogs(options.limit || 50);
  }

  // Create an alert
  async createAlert(alert: Omit<AlertRecord, "id" | "alertId" | "createdAt">): Promise<string> {
    const alertId = await this.alertRepo.createAlert(alert);
    return alertId;
  }

  // Resolve an alert
  async resolveAlert(alertId: string, resolvedBy: string, details?: any): Promise<void> {
    await this.alertRepo.updateAlertStatus(alertId, "resolved", resolvedBy, new Date());
    // Also record a log about resolution
    await this.recordLog({
      level: "info",
      module: "alerts",
      message: "Alert " + alertId + " resolved by " + resolvedBy,
      details: { ...details, resolvedAt: new Date().toISOString() }
    });
  }

  // Get system overview for dashboard
  async getDashboardOverview(): Promise<DashboardOverview> {
    const now = new Date();
    
    // Check current health of all modules
    const healthStatus: Record<string, HealthStatus> = {};
    for (const module of MONITORED_MODULES) {
      const latest = await this.healthRepo.getLatestCheck(module + "_health");
      healthStatus[module] = latest ? (latest.status as HealthStatus) : "pass";
    }
    
    // Count active alerts
    const activeAlerts = (await this.alertRepo.getAlertsBySeverity(null)).filter(a => a.status === "active").length;
    
    return {
      timestamp: now,
      uptime: 0, // Would be calculated from actual uptime tracking
      activeModules: MONITORED_MODULES,
      systemHealth: healthStatus,
      activeAlerts: activeAlerts
    };
  }

  // Batch record multiple metrics
  async batchRecordMetrics(metrics: Array<Omit<MetricRecord, "metricName" | "value">>): Promise<void> {
    for (const metric of metrics) {
      await this.recordMetric(metric);
    }
  }
}
