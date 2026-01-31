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

    // Check if student already has an active or pending GATE pass (not phone pass)
    const existingPass = await db
      .select()
      .from(specialPassGrants)
      .where(
        and(
          eq(specialPassGrants.studentId, Number(studentId)),
          inArray(specialPassGrants.status, ["ACTIVE", "OUT", "PENDING"])
        )
      )
      .limit(1)

    // Filter to only check for GATE passes, not PHONE passes
    const existingGatePass = existingPass.filter((p: any) => p.purpose?.startsWith("GATE:"))

    if (existingGatePass.length > 0) {
      console.log("⚠️  Student already has active/pending gate pass:", existingGatePass[0])
      return NextResponse.json(
        { error: `Student already has an active gate pass (Status: ${existingGatePass[0].status})` },
        { status: 400 }
      )
    }

    console.log("Creating gate pass for student:", studentId, "Purpose:", purpose)

    // Create new gate pass grant (using specialPassGrants table)
    const [newGrant] = await db
      .insert(specialPassGrants)
      .values({
        studentId: Number(studentId),
        mentorId: Number(mentorId),
        mentorName,
        purpose: `GATE: ${purpose}`,
        issueTime: submissionTime ? new Date(submissionTime) : new Date(),
        returnTime: returnTime ? new Date(returnTime) : null,
        status: "ACTIVE", // Gate pass starts as ACTIVE
      })
      .returning()

    console.log("Gate pass created successfully:", newGrant)

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
    console.error("❌ POST /api/gate-pass/grant CAUGHT ERROR:")
    console.error("Error Type:", error instanceof Error ? error.constructor.name : typeof error)
    console.error("Error Message:", error instanceof Error ? error.message : String(error))
    console.error("Error Stack:", error instanceof Error ? error.stack : "N/A")
    console.error("Full Error Object:", error)
    
    const errorDetails = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { 
        error: "Failed to grant gate pass",
        details: errorDetails,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

