import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { studentFines } from "@/db/schema"

interface BulkFinePayload {
  studentIds: number[]
  fineId: number
  amount: number
  fineName: string
  reason?: string
  issuedByName: string
  issuedById: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as BulkFinePayload
    const { studentIds, fineId, amount, fineName, reason, issuedByName, issuedById } = body

    // Validate
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: "At least one student must be selected" },
        { status: 400 }
      )
    }

    if (!fineId || !amount || !issuedByName || !issuedById) {
      return NextResponse.json(
        { error: "Missing required fields: fineId, amount, issuedByName, issuedById" },
        { status: 400 }
      )
    }

    if (issuedById <= 0) {
      return NextResponse.json(
        { error: "Invalid issued by ID" },
        { status: 400 }
      )
    }

    // Create fines for all selected students
    const createdFines = await db
      .insert(studentFines)
      .values(
        studentIds.map((studentId) => ({
          studentId,
          fineId,
          amount: parseFloat(String(amount)),
          reason: reason || null,
          isPaid: "NO",
          issuedBy: issuedById,
          issuedByName,
        }))
      )
      .returning()

    return NextResponse.json(
      {
        success: true,
        message: `Successfully issued fine to ${createdFines.length} student${createdFines.length !== 1 ? "s" : ""}`,
        finesCount: createdFines.length,
      },
      { status: 201 }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to apply fines"
    console.error("POST /api/fines/apply-bulk error:", errorMessage)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
