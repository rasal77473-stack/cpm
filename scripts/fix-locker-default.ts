import { Pool } from "pg"

async function fixLockerDefault() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  try {
    console.log("Fixing locker_number default value...")
    
    const client = await pool.connect()
    try {
      // Add the default constraint if it doesn't exist
      await client.query(`
        ALTER TABLE "students" 
        ALTER COLUMN "locker_number" SET DEFAULT '-'
      `)
      
      console.log("✓ Successfully fixed locker_number default value")
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Error fixing locker_number default:", error)
    throw error
  } finally {
    await pool.end()
  }
}

fixLockerDefault().then(() => {
  console.log("Done!")
  process.exit(0)
}).catch((error) => {
  console.error("Failed:", error)
  process.exit(1)
})
