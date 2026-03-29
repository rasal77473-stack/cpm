import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { phoneHistory } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const studentId = parseInt(id)

    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: "Invalid student ID" },
        { status: 400 }
      )
    }

    const history = await db
      .select()
      .from(phoneHistory)
      .where(eq(phoneHistory.studentId, studentId))
      .orderBy(desc(phoneHistory.timestamp)) // Newest first

    return NextResponse.json(history)
  } catch (error) {
    console.error("Error fetching phone history:", error)
    return NextResponse.json(
      { error: "Failed to fetch phone history" },
      { status: 500 }
    )
  }
}
