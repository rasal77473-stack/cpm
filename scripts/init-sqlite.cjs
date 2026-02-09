const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.resolve(process.cwd(), "cpm.db");

console.log("🗄️  Initializing SQLite database...\n");

const sqlite = new Database(dbPath);

try {
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "students" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "admission_number" text NOT NULL UNIQUE,
      "name" text NOT NULL,
      "locker_number" text NOT NULL DEFAULT '-',
      "phone_number" text,
      "class" text,
      "roll_number" text,
      "phone_name" text,
      "class_name" text,
      "roll_no" text,
      "special_pass" text DEFAULT 'NO',
      "created_at" integer DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS "users" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "username" text NOT NULL UNIQUE,
      "password" text NOT NULL,
      "name" text NOT NULL,
      "role" text NOT NULL DEFAULT 'mentor',
      "permissions" text NOT NULL DEFAULT '["view_only"]',
      "special_pass" text DEFAULT 'NO',
      "created_at" integer DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS "user_activity_logs" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "user_id" integer NOT NULL,
      "action" text NOT NULL,
      "details" text,
      "timestamp" integer DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS "special_pass_grants" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "student_id" integer NOT NULL,
      "mentor_id" integer NOT NULL,
      "mentor_name" text NOT NULL,
      "purpose" text NOT NULL,
      "issue_time" integer DEFAULT (strftime('%s', 'now') * 1000),
      "return_time" integer,
      "submission_time" integer,
      "expected_return_date" text,
      "expected_return_time" text,
      "status" text DEFAULT 'ACTIVE'
    );

    CREATE TABLE IF NOT EXISTS "phone_status" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "student_id" integer NOT NULL,
      "status" text NOT NULL,
      "last_updated" integer DEFAULT (strftime('%s', 'now') * 1000),
      "updated_by" text,
      "notes" text
    );

    CREATE TABLE IF NOT EXISTS "monthly_leaves" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "start_date" integer NOT NULL,
      "end_date" integer NOT NULL,
      "start_time" text NOT NULL,
      "end_time" text NOT NULL,
      "reason" text DEFAULT 'Monthly Leave',
      "created_by" integer NOT NULL,
      "created_by_name" text NOT NULL,
      "status" text DEFAULT 'PENDING',
      "passes_issued" text DEFAULT 'NO',
      "created_at" integer DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS "leave_exclusions" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "leave_id" integer NOT NULL,
      "student_id" integer NOT NULL,
      "excluded_by" integer NOT NULL,
      "excluded_by_name" text NOT NULL,
      "reason" text,
      "created_at" integer DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE INDEX IF NOT EXISTS "students_admission_number_idx" ON "students"("admission_number");
    CREATE INDEX IF NOT EXISTS "users_username_idx" ON "users"("username");
    CREATE INDEX IF NOT EXISTS "special_pass_grants_student_id_idx" ON "special_pass_grants"("student_id");
    CREATE INDEX IF NOT EXISTS "special_pass_grants_mentor_id_idx" ON "special_pass_grants"("mentor_id");
    CREATE INDEX IF NOT EXISTS "phone_status_student_id_idx" ON "phone_status"("student_id");
    CREATE INDEX IF NOT EXISTS "leave_exclusions_leave_id_idx" ON "leave_exclusions"("leave_id");
    CREATE INDEX IF NOT EXISTS "leave_exclusions_student_id_idx" ON "leave_exclusions"("student_id");
  `);

  console.log("✅ SQLite database initialized!");
  console.log(`📁 Location: ${dbPath}`);
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
} finally {
  sqlite.close();
}
