import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { specialPassGrants, students } from "@/db/schema"
import { eq, desc, inArray } from "drizzle-orm"

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
        className: students.class,
        rollNo: students.roll_number,
        phoneNumber: students.phone_name,
        mentorName: specialPassGrants.mentorName,
        purpose: specialPassGrants.purpose,
        issueTime: specialPassGrants.issueTime,
        returnTime: specialPassGrants.returnTime,
        submissionTime: specialPassGrants.submissionTime,
        status: specialPassGrants.status,
      })
      .from(specialPassGrants)
      .innerJoin(students, eq(specialPassGrants.studentId, students.id))
      .where(inArray(specialPassGrants.status, ["ACTIVE", "OUT"]))
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
