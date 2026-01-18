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
