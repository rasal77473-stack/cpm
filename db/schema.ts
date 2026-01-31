import { pgTable, serial, text, timestamp, integer, index, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
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
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("mentor"), // admin, mentor
  permissions: text("permissions").array().notNull().default(sql`'{"view_only"}'::text[]`),
  special_pass: text("special_pass").default("NO"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userActivityLogs = pgTable("user_activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const specialPassGrants = pgTable("special_pass_grants", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  mentorId: integer("mentor_id").notNull(),
  mentorName: text("mentor_name").notNull(),
  purpose: text("purpose").notNull(),
  issueTime: timestamp("issue_time").defaultNow(),
  returnTime: timestamp("return_time"),
  submissionTime: timestamp("submission_time"),
  expectedReturnDate: text("expected_return_date"), // Format: YYYY-MM-DD
  expectedReturnTime: text("expected_return_time"), // Format: HH:MM
  status: text("status").default("ACTIVE"), // ACTIVE, COMPLETED, EXPIRED
});

export const phoneStatus = pgTable("phone_status", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  status: text("status").notNull(), // IN, OUT
  lastUpdated: timestamp("last_updated").defaultNow(),
  updatedBy: text("updated_by"),
  notes: text("notes"),
});

// Monthly Leave Schedule
export const monthlyLeaves = pgTable("monthly_leaves", {
  id: serial("id").primaryKey(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format
  reason: text("reason").default("Monthly Leave"),
  createdBy: integer("created_by").notNull(),
  createdByName: text("created_by_name").notNull(),
  status: text("status").default("ACTIVE"), // ACTIVE, COMPLETED, CANCELLED
  createdAt: timestamp("created_at").defaultNow(),
});

// Students excluded from monthly leave (ineligible)
export const leaveExclusions = pgTable("leave_exclusions", {
  id: serial("id").primaryKey(),
  leaveId: integer("leave_id").references(() => monthlyLeaves.id).notNull(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  excludedBy: integer("excluded_by").notNull(),
  excludedByName: text("excluded_by_name").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});
