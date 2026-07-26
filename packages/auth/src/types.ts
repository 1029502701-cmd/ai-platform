// ============================================
// Auth Package - Core Types
// ============================================

import type { D1Database, KVNamespace } from '@cloudflare/workers-types';

export interface AuthEnv {
  DB: D1Database;
  USER_CACHE: KVNamespace;
}

// --- User ---

export type UserType = 'guest' | 'wechat' | 'user';
export type UserStatus = 'active' | 'suspended' | 'deleted';
export type UserRole = 'user' | 'admin' | 'super_admin';

export interface User {
  id: string;
  email: string | null;                    // legacy, not used for login
  passwordHash: string | null;             // legacy, not used for login
  role: UserRole;
  type: UserType;
  status: UserStatus;
  nickname: string | null;
  avatarUrl: string | null;

  // WeChat
  openid: string | null;
  unionid: string | null;
  wechatProfile: Record<string, unknown> | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// --- Session ---

export interface SessionRecord {
  userId: string;
  role: UserRole;
  sessionVersion: number;
  createdAt: string;
  expiresAt: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  type: UserType;
  nickname: string | null;
}

export interface AuthenticatedSession {
  id: string;
  user: AuthenticatedUser;
  createdAt: string;
  expiresAt: string;
}

// --- Auth Result ---

export interface AuthSuccess {
  ok: true;
  session: AuthenticatedSession;
  cookie: string;
}

export interface AuthFailure {
  ok: false;
  code: string;      // INVALID_CREDENTIALS / SESSION_EXPIRED / USER_DISABLED / GUEST_LIMIT
  message: string;
}

export type AuthResult = AuthSuccess | AuthFailure;

// --- Guest Specific ---

export interface GuestContext {
  guestId: string;            // stable anonymous ID (cookie-based)
  session: AuthenticatedSession | null;
  role: UserRole;
  type: 'guest';
}

// --- WeChat Login ---

export interface WechatLoginPayload {
  code: string;               // wx.login() code
  userInfo?: {                // from getUserInfo (weixin-authorized-data)
    nickName: string;
    avatarUrl: string;
    gender: number;
    country: string;
    province: string;
    city: string;
  };
}

export interface WechatBindPayload {
  userId: string;             // current guest or registered user ID
  code: string;               // wx.login() code
  userInfo?: {
    nickName: string;
    avatarUrl: string;
    gender: number;
    country: string;
    province: string;
    city: string;
  };
}

// --- Usage / Quota ---

export interface UsageLimitRow {
  userId: string;
  dailyFreeCount: number;
  usedCount: number;
  resetTime: string;          // ISO midnight
}

export interface UsageCheckResult {
  ok: boolean;
  remaining?: number;
  limitExceeded?: boolean;
  error?: string;
}

// --- RBAC ---

export type RoleId = string;
export type PermissionId = string;

export interface RoleRecord {
  id: RoleId;
  name: string;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PermissionRecord {
  id: PermissionId;
  name: string;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}
