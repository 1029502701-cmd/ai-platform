/**
 * Multi-tenant types and constants.
 */

export type TenantStatus = 'active' | 'suspended' | 'deleted';
export type TenantPlan = 'free' | 'pro' | 'enterprise' | 'platform';
export type UserRole = 'platform_super_admin' | 'tenant_owner' | 'tenant_admin' | 'tenant_operator' | 'tenant_user' | 'guest';

export interface Tenant {
  id: number;
  tenantKey: string;
  name: string;
  slug: string;
  status: TenantStatus;
  plan: TenantPlan;
  ownerId: number;
  domain?: string;
  logo?: string;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface TenantSettings {
  defaultModelId?: string;
  defaultPrompt?: string;
  dailyQuota?: number;
  theme?: string;
  language?: string;
  brand?: Record<string, string>;
  aiConfig?: Record<string, any>;
}

export interface TenantDomain {
  id: number;
  tenantId: number;
  domain: string;
  isPrimary: boolean;
  verified: boolean;
  createdAt: string;
}

// Platform-level sentinel value — used when no tenant is resolved
export const PLATFORM_TENANT_KEY = '__platform__';
export const DEFAULT_TENANT_KEY = '__default__';

export const TENANT_SETTINGS_KEYS = [
  'default_model_id',
  'default_prompt',
  'daily_quota',
  'theme',
  'language',
  'brand_name',
  'brand_color',
  'logo_url',
  'ai_config',
] as const;