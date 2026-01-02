import { pgTable, serial, text, timestamp, integer, index } from "drizzle-orm/pg-core";

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  admission_number: text("admission_number").notNull().unique(),
  name: text("name").notNull(),
  locker_number: text("locker_number").notNull(),
  phone_name: text("phone_name").default("Nill"),
  class_name: text("class_name").default("-"),
  roll_no: text("roll_no").default("-"),
  special_pass: text("special_pass").default("NO"), // YES, NO
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    nameIdx: index("name_idx").on(table.name),
    admIdx: index("adm_idx").on(table.admission_number),
    lockerIdx: index("locker_idx").on(table.locker_number),
    classIdx: index("class_idx").on(table.class_name),
  }
});

export const phoneStatus = pgTable("phone_status", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  status: text("status").notNull(), // IN, OUT
  lastUpdated: timestamp("last_updated").defaultNow(),
  updatedBy: text("updated_by"),
  notes: text("notes"),
}, (table) => {
  return {
    studentIdIdx: index("student_id_idx").on(table.studentId),
    statusIdx: index("status_idx").on(table.status),
  }
});
