import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Hardcoded Supabase URL for drizzle-kit
const SUPABASE_URL = "postgresql://postgres.gnnfaijjvqikohblyjlz:rasal786%40%40%40@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

export default defineConfig({
  out: "out",
  schema: "./db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: SUPABASE_URL,
  },
});