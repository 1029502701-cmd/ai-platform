/**
 * Provider Health Check service.
 * Ping each provider periodically and track availability.
 */
import { getCircuit, recordSuccess, recordFailure, getHealthReport } from "../circuitBreaker.ts";

export interface ProviderHealthStatus {
  name: string;
  status: "healthy" | "degraded" | "down";
  lastCheckAt: number;
  latencyMs: number;
  consecutiveFailures: number;
}

const healthCache = new Map<string, ProviderHealthStatus>();

export async function checkProviderHealth(providerKey: string, env: any): Promise<ProviderHealthStatus> {
  const circuit = getCircuit(providerKey);
  const before = Date.now();

  try {
    if (providerKey === "openai") {
      await fetch("https://api.openai.com/v1/models", {
        headers: { "Authorization": "Bearer " + (env.OPENAI_API_KEY || "") },
        signal: AbortSignal.timeout(5000),
      });
    } else if (providerKey === "gemini") {
      await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
        signal: AbortSignal.timeout(5000),
      });
    } else if (providerKey === "deepseek") {
      await fetch("https://api.deepseek.com/v1/models", {
        headers: { "Authorization": "Bearer " + (env.DEEPSEEK_API_KEY || "") },
        signal: AbortSignal.timeout(5000),
      });
    }

    const latency = Date.now() - before;
    recordSuccess(providerKey, latency);
    circuit.state === "half_open" && recordSuccess(providerKey, latency); // transition back to closed

    const status: ProviderHealthStatus = {
      name: providerKey,
      status: latency > 3000 ? "degraded" : "healthy",
      lastCheckAt: Date.now(),
      latencyMs: latency,
      consecutiveFailures: 0,
    };
    healthCache.set(providerKey, status);
    return status;
  } catch (e) {
    recordFailure(providerKey);
    const cur = healthCache.get(providerKey) || { name: providerKey, consecutiveFailures: 0 } as any;
    cur.consecutiveFailures = (cur.consecutiveFailures || 0) + 1;
    cur.lastCheckAt = Date.now();
    cur.status = cur.consecutiveFailures > 3 ? "down" : "degraded";
    healthCache.set(providerKey, cur as ProviderHealthStatus);
    return cur as ProviderHealthStatus;
  }
}

export function getProviderHealthSnapshot(): Record<string, ProviderHealthStatus> {
  const report = getHealthReport();
  const result: any = {};
  for (const [name, r] of Object.entries(report)) {
    const hc = healthCache.get(name);
    result[name] = hc || {
      name,
      status: r.state === "closed" ? "healthy" : r.state === "open" ? "down" : "degraded",
      lastCheckAt: 0,
      latencyMs: r.avgLatency,
      consecutiveFailures: r.failureCount || 0,
    };
  }
  return result;
}
