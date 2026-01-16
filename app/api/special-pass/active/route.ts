import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { specialPassGrants, students } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    // Get all active special pass grants with student details
    const activePasses = await db
      .select({
        id: specialPassGrants.id,
        studentId: specialPassGrants.studentId,
        studentName: students.name,
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
      .where(eq(specialPassGrants.status, "ACTIVE"))
      .orderBy(desc(specialPassGrants.issueTime))

    return NextResponse.json(activePasses)
  } catch (error) {
    console.error("GET /api/special-pass/active error:", error)
    return NextResponse.json(
      { error: "Failed to fetch active special passes" },
      { status: 500 }
    )
  }
}
