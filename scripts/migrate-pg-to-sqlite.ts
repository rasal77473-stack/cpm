import { drizzle as pgDrizzle } from "drizzle-orm/node-postgres";
import { drizzle as sqliteDrizzle } from "drizzle-orm/better-sqlite3";
import { Pool } from "pg";
import Database from "better-sqlite3";
import * as schema from "../db/schema";
import path from "path";

/**
 * This script migrates data from PostgreSQL (Supabase) to SQLite
 * Run with: npx ts-node scripts/migrate-pg-to-sqlite.ts
 */

const pgConnectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres.gnnfaijjvqikohblyjlz:rasal786%40%40%40@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function migrateData() {
  console.log("🔄 Starting migration from PostgreSQL to SQLite...\n");

  try {
    // Connect to PostgreSQL
    const pgPool = new Pool({
      connectionString: pgConnectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    const pgDB = pgDrizzle(pgPool, { schema });

    // Connect to SQLite
    const dbPath = path.resolve(process.cwd(), "cpm.db");
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    const sqliteDB = sqliteDrizzle(sqlite, { schema });

    // Migrate each table
    console.log("📋 Migrating students...");
    const students = await pgDB.select().from(schema.students);
    if (students.length > 0) {
      for (const student of students) {
        await sqliteDB
          .insert(schema.students)
          .values(student)
          .onConflictDoNothing();
      }
      console.log(`   ✓ Migrated ${students.length} students`);
    }

    console.log("👥 Migrating users...");
    const users = await pgDB.select().from(schema.users);
    if (users.length > 0) {
      for (const user of users) {
        const userData = {
          ...user,
          permissions: Array.isArray(user.permissions)
            ? JSON.stringify(user.permissions)
            : user.permissions,
        };
        await sqliteDB
          .insert(schema.users)
          .values(userData as any)
          .onConflictDoNothing();
      }
      console.log(`   ✓ Migrated ${users.length} users`);
    }

    console.log("📝 Migrating user activity logs...");
    const logs = await pgDB.select().from(schema.userActivityLogs);
    if (logs.length > 0) {
      for (const log of logs) {
        await sqliteDB
          .insert(schema.userActivityLogs)
          .values(log as any)
          .onConflictDoNothing();
      }
      console.log(`   ✓ Migrated ${logs.length} activity logs`);
    }

    console.log("🎫 Migrating special pass grants...");
    const passes = await pgDB.select().from(schema.specialPassGrants);
    if (passes.length > 0) {
      for (const pass of passes) {
        await sqliteDB
          .insert(schema.specialPassGrants)
          .values(pass as any)
          .onConflictDoNothing();
      }
      console.log(`   ✓ Migrated ${passes.length} special passes`);
    }

    console.log("📱 Migrating phone status...");
    const phoneStatuses = await pgDB.select().from(schema.phoneStatus);
    if (phoneStatuses.length > 0) {
      for (const status of phoneStatuses) {
        await sqliteDB
          .insert(schema.phoneStatus)
          .values(status as any)
          .onConflictDoNothing();
      }
      console.log(`   ✓ Migrated ${phoneStatuses.length} phone statuses`);
    }

    console.log("📅 Migrating monthly leaves...");
    const leaves = await pgDB.select().from(schema.monthlyLeaves);
    if (leaves.length > 0) {
      for (const leave of leaves) {
        await sqliteDB
          .insert(schema.monthlyLeaves)
          .values(leave as any)
          .onConflictDoNothing();
      }
      console.log(`   ✓ Migrated ${leaves.length} monthly leaves`);
    }

    console.log("🚫 Migrating leave exclusions...");
    const exclusions = await pgDB.select().from(schema.leaveExclusions);
    if (exclusions.length > 0) {
      for (const exclusion of exclusions) {
        await sqliteDB
          .insert(schema.leaveExclusions)
          .values(exclusion as any)
          .onConflictDoNothing();
      }
      console.log(`   ✓ Migrated ${exclusions.length} leave exclusions`);
    }

    console.log("\n✅ Migration completed successfully!");
    console.log(`📁 SQLite database created at: ${dbPath}`);

    await pgPool.end();
    sqlite.close();
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrateData();
