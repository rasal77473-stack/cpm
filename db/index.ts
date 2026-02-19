import * as schema from "./schema";

let db: any = null;

// Try to initialize database based on environment
async function initializeDatabase() {
  try {
    // Check if we have a DATABASE_URL (for Supabase/PostgreSQL)
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("postgresql")) {
      try {
        const { drizzle } = require("drizzle-orm/postgres-js");
        const postgres = require("postgres");

        const client = postgres(process.env.DATABASE_URL);
        db = drizzle(client, { schema });
        console.log("✓ Initialized with Supabase/PostgreSQL");
        return db;
      } catch (pgError) {
        console.warn("PostgreSQL not available, trying Turso...", pgError);
      }
    }

    // Try Turso if available
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("turso")) {
      try {
        const { drizzle } = require("drizzle-orm/libsql");
        const { createClient } = require("@libsql/client");

        const client = createClient({
          url: process.env.DATABASE_URL,
          authToken: process.env.DATABASE_AUTH_TOKEN,
        });

        db = drizzle(client, { schema });
        console.log("✓ Initialized with Turso/libsql");
        return db;
      } catch (libsqlError) {
        console.warn("libsql not available, trying better-sqlite3...");
      }
    }

    // Fall back to better-sqlite3 for local development
    if (typeof window === "undefined") {
      const Database = require("better-sqlite3");
      const { drizzle } = require("drizzle-orm/better-sqlite3");
      const path = require("path");

      const dbPath = path.resolve(process.cwd(), "cpm.db");
      const sqlite = new Database(dbPath);

      sqlite.pragma("journal_mode = WAL");
      sqlite.pragma("foreign_keys = ON");

      db = drizzle(sqlite, { schema });
      console.log("✓ Initialized with better-sqlite3");
      return db;
    }
  } catch (error) {
    console.error(
      "Database initialization failed:",
      error instanceof Error ? error.message : String(error)
    );
  }

  return null;
}

// Initialize on module load (for server-side)
if (typeof window === "undefined") {
  initializeDatabase();
}

export { db };
export default db || {};
