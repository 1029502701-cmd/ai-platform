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
