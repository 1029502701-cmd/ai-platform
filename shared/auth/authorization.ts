import type { AuthenticatedUser } from "./types";

const ROLE_LEVEL: Record<AuthenticatedUser["role"], number> = {
  user: 1,
  admin: 2,
  super_admin: 3,
};

export function hasRole(
  user: AuthenticatedUser,
  requiredRole: AuthenticatedUser["role"],
): boolean {
  return user.status === "active" && ROLE_LEVEL[user.role] >= ROLE_LEVEL[requiredRole];
}
