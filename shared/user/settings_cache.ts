import type { KVNamespace } from "@cloudflare/workers-types";
import type { UserSettings } from "./settings";

const SETTINGS_CACHE_TTL = 300; // seconds

export async function getCachedSettings(kv: KVNamespace, userId: string): Promise<UserSettings | null> {
  try {
    const v = await kv.get(`user:settings:${userId}`, { type: "json" }) as UserSettings | null;
    return v;
  } catch (e) {
    return null;
  }
}

export async function putCachedSettings(kv: KVNamespace, userId: string, settings: UserSettings): Promise<void> {
  try {
    await kv.put(`user:settings:${userId}`, JSON.stringify(settings), { expirationTtl: SETTINGS_CACHE_TTL });
  } catch (e) {
    // ignore cache write errors
  }
}

export async function invalidateCachedSettings(kv: KVNamespace, userId: string): Promise<void> {
  try {
    await kv.delete(`user:settings:${userId}`);
  } catch (e) {}
}
