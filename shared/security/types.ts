/**
 * Security types — shared across all security modules.
 */

export type RoleId = 'super_admin' | 'admin' | 'operator' | 'support' | 'viewer' | 'user' | 'guest';

export type PermissionId =
  | 'user.read' | 'user.write' | 'user.delete'
  | 'billing.read' | 'billing.write' | 'billing.refund'
  | 'settings.read' | 'settings.write'
  | 'knowledge.read' | 'knowledge.write'
  | 'prompt.read' | 'prompt.write'
  | 'agent.execute'
  | 'queue.manage'
  | 'system.manage';

export type RiskLevel = 'info' | 'warn' | 'high' | 'critical';

export type RateLimitTier = 'guest' | 'free' | 'pro' | 'enterprise' | 'admin';

export interface RateLimitBuckets {
  guest:      { maxPerMinute: number; maxPerHour: number; maxPerDay: number };
  free:       { maxPerMinute: number; maxPerHour: number; maxPerDay: number };
  pro:        { maxPerMinute: number; maxPerHour: number; maxPerDay: number };
  enterprise: { maxPerMinute: number; maxPerHour: number; maxPerDay: number };
  admin:      { maxPerMinute: number; maxPerHour: number; maxPerDay: number };
}

export const DEFAULT_RATE_LIMITS: RateLimitBuckets = {
  guest:      { maxPerMinute: 10,  maxPerHour: 60,  maxPerDay: 500 },
  free:       { maxPerMinute: 30,  maxPerHour: 600, maxPerDay: 5000 },
  pro:        { maxPerMinute: 60,  maxPerHour: 1200,maxPerDay: 20000 },
  enterprise: { maxPerMinute: 200, maxPerHour: 4800,maxPerDay: 100000 },
  admin:      { maxPerMinute: 100, maxPerHour: 2000,maxPerDay: 50000 },
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
  limit: number;
}

export type AuditAction =
  | 'user.login' | 'user.logout' | 'user.profile.update' | 'user.role.change' | 'user.disable'
  | 'billing.order.create' | 'billing.payment' | 'billing.refund' | 'billing.recharge'
  | 'model.create' | 'model.update' | 'model.disable'
  | 'prompt.create' | 'prompt.update' | 'prompt.delete'
  | 'knowledge.create' | 'knowledge.upload' | 'knowledge.delete'
  | 'agent.create' | 'agent.update' | 'agent.run'
  | 'queue.clear' | 'queue.retry'
  | 'settings.update'
  | 'admin.login';

export type AuditResourceType =
  | 'user' | 'billing' | 'model' | 'prompt' | 'knowledge' | 'agent' | 'queue' | 'settings' | 'session';

export interface AuditLogEntry {
  id?: number;
  actorId: string;
  actorRole: string;
  action: AuditAction;
  resource: AuditResourceType;
  resourceId?: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  createdAt?: string;
}

export interface SensitiveMask {
  value: string | ((v: unknown) => string);
}

export interface RedactRule {
  field: string;
  mask: SensitiveMask;
}

export const SENSITIVE_PATTERNS: RedactRule[] = [
  { field: 'password', mask: { value: '[REDACTED]' } },
  { field: 'secret', mask: { value: '[REDACTED]' } },
  { field: 'api_key', mask: { value: '****' } },
  { field: 'apiKey', mask: { value: '****' } },
  { field: 'token', mask: { value: '****' } },
  { field: 'openid', mask: { value: (v: unknown) => typeof v === 'string' ? v.substring(0, 4) + '***' : 'unknown' } },
  { field: 'email', mask: { value: (v: unknown) => typeof v === 'string' ? v.replace(/(.{2}).*(@.*)/, '$1***$2') : '' } },
  { field: 'phone', mask: { value: (v: unknown) => typeof v === 'string' && v.length >= 7 ? v.substring(0, 3) + '****' + v.substring(v.length - 4) : '' } },
];

export function redactFields(obj: Record<string, any>): Record<string, any> {
  if (!obj || typeof obj !== 'object') return obj;
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const rule = SENSITIVE_PATTERNS.find(r => r.field === key || lowerKey.includes(r.field));
    if (rule) {
      const fn = rule.mask.value;
      if (typeof fn === 'function') {
        result[key] = String(fn(value));
      } else {
        result[key] = fn;
      }
    } else {
      result[key] = typeof value === 'string' && value.length > 100 ? value.substring(0, 100) + '...' : value;
    }
  }
  return result;
}