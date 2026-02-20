import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { tallyTypes } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const tallyTypeId = parseInt(id)

    if (!db) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { name, type, description } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      )
    }

    const [updated] = await db
      .update(tallyTypes)
      .set({
        name,
        type,
        description: description || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tallyTypes.id, tallyTypeId))
      .returning()

    if (!updated) {
      return NextResponse.json(
        { error: "Tally type not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(updated)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("PUT /api/tally-types/[id] error:", errorMessage)
    return NextResponse.json(
      { error: "Failed to update tally type", details: errorMessage },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const tallyTypeId = parseInt(id)

    if (!db) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { isActive } = body

    if (!isActive) {
      return NextResponse.json(
        { error: "isActive is required" },
        { status: 400 }
      )
    }

    const [updated] = await db
      .update(tallyTypes)
      .set({
        isActive,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tallyTypes.id, tallyTypeId))
      .returning()

    if (!updated) {
      return NextResponse.json(
        { error: "Tally type not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(updated)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("PATCH /api/tally-types/[id] error:", errorMessage)
    return NextResponse.json(
      { error: "Failed to update tally type", details: errorMessage },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const tallyTypeId = parseInt(id)

    if (!db) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      )
    }

    await db
      .delete(tallyTypes)
      .where(eq(tallyTypes.id, tallyTypeId))

    return NextResponse.json({ success: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("DELETE /api/tally-types/[id] error:", errorMessage)
    return NextResponse.json(
      { error: "Failed to delete tally type", details: errorMessage },
      { status: 500 }
    )
  }
}
