import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { userActivityLogs, students, specialPassGrants } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { studentId, mentorId, mentorName, purpose, returnTime, staffId } = data

    // Insert into specialPassGrants
    await db.insert(specialPassGrants).values({
      studentId: Number(studentId),
      mentorId: Number(mentorId),
      mentorName,
      purpose,
      returnTime: new Date(returnTime),
    })

    // Update student special_pass status
    await db.update(students)
      .set({ special_pass: "YES" })
      .where(eq(students.id, Number(studentId)))

    // Log activity
    if (staffId) {
      await db.insert(userActivityLogs).values({
        userId: Number(staffId),
        action: "GRANT_SPECIAL_PASS",
        details: `Granted special pass to student ID: ${studentId}. Purpose: ${purpose}`
      })
    }

    return NextResponse.json({ message: "Success" })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: "Failed" }, { status: 500 })
  }
}
