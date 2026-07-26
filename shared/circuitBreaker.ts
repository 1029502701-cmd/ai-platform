/**
 * Circuit Breaker for AI Providers.
 * States: CLOSED (normal) -> OPEN (failing) -> HALF_OPEN (testing).
 */

export type CircuitState = "closed" | "open" | "half_open";

interface CircuitRecord {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureAt: number;
  lastSuccessAt: number;
  halfOpenTimeout: number;
  failureThreshold: number;
  resetTimeout: number;
  requestCount: number;
  errorCount: number;
  avgLatency: number;
  totalLatency: number;
}

const circuits = new Map<string, CircuitRecord>();

export function getCircuit(providerName: string): CircuitRecord {
  if (!circuits.has(providerName)) {
    circuits.set(providerName, {
      state: "closed",
      failureCount: 0,
      successCount: 0,
      lastFailureAt: 0,
      lastSuccessAt: 0,
      halfOpenTimeout: 30_000,  // 30s before trying again
      failureThreshold: 5,       // 5 failures triggers open
      resetTimeout: 60_000,      // 60s reset back to closed on success
      requestCount: 0,
      errorCount: 0,
      avgLatency: 0,
      totalLatency: 0,
    });
  }
  return circuits.get(providerName)!;
}

export function canExecute(providerName: string): boolean {
  const c = getCircuit(providerName);
  switch (c.state) {
    case "closed": return true;
    case "half_open": return c.successCount < 3; // allow limited requests
    case "open": {
      const elapsed = Date.now() - c.lastFailureAt;
      if (elapsed > c.halfOpenTimeout) {
        c.state = "half_open";
        c.successCount = 0;
        return true;
      }
      return false;
    }
    default: return true;
  }
}

export function recordSuccess(providerName: string, latencyMs: number): void {
  const c = getCircuit(providerName);
  c.requestCount++;
  c.totalLatency += latencyMs;
  c.avgLatency = c.totalLatency / c.requestCount;
  c.successCount++;
  c.lastSuccessAt = Date.now();

  if (c.state === "half_open" && c.successCount >= 3) {
    c.state = "closed";
    c.failureCount = 0;
  }
}

export function recordFailure(providerName: string): void {
  const c = getCircuit(providerName);
  c.errorCount++;
  c.lastFailureAt = Date.now();

  if (c.state === "half_open") {
    c.state = "open";
    c.successCount = 0;
    return;
  }

  c.failureCount++;
  if (c.failureCount >= c.failureThreshold) {
    c.state = "open";
  }
}

export function getHealthReport(providerName?: string): Record<string, any> {
  const result: Record<string, any> = {};
  const targets = providerName ? [providerName] : Array.from(circuits.keys());
  for (const name of targets) {
    const c = circuits.get(name);
    if (!c) continue;
    const rate = c.requestCount > 0 ? c.errorCount / c.requestCount : 0;
    result[name] = {
      state: c.state,
      failureRate: Math.round(rate * 10000) / 100,
      avgLatency: Math.round(c.avgLatency * 100) / 100,
      failureCount: c.failureCount,
      requestCount: c.requestCount,
      errorCount: c.errorCount,
    };
  }
  return result;
}
