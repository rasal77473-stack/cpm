import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { userActivityLogs, specialPassGrants, students } from "@/db/schema"
import { eq, and, inArray } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, mentorId, mentorName, purpose, returnTime, submissionTime, staffId } = body

    // Validate required fields
    if (!studentId || mentorId === undefined || mentorId === null || !mentorName || !purpose) {
      console.log("Missing fields:", { studentId, mentorId, mentorName, purpose })
      return NextResponse.json(
        { error: "studentId, mentorId, mentorName, and purpose are required" },
        { status: 400 }
      )
    }

    // Check if student already has an active gate pass
    const existingPass = await db
      .select()
      .from(specialPassGrants)
      .where(
        and(
          eq(specialPassGrants.studentId, Number(studentId)),
          inArray(specialPassGrants.status, ["ACTIVE", "OUT"])
        )
      )
      .limit(1)

    if (existingPass.length > 0) {
      return NextResponse.json(
        { error: "Student already has an active gate pass" },
        { status: 400 }
      )
    }

    // Create new gate pass grant (using specialPassGrants table)
    const [newGrant] = await db
      .insert(specialPassGrants)
      .values({
        studentId: Number(studentId),
        mentorId: Number(mentorId),
        mentorName,
        purpose,
        issueTime: submissionTime ? new Date(submissionTime) : new Date(),
        returnTime: returnTime ? new Date(returnTime) : null,
        status: "ACTIVE", // Gate pass starts as ACTIVE
      })
      .returning()

    // Update student's special_pass status
    await db
      .update(students)
      .set({ special_pass: "YES" })
      .where(eq(students.id, Number(studentId)))

    // Log the activity
    if (staffId) {
      await db.insert(userActivityLogs).values({
        userId: Number(staffId),
        action: "GRANT_GATE_PASS",
        details: `Granted gate pass to student ${studentId}. Purpose: ${purpose}`,
      })
    }

    return NextResponse.json(
      { success: true, message: "Gate pass granted successfully", id: newGrant.id, data: newGrant },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/gate-pass/grant error:", error)
    return NextResponse.json(
      { error: "Failed to grant gate pass" },
      { status: 500 }
    )
  }
}

