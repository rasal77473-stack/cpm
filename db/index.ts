// Load environment variables from .env.local (optional now as we hardcode)
if (typeof window === "undefined") {
  require("dotenv").config({ path: ".env.local" });
}

import * as schema from "./schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let db: any = null;

// HARDCODED SUPABASE CONNECTION STRING
const SUPABASE_URL = "postgresql://postgres.gnnfaijjvqikohblyjlz:rasal786%40%40%40@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

// Try to initialize database based on environment
async function initializeDatabase() {
  try {
    console.log("Initializing database with HARDCODED Supabase URL...");

    // Always use the hardcoded URL
    const client = postgres(SUPABASE_URL);
    db = drizzle(client, { schema });
    console.log("✓ Initialized with Supabase/PostgreSQL (Hardcoded)");
    return db;

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
