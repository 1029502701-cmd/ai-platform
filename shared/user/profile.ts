import type { D1Database } from "@cloudflare/workers-types";
import type { ProfileUpdateInput, UserProfile } from "./types";

const MAX_DISPLAY_NAME_LENGTH = 80;
const MAX_AVATAR_URL_LENGTH = 2048;
const MAX_IMAGE_URL_LENGTH = 4096;
const LOCALE_PATTERN = /^[a-z]{2,3}(?:-[A-Z][a-z]{1,3})?$/;
const TIMEZONE_PATTERN = /^[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+.-]+)+$/;

function validateOptionalText(
  value: unknown,
  field: string,
  maxLength: number,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value !== null && (typeof value !== "string" || value.length > maxLength)) {
    throw new Error(`${field} is invalid`);
  }
  return value;
}

export function validateProfileUpdate(input: unknown): ProfileUpdateInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Request body must be an object");
  }

  const record = input as Record<string, unknown>;
  const allowedFields = new Set(["displayName", "avatarUrl", "imageUrl", "lastAnalysisImage", "locale", "timezone"]);
  for (const key of Object.keys(record)) {
    if (!allowedFields.has(key)) {
      throw new Error(`Unknown profile field: ${key}`);
    }
  }

  const displayName = validateOptionalText(
    record.displayName,
    "displayName",
    MAX_DISPLAY_NAME_LENGTH,
  );
  const avatarUrl = validateOptionalText(record.avatarUrl, "avatarUrl", MAX_AVATAR_URL_LENGTH);
  const imageUrl = validateOptionalText(record.imageUrl, "imageUrl", MAX_IMAGE_URL_LENGTH);
  const lastAnalysisImage = validateOptionalText(record.lastAnalysisImage, "lastAnalysisImage", MAX_IMAGE_URL_LENGTH);
  const locale = record.locale;
  const timezone = record.timezone;

  if (
    locale !== undefined &&
    (typeof locale !== "string" || !LOCALE_PATTERN.test(locale) || locale.length > 16)
  ) {
    throw new Error("locale is invalid");
  }
  if (
    timezone !== undefined &&
    (typeof timezone !== "string" ||
      timezone.length > 64 ||
      !TIMEZONE_PATTERN.test(timezone))
  ) {
    throw new Error("timezone is invalid");
  }

  return { displayName, avatarUrl, imageUrl, lastAnalysisImage, locale, timezone };
}

export async function getUserProfile(
  db: D1Database,
  userId: string,
): Promise<UserProfile | null> {
  return db
    .prepare(
      `SELECT
        u.id AS userId,
        u.email,
        u.role,
        u.status,
        p.display_name AS displayName,
        p.avatar_url AS avatarUrl,
        p.image_url AS imageUrl,
        p.last_analysis_image AS lastAnalysisImage,
        COALESCE(p.locale, 'zh-CN') AS locale,
        COALESCE(p.timezone, 'Asia/Shanghai') AS timezone,
        COALESCE(p.created_at, u.created_at) AS createdAt,
        COALESCE(p.updated_at, u.updated_at) AS updatedAt
       FROM users AS u
       LEFT JOIN profiles AS p ON p.user_id = u.id
       WHERE u.id = ?
       LIMIT 1`,
    )
    .bind(userId)
    .first<UserProfile>();
}

export async function updateUserProfile(
  db: D1Database,
  userId: string,
  input: ProfileUpdateInput,
): Promise<UserProfile | null> {
  const existing = await getUserProfile(db, userId);
  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();
  const displayName = input.displayName === undefined ? existing.displayName : input.displayName;
  const avatarUrl = input.avatarUrl === undefined ? existing.avatarUrl : input.avatarUrl;
  const imageUrl = input.imageUrl === undefined ? existing.imageUrl : input.imageUrl;
  const lastAnalysisImage = input.lastAnalysisImage === undefined ? existing.lastAnalysisImage : input.lastAnalysisImage;
  const locale = input.locale === undefined ? existing.locale : input.locale;
  const timezone = input.timezone === undefined ? existing.timezone : input.timezone;

  await db
    .prepare(
      `INSERT INTO profiles
        (user_id, display_name, avatar_url, image_url, last_analysis_image, locale, timezone, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         display_name = excluded.display_name,
         avatar_url = excluded.avatar_url,
         image_url = excluded.image_url,
         last_analysis_image = excluded.last_analysis_image,
         locale = excluded.locale,
         timezone = excluded.timezone,
         updated_at = excluded.updated_at`,
    )
    .bind(
      userId,
      displayName,
      avatarUrl,
      imageUrl,
      lastAnalysisImage,
      locale,
      timezone,
      existing.createdAt,
      now,
    )
    .run();

  return getUserProfile(db, userId);
}
