import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { specialPassGrants, students } from "@/db/schema"
import { eq, or, sql } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    // Get all ACTIVE and OUT special pass grants with student details
    const activePasses = await db
      .select({
        id: specialPassGrants.id,
        studentId: specialPassGrants.studentId,
        name: students.name,
        admissionNumber: students.admission_number,
        lockerNumber: students.locker_number,
        className: students.class_name,
        rollNo: students.roll_no,
        mentorName: specialPassGrants.mentorName,
        purpose: specialPassGrants.purpose,
        issueTime: specialPassGrants.issueTime,
        returnTime: specialPassGrants.returnTime,
        status: specialPassGrants.status,
      })
      .from(specialPassGrants)
      .innerJoin(students, eq(specialPassGrants.studentId, students.id))
      .where(
        or(
          eq(specialPassGrants.status, "ACTIVE"),
          eq(specialPassGrants.status, "OUT")
        )
      )
      .orderBy(sql`${specialPassGrants.issueTime} DESC`)
    
    return NextResponse.json(activePasses, {
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
