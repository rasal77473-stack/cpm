import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { students } from "@/db/schema"
import { eq, sql } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    // We join with the grants table to get details if needed, 
    // but the requirement is just to show students with special_pass = 'YES'
    const activePasses = await db.execute(sql`
      SELECT 
        s.*, 
        spg.purpose, 
        spg.mentor_name, 
        spg.issue_time, 
        spg.return_time 
      FROM students s
      JOIN special_pass_grants spg ON s.id = spg.student_id
      WHERE s.special_pass = 'YES' AND spg.status = 'ACTIVE'
      ORDER BY spg.issue_time DESC
    `)
    
    return NextResponse.json(activePasses.rows, {
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10'
      }
    })
  } catch (error) {
    console.error("Failed to fetch active special passes:", error)
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
  }
}
