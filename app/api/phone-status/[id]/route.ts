import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { phoneStatus, userActivityLogs, students } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

// GET - Retrieve latest phone status for a student
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const studentId = parseInt(id)

    // Validate student ID
    if (!studentId || isNaN(studentId)) {
      return NextResponse.json(
        { error: "Invalid student ID" },
        { status: 400 }
      )
    }

    // Get latest phone status
    const [status] = await db
      .select()
      .from(phoneStatus)
      .where(eq(phoneStatus.studentId, studentId))
      .orderBy(desc(phoneStatus.lastUpdated))
      .limit(1)

    if (!status) {
      return NextResponse.json(
        { error: "Phone status not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error("GET /api/phone-status/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to fetch phone status" },
      { status: 500 }
    )
  }
}

// PUT - Update phone status for a student
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const studentId = parseInt(id)
    const body = await request.json()
    const { status, updatedBy, notes } = body

    // Validate required fields
    if (!studentId || isNaN(studentId)) {
      return NextResponse.json(
        { error: "Invalid student ID" },
        { status: 400 }
      )
    }

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      )
    }

    // Validate status value
    const validStatuses = ["IN", "OUT"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      )
    }

    // Check if record exists
    const [existing] = await db
      .select()
      .from(phoneStatus)
      .where(eq(phoneStatus.studentId, studentId))
      .limit(1)

    let result

    if (existing) {
      // Update existing record
      const [updated] = await db
        .update(phoneStatus)
        .set({
          status,
          updatedBy: updatedBy || "system",
          notes: notes || null,
          lastUpdated: new Date(),
        })
        .where(eq(phoneStatus.studentId, studentId))
        .returning()

      result = updated
    } else {
      // Create new record
      const [created] = await db
        .insert(phoneStatus)
        .values({
          studentId,
          status,
          updatedBy: updatedBy || "system",
          notes: notes || null,
        })
        .returning()

      result = created
    }

    // Log the activity if updatedBy is provided
    if (updatedBy) {
      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.id, studentId))
        .limit(1)

      await db.insert(userActivityLogs).values({
        userId: parseInt(updatedBy),
        action: "PHONE_STATUS_CHANGE",
        details: `Phone status changed to ${status} for student ${student?.name || studentId}`,
      })
    }

    return NextResponse.json(
      { success: true, message: "Phone status updated successfully", data: result },
      { status: 200 }
    )
  } catch (error) {
    console.error("PUT /api/phone-status/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to update phone status" },
      { status: 500 }
    )
  }
}
