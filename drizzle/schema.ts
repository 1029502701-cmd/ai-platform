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
