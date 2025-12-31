import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  admission_number: text("admission_number").notNull().unique(),
  name: text("name").notNull(),
  locker_number: text("locker_number").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const phoneStatus = pgTable("phone_status", {
  id: serial("id").primaryKey(),
  student_id: integer("student_id").references(() => students.id).notNull(),
  status: text("status").notNull(), // IN, OUT
  last_updated: timestamp("last_updated").defaultNow(),
  updated_by: text("updated_by"),
});
