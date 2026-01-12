import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { userActivityLogs, students } from "@/db/schema"
import { eq } from "drizzle-orm"
import { sql } from "drizzle-orm"

// Note: Using raw SQL for special_pass_grants since it's not in schema.ts yet
// but we created it via execute_sql_tool

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { studentId, mentorId, mentorName, purpose, returnTime, staffId } = data

    // Insert into special_pass_grants
    await db.execute(sql`
      INSERT INTO special_pass_grants (student_id, mentor_id, mentor_name, purpose, return_time)
      VALUES (${studentId}, ${mentorId}, ${mentorName}, ${purpose}, ${returnTime})
    `)

    // Update student special_pass status
    await db.update(students)
      .set({ special_pass: "YES" })
      .where(eq(students.id, studentId))

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
