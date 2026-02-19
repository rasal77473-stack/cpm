import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { studentFines, fines } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = parseInt(params.id)

    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: "Invalid student ID" },
        { status: 400 }
      )
    }

    // Get student fines
    const result = await db
      .select({
        id: studentFines.id,
        studentId: studentFines.studentId,
        fineName: fines.name,
        amount: studentFines.amount,
        reason: studentFines.reason,
        isPaid: studentFines.isPaid,
        issuedAt: studentFines.issuedAt,
        issuedByName: studentFines.issuedByName,
        paidDate: studentFines.paidDate,
      })
      .from(studentFines)
      .leftJoin(fines, eq(studentFines.fineId, fines.id))
      .where(eq(studentFines.studentId, studentId))
      .orderBy(desc(studentFines.issuedAt))

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching fines:", error)
    return NextResponse.json(
      { error: "Failed to fetch fines" },
      { status: 500 }
    )
  }
}
