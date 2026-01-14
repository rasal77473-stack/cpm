import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

export const db = drizzle(pool, { schema });

// Initialize database tables on module load
async function initializeDatabaseTables() {
  try {
    // Test connection and create tables if needed
    const client = await pool.connect();
    try {
      // Check if students table exists
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'students'
        )
      `);
      
      if (!result.rows[0].exists) {
        console.log("Creating database tables...");
        
        await client.query(`
          CREATE TABLE IF NOT EXISTS "students" (
            "id" serial PRIMARY KEY NOT NULL,
            "admission_number" text NOT NULL UNIQUE,
            "name" text NOT NULL,
            "locker_number" text NOT NULL,
            "phone_name" text DEFAULT 'Nill',
            "class_name" text DEFAULT '-',
            "roll_no" text DEFAULT '-',
            "special_pass" text DEFAULT 'NO',
            "created_at" timestamp DEFAULT now()
          )
        `);

        await client.query(`
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
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS "user_activity_logs" (
            "id" serial PRIMARY KEY NOT NULL,
            "user_id" integer NOT NULL,
            "action" text NOT NULL,
            "details" text,
            "timestamp" timestamp DEFAULT now()
          )
        `);

        await client.query(`
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
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS "phone_status" (
            "id" serial PRIMARY KEY NOT NULL,
            "student_id" integer NOT NULL REFERENCES "students"("id"),
            "status" text NOT NULL,
            "last_updated" timestamp DEFAULT now(),
            "updated_by" text,
            "notes" text
          )
        `);

        console.log("✓ Database tables created successfully");
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Database initialization error:", error);
  }
}

// Run initialization
initializeDatabaseTables();
