import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const studyRecords = sqliteTable("study_records", {
  userId: text("user_id").notNull(),
  key: text("record_key").notNull(),
  value: text("record_value").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.key] })]);
