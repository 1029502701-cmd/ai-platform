/** PluginMetricsService - Collects plugin metrics */
export interface PluginMetricValue {
  name: string;
  value: number;
  timestamp: string;
}

export class PluginMetricsService {
  private metrics = new Map<string, number>();
  private history: PluginMetricValue[] = [];

  increment(name: string) {
    const current = this.metrics.get(name) || 0;
    this.metrics.set(name, current + 1);
    this.record(name, current + 1);
  }

  decrement(name: string) {
    const current = this.metrics.get(name) || 0;
    if (current > 0) {
      this.metrics.set(name, current - 1);
      this.record(name, current - 1);
    }
  }

  set(name: string, value: number) {
    this.metrics.set(name, value);
    this.record(name, value);
  }

  get(name: string) {
    return this.metrics.get(name) || 0;
  }

  getAll() {
    return Object.fromEntries(this.metrics);
  }

  private record(name: string, value: number) {
    this.history.push({ name, value, timestamp: new Date().toISOString() });
    if (this.history.length > 1000) this.history.shift();
  }

  getPluginCount() { return this.get("plugin_count"); }
  getActivePluginCount() { return this.get("plugin_active_count"); }
  getErrorCount() { return this.get("plugin_error_count") || 0; }
  getTotalUsage() { return this.get("plugin_usage_total") || 0; }
}

export const metricsService = new PluginMetricsService();