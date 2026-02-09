import { sqliteTable, integer, text, real, blob } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";


export const students = sqliteTable("students", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  admission_number: text("admission_number").notNull().unique(),
  name: text("name").notNull(),
  locker_number: text("locker_number").notNull().default("-"),
  phone_number: text("phone_number"),
  class: text("class"),
  roll_number: text("roll_number"),
  phone_name: text("phone_name"),
  class_name: text("class_name"),
  roll_no: text("roll_no"),
  special_pass: text("special_pass").default("NO"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`(strftime('%s', 'now') * 1000)`),
});

export const users = sqliteTable("users", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("mentor"), // admin, mentor
  permissions: text("permissions").notNull().default('["view_only"]'), // JSON array as text
  special_pass: text("special_pass").default("NO"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`(strftime('%s', 'now') * 1000)`),
});

export const userActivityLogs = sqliteTable("user_activity_logs", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id", { mode: "number" }).notNull(),
  action: text("action").notNull(),
  details: text("details"),
  timestamp: integer("timestamp", { mode: "timestamp_ms" }).default(sql`(strftime('%s', 'now') * 1000)`),
});

export const specialPassGrants = sqliteTable("special_pass_grants", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  studentId: integer("student_id", { mode: "number" }).notNull(),
  mentorId: integer("mentor_id", { mode: "number" }).notNull(),
  mentorName: text("mentor_name").notNull(),
  purpose: text("purpose").notNull(),
  issueTime: integer("issue_time", { mode: "timestamp_ms" }).default(sql`(strftime('%s', 'now') * 1000)`),
  returnTime: integer("return_time", { mode: "timestamp_ms" }),
  submissionTime: integer("submission_time", { mode: "timestamp_ms" }),
  expectedReturnDate: text("expected_return_date"), // Format: YYYY-MM-DD
  expectedReturnTime: text("expected_return_time"), // Format: HH:MM
  status: text("status").default("ACTIVE"), // ACTIVE, COMPLETED, EXPIRED
});

export const phoneStatus = sqliteTable("phone_status", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  studentId: integer("student_id", { mode: "number" }).notNull(),
  status: text("status").notNull(), // IN, OUT
  lastUpdated: integer("last_updated", { mode: "timestamp_ms" }).default(sql`(strftime('%s', 'now') * 1000)`),
  updatedBy: text("updated_by"),
  notes: text("notes"),
});

// Monthly Leave Schedule
export const monthlyLeaves = sqliteTable("monthly_leaves", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  startDate: integer("start_date", { mode: "timestamp_ms" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp_ms" }).notNull(),
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format
  reason: text("reason").default("Monthly Leave"),
  createdBy: integer("created_by", { mode: "number" }).notNull(),
  createdByName: text("created_by_name").notNull(),
  status: text("status").default("PENDING"), // PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  passesIssued: text("passes_issued").default("NO"), // YES, NO - whether passes have been created
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`(strftime('%s', 'now') * 1000)`),
});

// Students excluded from monthly leave (ineligible)
export const leaveExclusions = sqliteTable("leave_exclusions", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  leaveId: integer("leave_id", { mode: "number" }).notNull(),
  studentId: integer("student_id", { mode: "number" }).notNull(),
  excludedBy: integer("excluded_by", { mode: "number" }).notNull(),
  excludedByName: text("excluded_by_name").notNull(),
  reason: text("reason"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`(strftime('%s', 'now') * 1000)`),
});
