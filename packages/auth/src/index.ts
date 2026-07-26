// ============================================
// Auth Package — Unified Entry Point
// ============================================

// Types
export * from './types';

// Session management
export { createSession, getSession, revokeSession, refreshLastSeen, logoutAllSessions } from './session';

// RBAC / Authorization
export {
  assignRole, removeRole,
  getUserRoles, getRolePermissions, getUserPermissions,
  hasRole, hasPermission, hasRoleLevel, checkRoleIdLevel,
  invalidateUserRolesCache, invalidateRolePermsCache,
  BUILTIN_ROLES,
} from './rbac';

// Guest system
export { getOrCreateGuestId, createGuestUser, getGuestUser, canGuestProceed, checkGuestLimit } from './guest';

// WeChat login & bind
export { getWechatSession, bindWechatToUser, createWechatUser } from './wechat';

// Usage & quota
export { checkAndConsumeLimit, getRemainingQuota } from './usage';

// Cookie helpers
export { readSessionId, readGuestId, createSessionCookie, clearSessionCookie, parseTokenFromHeader } from './cookies';

// Middleware
export { authenticate, withAuth, requireAdmin, handleLogout } from './middleware';
