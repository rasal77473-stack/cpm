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
        admissionNumber: students.admission_number,
        mentorName: specialPassGrants.mentorName,
        purpose: specialPassGrants.purpose,
        issueTime: specialPassGrants.issueTime,
        returnTime: specialPassGrants.returnTime,
        status: specialPassGrants.status,
      })
      .from(specialPassGrants)
      .leftJoin(students, eq(specialPassGrants.studentId, students.id))
      .orderBy(desc(specialPassGrants.issueTime))

    return NextResponse.json(allPasses)
  } catch (error) {
    console.error("Failed to fetch all special passes:", error)
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
  }
}
