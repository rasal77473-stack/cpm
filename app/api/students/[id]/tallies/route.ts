import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { studentTallies } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const studentId = parseInt(id)

    if (!db) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      )
    }

    const tallies = await db
      .select()
      .from(studentTallies)
      .where(eq(studentTallies.studentId, studentId))
      .orderBy(desc(studentTallies.issuedAt))

    return NextResponse.json(tallies)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`GET /api/students/${parseInt(request.nextUrl.pathname.split('/')[3])}/tallies error:`, errorMessage)
    return NextResponse.json(
      { error: "Failed to fetch student tallies", details: errorMessage },
      { status: 500 }
    )
  }
}
