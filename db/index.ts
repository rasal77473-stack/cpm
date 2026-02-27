// Load environment variables from .env.local
if (typeof window === "undefined") {
  require("dotenv").config({ path: ".env.local" });
}

import * as schema from "./schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// HARDCODED SUPABASE CONNECTION STRING
const SUPABASE_URL = "postgresql://postgres.gnnfaijjvqikohblyjlz:rasal786%40%40%40@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

// Singleton pattern to prevent multiple connections in dev
let db: any = null;

if (typeof window === "undefined") {
  const globalForDb = globalThis as any;

  if (!globalForDb.__db) {
    try {
      const client = postgres(SUPABASE_URL, {
        max: 10,
        idle_timeout: 30,
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
