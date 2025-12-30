import { type NextRequest, NextResponse } from "next/server"

// Mock phone status database (shared state for demo)
const PHONE_STATUS_DB: Record<
  number,
  {
    student_id: number
    status: string
    last_updated: string
  }
> = {
  1: { student_id: 1, status: "OUT", last_updated: new Date(Date.now() - 86400000).toISOString() },
  2: { student_id: 2, status: "IN", last_updated: new Date(Date.now() - 43200000).toISOString() },
  3: { student_id: 3, status: "OUT", last_updated: new Date(Date.now() - 172800000).toISOString() },
  4: { student_id: 4, status: "IN", last_updated: new Date(Date.now() - 3600000).toISOString() },
  5: { student_id: 5, status: "IN", last_updated: new Date().toISOString() },
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const studentId = Number.parseInt(params.id)
    const status = PHONE_STATUS_DB[studentId]

    if (!status) {
      return NextResponse.json({ message: "Status not found" }, { status: 404 })
    }

    return NextResponse.json(status)
  } catch (error) {
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

    PHONE_STATUS_DB[studentId] = {
      student_id: studentId,
      status: status,
      last_updated: new Date().toISOString(),
    }

    return NextResponse.json({
      message: "Status updated successfully",
      status: PHONE_STATUS_DB[studentId],
    })
  } catch (error) {
    return NextResponse.json({ message: "Failed to update phone status" }, { status: 500 })
  }
}
