export type MetricType = 'counter' | 'gauge' | 'histogram';
export type MetricUnit = 'count' | 'bytes' | 'ms' | 'percent';

export const StandardMetricNames = {
  USAGE_TOTAL: 'plugin_usage_total',
  ERROR_TOTAL: 'plugin_error_total',
  EXECUTION_TIME: 'plugin_execution_time',
} as const;

export class PluginMetricsClient {
  private readonly pluginId: string;

  constructor(pluginId: string) {
    this.pluginId = pluginId;
  }

  async increment(name: string, amount: number = 1): Promise<void> {
    console.log("[Metrics][PLUGIN_ID] INCREMENT: " + name + "+=" + amount);
  }

  async gauge(name: string, value: number): Promise<void> {
    console.log("[Metrics][PLUGIN_ID] GAUGE: " + name + "=" + value);
  }

  async timing(name: string, duration: number): Promise<void> {
    console.log("[Metrics][PLUGIN_ID] TIMING: " + name + "=" + duration + "ms");
  }

  async incrementUsage(amount: number = 1): Promise<void> {
    await this.increment(StandardMetricNames.USAGE_TOTAL, amount);
  }

  async recordError(error: Error, extra?: Record<string, unknown>): Promise<void> {
    await this.increment(StandardMetricNames.ERROR_TOTAL, 1);
  }

  async around<T extends (...args: any[]) => Promise<unknown>>(
    fn: T,
    name: string = "execution"
  ): Promise<Awaited<ReturnType<T>>> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      await this.timing(name, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      await this.timing(name + ".error", duration);
      throw error;
    }
  }
}

let globalMetrics: PluginMetricsClient | null = null;

export function setMetricsClient(metrics: PluginMetricsClient) {
  globalMetrics = metrics;
}

export const metrics = {
  async increment(name: string, amount: number = 1): Promise<void> {
    if (!globalMetrics) throw new Error("Metrics client not initialized");
    return globalMetrics.increment(name, amount);
  },
  async gauge(name: string, value: number): Promise<void> {
    if (!globalMetrics) throw new Error("Metrics client not initialized");
    return globalMetrics.gauge(name, value);
  },
  async timing(name: string, duration: number): Promise<void> {
    if (!globalMetrics) throw new Error("Metrics client not initialized");
    return globalMetrics.timing(name, duration);
  },
}
