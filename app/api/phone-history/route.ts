import { type NextRequest, NextResponse } from "next/server"

// Mock phone history database
const PHONE_HISTORY_DB: Array<{
  id: number
  student_id: number
  student_name: string
  staff_id: number
  staff_name: string
  action: string
  notes: string
  timestamp: string
}> = [
  {
    id: 1,
    student_id: 1,
    student_name: "Rajesh Kumar",
    staff_id: 1,
    staff_name: "Admin User",
    action: "OUT",
    notes: "Student left for home",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 2,
    student_id: 2,
    student_name: "Priya Singh",
    staff_id: 1,
    staff_name: "Admin User",
    action: "IN",
    notes: "Student returned",
    timestamp: new Date(Date.now() - 43200000).toISOString(),
  },
]

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const studentId = searchParams.get("studentId")

    let result = PHONE_HISTORY_DB

    if (studentId) {
      result = PHONE_HISTORY_DB.filter((h) => h.student_id === Number.parseInt(studentId))
    }

    // Sort by timestamp descending
    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch history" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { student_id, student_name, staff_id, staff_name, action, notes } = await request.json()

    const historyEntry = {
      id: PHONE_HISTORY_DB.length + 1,
      student_id,
      student_name,
      staff_id,
      staff_name,
      action,
      notes,
      timestamp: new Date().toISOString(),
    }

    PHONE_HISTORY_DB.push(historyEntry)

    return NextResponse.json({ message: "History logged", history: historyEntry }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ message: "Failed to log history" }, { status: 500 })
  }
}
