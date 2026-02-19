import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { studentFines } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fineId = parseInt(params.id)
    const body = await request.json()
    const { isPaid } = body

    if (!fineId || isNaN(fineId)) {
      return NextResponse.json(
        { error: "Invalid fine ID" },
        { status: 400 }
      )
    }

    if (!isPaid || (isPaid !== "YES" && isPaid !== "NO")) {
      return NextResponse.json(
        { error: "isPaid must be 'YES' or 'NO'" },
        { status: 400 }
      )
    }

    // Update the fine
    const [updated] = await db
      .update(studentFines)
      .set({
        isPaid,
        paidDate: isPaid === "YES" ? new Date().toISOString() : null,
      })
      .where(eq(studentFines.id, fineId))
      .returning()

    if (!updated) {
      return NextResponse.json(
        { error: "Fine not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(updated)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update fine"
    console.error("PUT /api/fines/student-fines/[id] error:", errorMessage)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
