import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { students } from "@/db/schema"
import { eq, sql } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    // Get all active special pass grants with student details
    const activePasses = await db.execute(sql`
      SELECT 
        s.id,
        s.admission_number,
        s.name,
        s.locker_number,
        s.phone_number,
        s.class,
        s.roll_number,
        s.phone_name,
        s.class_name,
        s.roll_no,
        s.created_at,
        spg.purpose, 
        spg.mentor_name, 
        spg.issue_time, 
        spg.return_time 
      FROM students s
      JOIN special_pass_grants spg ON s.id = spg.student_id
      WHERE spg.status = 'ACTIVE'
      ORDER BY spg.issue_time DESC
    `)
    
    return NextResponse.json(activePasses.rows, {
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10'
      }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch active special passes"
    console.error("GET /api/special-pass/active error:", errorMessage, error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
