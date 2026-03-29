import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { tallyTypes } from "@/db/schema"
import { desc } from "drizzle-orm"

export async function GET() {
  try {
    if (!db) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      )
    }

    const types = await db
      .select()
      .from(tallyTypes)
      .orderBy(desc(tallyTypes.createdAt))

    return NextResponse.json(types)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("GET /api/tally-types error:", errorMessage)
    return NextResponse.json(
      { error: "Failed to fetch tally types", details: errorMessage },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { name, type, description, tallyValue } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      )
    }

    if (!["NORMAL", "FIXED"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be NORMAL or FIXED" },
        { status: 400 }
      )
    }

    const [newType] = await db
      .insert(tallyTypes)
      .values({
        name,
        type,
        description: description || null,
        tallyValue: tallyValue || 1, // Default to 1 if not provided
        isActive: "YES",
      })
      .returning()

    return NextResponse.json(newType, { status: 201 })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("POST /api/tally-types error:", errorMessage)
    return NextResponse.json(
      { error: "Failed to create tally type", details: errorMessage },
      { status: 500 }
    )
  }
}
