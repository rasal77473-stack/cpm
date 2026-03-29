// Migration: Add is_active column to students table
const { Pool } = require("pg")
require("dotenv").config({ path: ".env.local" })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function migrate() {
    try {
        console.log("Adding is_active column to students table...")
        await pool.query(`
      ALTER TABLE students
      ADD COLUMN IF NOT EXISTS is_active TEXT DEFAULT 'YES';
    `)
        console.log("✅ Column added successfully! All existing students set to 'YES' (active/in hostel).")
    } catch (err) {
        console.error("❌ Migration failed:", err.message)
    } finally {
        await pool.end()
    }
}

migrate()
