import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { phoneStatus, students } from "@/db/schema"
import { desc, eq } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const studentId = searchParams.get("studentId")

    let query = db
      .select({
        id: phoneStatus.id,
        student_id: phoneStatus.studentId,
        student_name: students.name,
        staff_id: phoneStatus.updatedBy,
        staff_name: phoneStatus.updatedBy, // Using updatedBy as staff_name for now
        action: phoneStatus.status,
        notes: phoneStatus.notes,
        timestamp: phoneStatus.lastUpdated,
      })
      .from(phoneStatus)
      .innerJoin(students, eq(phoneStatus.studentId, students.id))
      .orderBy(desc(phoneStatus.lastUpdated))

    if (studentId) {
      // @ts-ignore - query type refinement
      query = query.where(eq(phoneStatus.studentId, Number.parseInt(studentId)))
    }

    const result = await query

    return NextResponse.json(result)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch phone history"
    console.error("GET /api/phone-history error:", errorMessage, error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
