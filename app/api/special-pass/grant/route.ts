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
        console.log(`⚠️  Student already has active PHONE pass:`, existingPhonePass[0])
        return NextResponse.json(
          { error: `Student already has an active PHONE pass (Status: ${existingPhonePass[0].status}). Only 1 phone pass allowed per student at a time.` },
          { status: 400 }
        )
      }
      // If it's a GATE pass, allow the PHONE pass to be created (separate systems)
      console.log(`ℹ️  Student has existing GATE pass but allowing PHONE pass creation (separate systems)`)
    }

    console.log("✨ Creating phone pass for student:", studentId)

    // Create new special pass grant
    // Subtract 5:30 hours (330 minutes) from issueTime for IST to UTC conversion
    const issueTime = new Date();
    issueTime.setMinutes(issueTime.getMinutes() - 330); // 330 minutes = 5 hours 30 minutes

    const [newGrant] = await db
      .insert(specialPassGrants)
      .values({
        studentId: Number(studentId),
        mentorId: Number(mentorId),
        mentorName,
        purpose: `PHONE: ${purpose}`,
        issueTime,
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
    console.error("❌ POST /api/special-pass/grant CAUGHT ERROR:")
    console.error("Error Type:", error instanceof Error ? error.constructor.name : typeof error)
    console.error("Error Message:", error instanceof Error ? error.message : String(error))
    console.error("Error Stack:", error instanceof Error ? error.stack : "N/A")
    console.error("Full Error Object:", error)
    
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
