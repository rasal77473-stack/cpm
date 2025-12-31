import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { phoneStatus } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const studentId = Number.parseInt(params.id)
    const status = await db.query.phoneStatus.findFirst({
      where: eq(phoneStatus.studentId, studentId),
      orderBy: [desc(phoneStatus.lastUpdated)]
    })

    if (!status) {
      return NextResponse.json({ message: "Status not found" }, { status: 404 })
    }

    return NextResponse.json({
      student_id: status.studentId,
      status: status.status,
      last_updated: status.lastUpdated?.toISOString()
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: "Failed to fetch phone status" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const studentId = Number.parseInt(params.id)
    const { status, staffId, notes } = await request.json()

    if (!status) {
      return NextResponse.json({ message: "Status is required" }, { status: 400 })
    }

    const updated = await db.insert(phoneStatus).values({
      studentId,
      status,
      updatedBy: staffId,
    }).returning()

    return NextResponse.json({
      message: "Status updated successfully",
      status: {
        student_id: updated[0].studentId,
        status: updated[0].status,
        last_updated: updated[0].lastUpdated?.toISOString()
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: "Failed to update phone status" }, { status: 500 })
  }
}
