import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { userActivityLogs, specialPassGrants, students } from "@/db/schema"
import { eq, and, inArray } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, mentorId, mentorName, purpose, returnTime, submissionTime, staffId, expectedReturnDate, expectedReturnTime } = body

    console.log("📨 Phone Pass Grant Request Received:", { studentId, mentorId, mentorName, purpose, expectedReturnDate, expectedReturnTime })

    // Validate required fields
    if (!studentId || mentorId === undefined || mentorId === null || !mentorName || !purpose) {
      console.log("❌ Missing fields:", { studentId, mentorId, mentorName, purpose })
      return NextResponse.json(
        { error: "studentId, mentorId, mentorName, and purpose are required" },
        { status: 400 }
      )
    }

    // Check if student already has an active pass
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
      console.log("⚠️  Student already has active pass:", existingPass[0])
      return NextResponse.json(
        { error: "Student already has an active special pass" },
        { status: 400 }
      )
    }

    console.log("✨ Creating phone pass for student:", studentId)

    // Create new special pass grant
    const [newGrant] = await db
      .insert(specialPassGrants)
      .values({
        studentId: Number(studentId),
        mentorId: Number(mentorId),
        mentorName,
        purpose: `PHONE: ${purpose}`,
        returnTime: returnTime ? new Date(returnTime) : null,
        submissionTime: submissionTime ? new Date(submissionTime) : new Date(),
        expectedReturnDate: expectedReturnDate || null,
        expectedReturnTime: expectedReturnTime || null,
      })
      .returning()

    console.log("✅ Phone pass created successfully:", newGrant)

    // Update student's special_pass status to "YES"
    await db
      .update(students)
      .set({ special_pass: "YES" })
      .where(eq(students.id, Number(studentId)))

    console.log("📝 Updated student status to special_pass: YES")

    // Log the activity
    if (staffId) {
      await db.insert(userActivityLogs).values({
        userId: Number(staffId),
        action: "GRANT_SPECIAL_PASS",
        details: `Granted special pass to student ${studentId}. Purpose: ${purpose}`,
      })
      console.log("📋 Activity logged for staff:", staffId)
    }

    return NextResponse.json(
      { success: true, message: "Special pass granted successfully", data: newGrant },
      { status: 201 }
    )
  } catch (error) {
    console.error("❌ POST /api/special-pass/grant error:", error)
    return NextResponse.json(
      { error: "Failed to grant special pass", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
