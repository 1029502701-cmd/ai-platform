import { getLogger } from "../logger";

// Local RiskEvent type
interface RiskEvent { eventId: string; level: 'info' | 'warn' | 'high' | 'critical'; eventType: string; actorId?: string; ip?: string; userAgent?: string; details: Record<string, any>; timestamp: string; }

const log = getLogger("risk_engine");

/**
 * Simple rule-based risk engine.
 * Detects anomalies based on configurable thresholds.
 */
export class RiskEngine {
  private static state: Record<string, any> = {};

  static check(eventType: string, context: { userId?: string; ip?: string; userAgent?: string; metadata?: Record<string, any> }): RiskEvent[] {
    const risks: RiskEvent[] = [];
    const key = context.userId || context.ip || 'anonymous';
    const now = new Date().toISOString();

    // Rule 1: Too many failed logins
    if (eventType === 'auth.failed') {
      const st = this.getState(key, 'login_failures');
      st.count = (st.count || 0) + 1;
      this.saveState(key, 'login_failures', st);
      if ((st.count || 0) >= 5) {
        risks.push({ eventId: crypto.randomUUID(), level: 'high', eventType: 'brute_force_detected', actorId: context.userId, ip: context.ip, details: { count: st.count }, timestamp: now });
      }
      if ((st.count || 0) >= 10) {
        risks.push({ eventId: crypto.randomUUID(), level: 'critical', eventType: 'ip_blocked', actorId: context.userId, ip: context.ip, details: { reason: 'Too many failed login attempts' }, timestamp: now });
      }
    }

    // Rule 2: Excessive API calls
    if (eventType === 'api.request') {
      const st = this.getState(key, 'api_calls');
      st.count = (st.count || 0) + 1;
      this.saveState(key, 'api_calls', st);
      if ((st.count || 0) > 1000) {
        risks.push({ eventId: crypto.randomUUID(), level: 'warn', eventType: 'excessive_api_calls', actorId: context.userId, ip: context.ip, details: { count: st.count }, timestamp: now });
      }
    }

    // Rule 3: Unusual user agent (not a standard browser)
    if (eventType === 'request.user_agent' && context.userAgent) {
      const ua = context.userAgent.toLowerCase();
      if (!ua.includes('mozilla') && !ua.includes('chrome') && !ua.includes('firefox') && !ua.includes('safari') && !ua.includes('edge')) {
        risks.push({ eventId: crypto.randomUUID(), level: 'info', eventType: 'unusual_user_agent', actorId: context.userId, ip: context.ip, userAgent: context.userAgent, details: { reason: 'Non-browser User-Agent' }, timestamp: now });
      }
    }

    // Rule 4: Failed payment spike
    if (eventType === 'payment.failed') {
      const st = this.getState(key, 'payment_fails');
      st.count = (st.count || 0) + 1;
      this.saveState(key, 'payment_fails', st);
      if ((st.count || 0) >= 3) {
        risks.push({ eventId: crypto.randomUUID(), level: 'high', eventType: 'payment_failure_spike', actorId: context.userId, ip: context.ip, details: { count: st.count }, timestamp: now });
      }
    }

    return risks;
  }

  private static getState(key: string, type: string): any {
    const k = key + ':' + type;
    if (!this.state[k]) this.state[k] = { count: 0 };
    return this.state[k];
  }

  private static saveState(key: string, type: string, value: any): void {
    this.state[key + ':' + type] = value;
  }

  static async logRisk(_env: any, risk: RiskEvent): Promise<void> {
    log.warn(`RISK [${risk.level.toUpperCase()}] ${risk.eventType}`, risk.details);
  }

  static reset(key: string): void {
    for (const k of Object.keys(this.state)) {
      if (k.startsWith(key + ':')) delete this.state[k];
    }
  }
}