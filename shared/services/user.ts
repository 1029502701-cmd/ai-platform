import * as profile from "../user/profile";
import * as settings from "../user/settings";
import type { D1Database } from "@cloudflare/workers-types";

export const ProfileService = profile;
export const SettingsService = settings;

export async function getFullUserContext(db: D1Database, userId: string) {
  const p = await profile.getUserProfile(db, userId);
  const s = await settings.getUserSettingsFromDb(db, userId);
  return { profile: p, settings: s };
}
