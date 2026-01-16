import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { phoneStatus, userActivityLogs, students } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

async function logActivity(userId: number, action: string, details: string) {
  try {
    await db.insert(userActivityLogs).values({ userId, action, details })
  } catch (e) {
    console.error("Logging failed:", e)
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const studentId = Number.parseInt(id)
    const status = await db.query.phoneStatus.findFirst({
      where: eq(phoneStatus.studentId, studentId),
      orderBy: [desc(phoneStatus.lastUpdated)]
    })

    if (!status) {
      return NextResponse.json({ error: "Status not found" }, { status: 404 })
    }

    return NextResponse.json({
      student_id: status.studentId,
      status: status.status,
      last_updated: status.lastUpdated?.toISOString()
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch phone status"
    console.error("GET /api/phone-status/[id] error:", errorMessage, error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const studentId = Number.parseInt(id)
    const { status, staffId, notes } = await request.json()

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 })
    }

    // First, check if student already has a phone status record
    const existingStatus = await db.query.phoneStatus.findFirst({
      where: eq(phoneStatus.studentId, studentId),
    })

    let updated;
    
    if (existingStatus) {
      // UPDATE existing record
      updated = await db
        .update(phoneStatus)
        .set({
          status,
          updatedBy: staffId,
          notes: notes || "",
          lastUpdated: new Date(),
        })
        .where(eq(phoneStatus.studentId, studentId))
        .returning()
    } else {
      // INSERT new record if doesn't exist
      updated = await db.insert(phoneStatus).values({
        studentId,
        status,
        updatedBy: staffId,
        notes: notes || "",
      }).returning()
    }

    if (staffId) {
      const student = await db.query.students.findFirst({
        where: eq(students.id, studentId)
      })
      await logActivity(Number(staffId), "PHONE_STATUS_CHANGE", `Marked ${student?.name || studentId} as ${status}`)
    }

    return NextResponse.json({
      success: true,
      message: "Status updated successfully",
      status: {
        student_id: updated[0].studentId,
        status: updated[0].status,
        last_updated: updated[0].lastUpdated?.toISOString()
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update phone status"
    console.error("PUT /api/phone-status/[id] error:", errorMessage, error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
