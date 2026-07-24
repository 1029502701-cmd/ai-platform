import * as authz from "../auth/authorization_rbac";
import type { AuthEnv } from "../auth/types";

export const PermissionService = authz;

export async function requirePermission(env: AuthEnv, userId: string, permission: string) {
  return authz.hasPermission(env, userId, permission);
}
