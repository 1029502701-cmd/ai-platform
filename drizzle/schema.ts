import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    role: text("role").notNull().default("user"),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    emailUnique: uniqueIndex("users_email_unique").on(table.email),
  }),
);

export const profiles = sqliteTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  imageUrl: text("image_url"),
  lastAnalysisImage: text("last_analysis_image"),
  locale: text("locale").notNull().default("zh-CN"),
  timezone: text("timezone").notNull().default("Asia/Shanghai"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  provider: text("provider"),
  model: text("model"),
  createdAt: text("created_at").notNull(),
});

export const aiJobs = sqliteTable("ai_jobs", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  conversationId: text("conversation_id").references(() => conversations.id, {
    onDelete: "set null",
  }),
  type: text("type").notNull(),
  status: text("status").notNull().default("queued"),
  provider: text("provider"),
  inputJson: text("input_json").notNull().default("{}"),
  resultJson: text("result_json"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  attempts: integer("attempts").notNull().default(0),
  createdAt: text("created_at").notNull(),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
});

export const beautyReports = sqliteTable("beauty_reports", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  reportJson: text("report_json"),
  shareImageUrl: text("share_image_url"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const beautyProfiles = sqliteTable("beauty_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  avatarUrl: text("avatar_url"),
  currentFaceShape: text("current_face_shape"),
  currentEyeShape: text("current_eye_shape"),
  skinInfo: text("skin_info"),
  preferredStyle: text("preferred_style"),
  favoriteColors: text("favorite_colors"),
  analysisCount: integer("analysis_count").notNull().default(0),
  lastAnalysisId: text("last_analysis_id").references(() => beautyReports.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const beautyAnalysisHistory = sqliteTable("beauty_analysis_history", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  reportId: text("report_id").references(() => beautyReports.id, { onDelete: "set null" }),
  imageUrl: text("image_url"),
  faceAnalysisJson: text("face_analysis_json"),
  styleResult: text("style_result"),
  createdAt: text("created_at").notNull(),
});
