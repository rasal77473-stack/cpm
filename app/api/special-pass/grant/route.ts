import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { userActivityLogs, specialPassGrants, students, phoneHistory } from "@/db/schema"
import { eq, and, inArray } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, mentorId, mentorName, purpose, returnTime, submissionTime, staffId, expectedReturnDate, expectedReturnTime } = body

    // Validate required fields
    if (!studentId || mentorId === undefined || mentorId === null || !mentorName || !purpose) {
      return NextResponse.json(
        { error: "studentId, mentorId, mentorName, and purpose are required" },
        { status: 400 }
      )
    }

    // Validate mentorId is a positive number
    const validMentorId = parseInt(mentorId)
    if (isNaN(validMentorId) || validMentorId <= 0) {
      return NextResponse.json(
        { error: "Invalid mentor ID. Please log in again." },
        { status: 400 }
      )
    }

    // Check if student already has an active PHONE pass (not GATE)
    // PHONE and GATE passes are separate systems and can coexist
    const existingPhonePass = await db
      .select()
      .from(specialPassGrants)
      .where(
        and(
          eq(specialPassGrants.studentId, Number(studentId)),
          inArray(specialPassGrants.status, ["ACTIVE", "OUT", "PENDING"])
        )
      )
      .limit(1)

    if (existingPhonePass.length > 0) {
      const existingPassType = existingPhonePass[0].purpose?.startsWith("PHONE:") ? "PHONE" : "GATE"

      // Only block if there's an existing PHONE pass
      if (existingPassType === "PHONE") {
        return NextResponse.json(
          { error: `Student already has an active PHONE pass (Status: ${existingPhonePass[0].status}). Only 1 phone pass allowed per student at a time.` },
          { status: 400 }
        )
      }
      // If it's a GATE pass, allow the PHONE pass to be created (separate systems)
    }

    // Create new special pass grant
    // Subtract 5:30 hours (330 minutes) from issueTime for IST to UTC conversion
    const issueTime = new Date();
    issueTime.setMinutes(issueTime.getMinutes() - 330); // 330 minutes = 5 hours 30 minutes

    const [newGrant] = await db
      .insert(specialPassGrants)
      .values({
        studentId: Number(studentId),
        mentorId: validMentorId, // Use validated mentorId
        mentorName,
        purpose: `PHONE: ${purpose}`,
        issueTime: issueTime.toISOString(),
        returnTime: returnTime ? new Date(returnTime).toISOString() : null,
        submissionTime: submissionTime ? new Date(submissionTime).toISOString() : new Date().toISOString(),
        expectedReturnDate: expectedReturnDate || null,
        expectedReturnTime: expectedReturnTime || null,
      })
      .returning()

    // Record to phone history - mark as OUT (phone is with staff)
    await db.insert(phoneHistory).values({
      studentId: Number(studentId),
      status: "OUT",
      updatedBy: mentorName,
      notes: `PHONE PASS: ${purpose}`,
    })

    // Update student's special_pass status to "YES"
    await db
      .update(students)
      .set({ specialPass: "YES" })
      .where(eq(students.id, Number(studentId)))

    // Log the activity
    if (staffId) {
      const validStaffId = parseInt(staffId)
      if (!isNaN(validStaffId) && validStaffId > 0) {
        await db.insert(userActivityLogs).values({
          userId: validStaffId,
          action: "GRANT_SPECIAL_PASS",
          details: `Granted special pass to student ${studentId}. Purpose: ${purpose}`,
        })
      }
    }

    return NextResponse.json(
      { success: true, message: "Special pass granted successfully", data: newGrant },
      { status: 201 }
    )
  } catch (error) {
    const errorDetails = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        error: "Failed to grant special pass",
        details: errorDetails,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
