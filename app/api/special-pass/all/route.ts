import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { specialPassGrants, students } from "@/db/schema"
import { desc, eq, or } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const allPasses = await db
      .select({
        id: specialPassGrants.id,
        studentId: specialPassGrants.studentId,
        studentName: students.name,
        admissionNumber: students.admissionNumber,
        className: students.className,
        lockerNumber: students.lockerNumber,
        rollNo: students.rollNo,
        phoneName: students.phoneName,
        mentorName: specialPassGrants.mentorName,
        purpose: specialPassGrants.purpose,
        issueTime: specialPassGrants.issueTime,
        returnTime: specialPassGrants.returnTime,
        submissionTime: specialPassGrants.submissionTime,
        status: specialPassGrants.status,
      })
      .from(specialPassGrants)
      .innerJoin(students, eq(specialPassGrants.studentId, students.id))
      .orderBy(desc(specialPassGrants.issueTime))

    return NextResponse.json(allPasses, {
      headers: {
        'Cache-Control': 'public, s-maxage=2, stale-while-revalidate=5'
      }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch special passes"
    console.error("GET /api/special-pass/all error:", errorMessage, error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
