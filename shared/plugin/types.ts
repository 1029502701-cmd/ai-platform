/**
 * Plugin Manifest - Unified plugin definition standard
 */

export enum PluginStatus {
  INSTALLED = "installed",
  ENABLED = "enabled",
  DISABLED = "disabled",
  UNINSTALLING = "uninstalling",
}

export enum PluginCapabilityType {
  ANALYSIS = "analysis",
  CHAT = "chat",
  GENERATE = "generate",
  STORAGE = "storage",
  BILLING = "billing",
  QUEUE = "queue",
  CONNECTOR = "connector",
  PROVIDER = "provider",
  WORKFLOW = "workflow",
  ADMIN = "admin",
}

export interface PluginBilling {
  model: "free" | "tiered" | "subscription" | "credit-based";
  tiers?: { name: string; limit: number; price: number; }[];
  creditRates?: Record<string, number>;
}

export interface PluginEvent {
  name: string;
  description: string;
  schema?: Record<string, unknown>;
}

export interface PluginRoute {
  path: string;
  handler: string;
  requiredPermissions?: string[];
  requireAuth?: boolean;
}

export interface PluginMetric {
  name: string;
  description: string;
  type: "counter" | "gauge" | "histogram";
  unit: "count" | "bytes" | "ms" | "percent";
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: { name: string; email?: string; url?: string; };
  category: string;
  capabilities: PluginCapabilityType[];
  permissions: string[];
  events: PluginEvent[];
  routes: PluginRoute[];
  metrics: PluginMetric[];
  billing: PluginBilling;
  minPlatformVersion?: string;
  dependencies?: Record<string, string[]>;
}

export interface LegacyPluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  routes?: string[];
  permissions?: string[];
}

export function legacyToManifest(
  legacy: LegacyPluginManifest,
  author = { name: "Unknown" }
): PluginManifest {
  return {
    id: legacy.id,
    name: legacy.name,
    version: legacy.version,
    description: legacy.description || "",
    author,
    category: "tool",
    capabilities: [],
    permissions: legacy.permissions || [],
    events: [],
    routes: legacy.routes?.map(r => ({ path: r, handler: "", requiredPermissions: [] })) || [],
    metrics: [],
    billing: { model: "free" },
  };
}