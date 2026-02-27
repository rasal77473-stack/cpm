// Load environment variables from .env.local
if (typeof window === "undefined") {
  require("dotenv").config({ path: ".env.local" });
}

import * as schema from "./schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Use env variable, fallback to hardcoded for backwards compat
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres.gnnfaijjvqikohblyjlz:rasal786%40%40%40@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

// Singleton pattern to prevent multiple connections in dev
let db: any = null;

if (typeof window === "undefined") {
  // Use global to persist across hot reloads in dev
  const globalForDb = globalThis as any;

  if (!globalForDb.__db) {
    try {
      const client = postgres(DATABASE_URL, {
        max: 10,
        idle_timeout: 30,
        connect_timeout: 10,
        prepare: false, // Supabase pooler compatibility
      });
      globalForDb.__db = drizzle(client, { schema });
      console.log("✓ Database connected to Supabase");
    } catch (error) {
      console.error(
        "Database initialization failed:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  db = globalForDb.__db;
}

export { db };
export default db;
