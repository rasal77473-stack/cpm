import { NextResponse } from "next/server"
import { db } from "@/db"
import { specialPassGrants, students } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function GET() {
  try {
    const activePasses = await db.select({
      id: specialPassGrants.id,
      studentName: students.name,
      admissionNumber: students.admission_number,
      mentorName: specialPassGrants.mentorName,
      purpose: specialPassGrants.purpose,
      issueTime: specialPassGrants.issueTime,
      returnTime: specialPassGrants.returnTime,
    })
    .from(specialPassGrants)
    .innerJoin(students, eq(specialPassGrants.studentId, students.id))
    .where(eq(specialPassGrants.status, "ACTIVE"))

    return NextResponse.json(activePasses)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch active passes" }, { status: 500 })
  }
}
