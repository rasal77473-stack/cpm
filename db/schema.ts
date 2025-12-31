import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  admission_number: text("admission_number").notNull().unique(),
  name: text("name").notNull(),
  locker_number: text("locker_number").notNull(),
  phone: text("phone"),
  class_name: text("class_name"),
  roll_no: text("roll_no"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const phoneStatus = pgTable("phone_status", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  status: text("status").notNull(), // IN, OUT
  lastUpdated: timestamp("last_updated").defaultNow(),
  updatedBy: text("updated_by"),
  notes: text("notes"),
});
