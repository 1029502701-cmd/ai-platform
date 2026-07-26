/**
 * Centralized performance metrics collection.
 * Records per-request latency, AI call duration, queue wait time.
 */

interface MetricEntry {
  metric: string;
  value: number;
  tags: Record<string, string>;
  timestamp: number;
}

const metricsBuffer: MetricEntry[] = [];
const MAX_BUFFER = 5000;

export function recordMetric(metric: string, value: number, tags?: Record<string, string>): void {
  metricsBuffer.push({ metric, value, tags: tags || {}, timestamp: Date.now() });
  if (metricsBuffer.length > MAX_BUFFER) {
    metricsBuffer.splice(0, metricsBuffer.length - MAX_BUFFER);
  }
}

export function getMetricsSnapshot(days: number = 1): Record<string, { count: number; avg: number; p50: number; p95: number; p99: number; min: number; max: number }> {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = metricsBuffer.filter(m => m.timestamp >= cutoff);

  const groups: Record<string, number[]> = {};
  for (const m of recent) {
    if (!groups[m.metric]) groups[m.metric] = [];
    groups[m.metric].push(m.value);
  }

  const result: Record<string, any> = {};
  for (const [name, values] of Object.entries(groups)) {
    if (!values.length) continue;
    values.sort((a, b) => a - b);
    const n = values.length;
    result[name] = {
      count: n,
      avg: Math.round(values.reduce((s, v) => s + v, 0) / n * 100) / 100,
      min: values[0],
      max: values[n - 1],
      p50: values[Math.floor(n * 0.5)],
      p95: values[Math.min(Math.floor(n * 0.95), n - 1)],
      p99: values[Math.min(Math.floor(n * 0.99), n - 1)],
    };
  }
  return result;
}

// Pre-built convenience functions
export const perf = {
  recordApiResponse: (durationMs: number, statusCode: number, path: string) => {
    recordMetric("api_response_ms", durationMs, { method: "http", path, status: String(statusCode) });
  },
  recordAiCall: (provider: string, model: string, durationMs: number, tokens: number, costUsd: number) => {
    recordMetric("ai_call_duration_ms", durationMs, { provider, model });
    recordMetric("ai_cost_usd", costUsd, { provider, model });
    recordMetric("ai_tokens", tokens, { provider, model });
  },
  recordQueueWait: (queueName: string, waitMs: number) => {
    recordMetric("queue_wait_ms", waitMs, { queue: queueName });
  },
  recordDbQuery: (queryName: string, durationMs: number) => {
    recordMetric("db_query_ms", durationMs, { query: queryName });
  },
};

// Flush metrics to DB periodically
export async function flushMetricsToDB(db: any): Promise<void> {
  if (!db?.prepare || metricsBuffer.length < 10) return;
  const snapshot = getMetricsSnapshot(0);
  try {
    await db.prepare(
      "INSERT INTO system_metrics (metric_name, metric_value, metric_count, metric_p50, metric_p95, metric_p99, recorded_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))"
    ).run(
      "aggregated", JSON.stringify(snapshot), metricsBuffer.length,
      0, 0, 0
    );
    metricsBuffer.length = 0;
  } catch { /* fire-and-forget */ }
}
