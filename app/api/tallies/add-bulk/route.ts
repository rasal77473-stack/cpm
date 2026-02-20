import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { studentTallies } from "@/db/schema"

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const {
      studentIds,
      tallyTypeId,
      tallyTypeName,
      tallyType,
      reason,
      issuedByName,
      issuedById,
    } = body

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: "At least one student must be selected" },
        { status: 400 }
      )
    }

    if (!tallyTypeId || !tallyTypeName || !tallyType) {
      return NextResponse.json(
        { error: "Tally type information is required" },
        { status: 400 }
      )
    }

    if (!issuedById || !issuedByName) {
      return NextResponse.json(
        { error: "Issuer information is required" },
        { status: 400 }
      )
    }

    // Create tally records for each student
    const tallyRecords = studentIds.map((studentId: number) => ({
      studentId,
      tallyTypeId,
      tallyTypeName,
      tallyType,
      reason: reason || null,
      issuedBy: issuedById,
      issuedByName,
    }))

    await db.insert(studentTallies).values(tallyRecords)

    return NextResponse.json(
      {
        message: `Successfully added tally to ${studentIds.length} student${studentIds.length !== 1 ? "s" : ""}`,
        count: studentIds.length,
      },
      { status: 201 }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("POST /api/tallies/add-bulk error:", errorMessage)
    return NextResponse.json(
      { error: "Failed to add tallies", details: errorMessage },
      { status: 500 }
    )
  }
}
