import { db } from "@/db"
import { students, users, userActivityLogs, specialPassGrants, phoneStatus } from "@/db/schema"

async function initializeDatabase() {
  try {
    console.log("Initializing database tables...")

    // Try to create tables if they don't exist
    // This is a workaround for production environments
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "students" (
        "id" serial PRIMARY KEY NOT NULL,
        "admission_number" text NOT NULL UNIQUE,
        "name" text NOT NULL,
        "locker_number" text NOT NULL DEFAULT '-',
        "phone_name" text DEFAULT 'Nill',
        "class_name" text DEFAULT '-',
        "roll_no" text DEFAULT '-',
        "special_pass" text DEFAULT 'NO',
        "created_at" timestamp DEFAULT now()
      )
    `)

    await db.execute(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" serial PRIMARY KEY NOT NULL,
        "username" text NOT NULL UNIQUE,
        "password" text NOT NULL,
        "name" text NOT NULL,
        "role" text NOT NULL DEFAULT 'mentor',
        "special_pass" text DEFAULT 'NO',
        "permissions" text[] NOT NULL DEFAULT '{"view_only"}',
        "created_at" timestamp DEFAULT now()
      )
    `)

    await db.execute(`
      CREATE TABLE IF NOT EXISTS "user_activity_logs" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "action" text NOT NULL,
        "details" text,
        "timestamp" timestamp DEFAULT now()
      )
    `)

    await db.execute(`
      CREATE TABLE IF NOT EXISTS "special_pass_grants" (
        "id" serial PRIMARY KEY NOT NULL,
        "student_id" integer NOT NULL REFERENCES "students"("id"),
        "mentor_id" integer NOT NULL,
        "mentor_name" text NOT NULL,
        "purpose" text NOT NULL,
        "issue_time" timestamp DEFAULT now(),
        "return_time" timestamp,
        "status" text DEFAULT 'ACTIVE'
      )
    `)

    await db.execute(`
      CREATE TABLE IF NOT EXISTS "phone_status" (
        "id" serial PRIMARY KEY NOT NULL,
        "student_id" integer NOT NULL REFERENCES "students"("id"),
        "status" text NOT NULL,
        "last_updated" timestamp DEFAULT now(),
        "updated_by" text,
        "notes" text
      )
    `)

    console.log("✓ Database tables initialized successfully")
  } catch (error) {
    console.error("Error initializing database:", error)
    throw error
  }
}

export { initializeDatabase }
