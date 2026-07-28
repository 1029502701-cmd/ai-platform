export type Severity = "warning" | "critical" | "fatal" | "recovery";
export type AlertStatus = "active" | "resolved" | "acknowledged";
export type HealthStatus = "pass" | "fail" | "warning";

export interface MetricRecord {
  metricName: string;
  value: number;
  unit?: string;
  level?: "info" | "warning" | "critical";
  module: string;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface LogRecord {
  messageId: string;
  level: "debug" | "info" | "warn" | "error";
  module: string;
  message: string;
  metadata?: Record<string, any>;
  requestId?: string;
}

export type DashboardType = "overview" | "api" | "queue" | "workflow" | "billing" | "plugin" | "notification" | "storage";

export interface DashboardOverview {
  timestamp: Date;
  uptime: number;
  activeModules: string[];
  systemHealth: Record<string, HealthStatus>;
  activeAlerts: number;
}

export interface HealthCheckResult {
  checkName: string;
  status: HealthStatus;
  module: string;
  checkedAt: Date;
  details?: Record<string, any>;
}

export interface AlertRecord {
  alertId: string;
  ruleName: string;
  severity: Severity;
  status: AlertStatus;
  module: string;
  message: string;
  details?: Record<string, any>;
  relatedResourceId?: string;
  thresholdValue?: number;
  currentValue?: number;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface PerformanceSnapshot {
  snapshotName: string;
  value: number;
  unit?: string;
  module: string;
  summary?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const MODULES = ["ai_core", "workflow", "queue", "billing", "storage", "plugin", "notification", "identity", "permission"] as const;
export type ModuleName = typeof MODULES[number];

export interface MonitorServiceEnv { [key: string]: any };
