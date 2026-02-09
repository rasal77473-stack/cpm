import * as schema from "./schema";

let db: any = null;

// Only initialize on server-side at runtime
if (typeof window === "undefined" && process.env.NODE_ENV !== "production") {
  try {
    const Database = require("better-sqlite3");
    const { drizzle } = require("drizzle-orm/better-sqlite3");
    const path = require("path");

    const dbPath = path.resolve(process.cwd(), "cpm.db");
    const sqlite = new Database(dbPath);

    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");

    db = drizzle(sqlite, { schema });
  } catch (error) {
    // Fail silently in production (will use different DB)
    console.warn("SQLite not available (expected in production)");
  }
}

// For production (Render), provide a no-op database handler
if (!db) {
  db = new Proxy(
    {},
    {
      get: () => {
        throw new Error("Database not initialized. Configure a production database connection.");
      },
    }
  );
}

export { db };
export default db;
