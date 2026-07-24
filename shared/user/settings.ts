import type { D1Database } from "@cloudflare/workers-types";

// User settings types and validation helpers
export type Theme = "light" | "dark" | "system";

export interface NotificationsSettings {
  email: boolean;
  push: boolean;
}

export interface AISettings {
  defaultModel?: string | null;
  temperature?: number | null; // 0.0 - 2.0
}

export interface UserSettings {
  theme: Theme;
  locale: string; // e.g., "zh-CN"
  timezone: string; // e.g., "Asia/Shanghai"
  notifications: NotificationsSettings;
  ai?: AISettings;
  // allow future extension but only via explicit keys in validation
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  locale: "zh-CN",
  timezone: "Asia/Shanghai",
  notifications: { email: true, push: false },
  ai: { defaultModel: undefined, temperature: 0.7 },
};

const LOCALE_PATTERN = /^[a-z]{2,3}(?:-[A-Z][a-z]{1,3})?$/;
const TIMEZONE_PATTERN = /^[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+.-]+)+$/;

export function validatePartialSettings(input: unknown): Partial<UserSettings> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Settings must be an object");
  }
  const rec = input as Record<string, unknown>;
  const allowed = new Set(["theme", "locale", "timezone", "notifications", "ai"]);
  for (const k of Object.keys(rec)) {
    if (!allowed.has(k)) throw new Error(`Unknown settings key: ${k}`);
  }

  const out: Partial<UserSettings> = {};

  if (rec.theme !== undefined) {
    if (rec.theme !== "light" && rec.theme !== "dark" && rec.theme !== "system") {
      throw new Error("Invalid theme");
    }
    out.theme = rec.theme as Theme;
  }

  if (rec.locale !== undefined) {
    if (typeof rec.locale !== "string" || rec.locale.length > 16 || !LOCALE_PATTERN.test(rec.locale)) {
      throw new Error("Invalid locale");
    }
    out.locale = rec.locale;
  }

  if (rec.timezone !== undefined) {
    if (typeof rec.timezone !== "string" || rec.timezone.length > 64 || !TIMEZONE_PATTERN.test(rec.timezone)) {
      throw new Error("Invalid timezone");
    }
    out.timezone = rec.timezone;
  }

  if (rec.notifications !== undefined) {
    if (typeof rec.notifications !== "object" || Array.isArray(rec.notifications)) throw new Error("Invalid notifications");
    const n = rec.notifications as Record<string, unknown>;
    const email = n.email;
    const push = n.push;
    if (typeof email !== "boolean" || typeof push !== "boolean") throw new Error("Notifications.email and notifications.push must be boolean");
    out.notifications = { email, push };
  }

  if (rec.ai !== undefined) {
    if (typeof rec.ai !== "object" || Array.isArray(rec.ai)) throw new Error("Invalid ai settings");
    const a = rec.ai as Record<string, unknown>;
    const aiOut: AISettings = {};
    if (a.defaultModel !== undefined) {
      if (typeof a.defaultModel !== "string" || a.defaultModel.length > 128) throw new Error("Invalid ai.defaultModel");
      aiOut.defaultModel = a.defaultModel;
    }
    if (a.temperature !== undefined) {
      if (typeof a.temperature !== "number" || a.temperature < 0 || a.temperature > 2) throw new Error("Invalid ai.temperature");
      aiOut.temperature = a.temperature;
    }
    out.ai = aiOut;
  }

  return out;
}

export function mergeSettings(current: UserSettings, patch: Partial<UserSettings>): UserSettings {
  const merged: UserSettings = JSON.parse(JSON.stringify(current));
  if (patch.theme !== undefined) merged.theme = patch.theme;
  if (patch.locale !== undefined) merged.locale = patch.locale;
  if (patch.timezone !== undefined) merged.timezone = patch.timezone;
  if (patch.notifications !== undefined) merged.notifications = { ...merged.notifications, ...patch.notifications };
  if (patch.ai !== undefined) merged.ai = { ...merged.ai, ...patch.ai } as AISettings;
  return merged;
}

export async function getUserSettingsFromDb(db: D1Database, userId: string): Promise<UserSettings | null> {
  const row = await db.prepare('SELECT settings_json FROM user_settings WHERE user_id = ?').bind(userId).first<{ settings_json: string }>();
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.settings_json) as UserSettings;
    return parsed;
  } catch {
    return null;
  }
}

export async function upsertUserSettingsToDb(db: D1Database, userId: string, settings: UserSettings): Promise<void> {
  const now = new Date().toISOString();
  const json = JSON.stringify(settings);
  await db.prepare(
    `INSERT INTO user_settings (user_id, settings_json, version, created_at, updated_at)
     VALUES (?, ?, 1, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET settings_json = excluded.settings_json, version = user_settings.version + 1, updated_at = excluded.updated_at`,
  )
    .bind(userId, json, now, now)
    .run();
}
