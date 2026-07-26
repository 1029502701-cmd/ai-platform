import type { D1Database, KVNamespace } from "@cloudflare/workers-types";

export interface AuthEnv {
  DB: D1Database;
  USER_CACHE: KVNamespace;
}

export interface SessionRecord {
  userId: string;
  role: "user" | "admin" | "super_admin";
  sessionVersion: number;
  createdAt: string;
  expiresAt: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: SessionRecord["role"];
  status: "active" | "banned" | "suspended" | "deleted";
}

export interface AuthenticatedSession {
  id: string;
  user: AuthenticatedUser;
  createdAt: string;
  expiresAt: string;
}

