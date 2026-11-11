import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const studyRecords = sqliteTable("study_records", {
  userId: text("user_id").notNull(),
  key: text("record_key").notNull(),
  value: text("record_value").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.key] })]);

// Shared, append-only legal revision history. Personal learning records stay separate.
export const legalContentEvents = sqliteTable("legal_content_events", {
  eventId: text("event_id").primaryKey(),
  kind: text("event_kind").notNull(),
  payload: text("event_payload").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const studyRecordVersions = sqliteTable("study_record_versions", {
  userId: text("user_id").notNull(),
  key: text("record_key").notNull(),
  value: text("record_value").notNull(),
  updatedAt: integer("updated_at").notNull(),
  savedAt: integer("saved_at").notNull(),
}, table => [primaryKey({ columns: [table.userId, table.key, table.updatedAt] })]);
