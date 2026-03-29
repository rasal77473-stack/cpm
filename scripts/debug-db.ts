import { Pool } from "pg"

async function checkError() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  try {
    const client = await pool.connect()
    try {
      // Check if student with 0001 exists
      const checkRes = await client.query(
        "SELECT admission_number, name FROM students WHERE admission_number = $1",
        ["0001"]
      )
      console.log("Existing student with 0001:", checkRes.rows)

      // Check table structure
      const tableRes = await client.query(`
        SELECT column_name, data_type, column_default, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'students'
        ORDER BY ordinal_position
      `)
      console.log("\nTable structure:")
      tableRes.rows.forEach((row) => {
        console.log(
          `${row.column_name}: ${row.data_type} - nullable: ${row.is_nullable}, default: ${row.column_default}`
        )
      })

      // Try to insert
      console.log("\nTrying to insert...")
      const insertRes = await client.query(
        `INSERT INTO students (admission_number, name, locker_number, phone_number, class, roll_number) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        ["0002", "test", "01", "iphone", "c1c", "25"]
      )
      console.log("Insert successful:", insertRes.rows[0])
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await pool.end()
  }
}

checkError()
