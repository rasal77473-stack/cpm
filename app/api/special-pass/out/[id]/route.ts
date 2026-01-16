import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { specialPassGrants, userActivityLogs } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const grantId = parseInt(id)

    console.log(`Processing OUT request for pass ID: ${grantId}`)

    // Check if grant exists
    const [grant] = await db
      .select()
      .from(specialPassGrants)
      .where(eq(specialPassGrants.id, grantId))

    if (!grant) {
      console.warn(`Pass ID ${grantId} not found`)
      return NextResponse.json({ error: "Special pass not found" }, { status: 404 })
    }

    // Update grant status to OUT
    const [updated] = await db
      .update(specialPassGrants)
      .set({
        status: "OUT",
      })
      .where(eq(specialPassGrants.id, grantId))
      .returning()

    console.log(`Successfully marked pass ${grantId} as OUT`)

    // Log the action
    if (grant.mentorId) {
      try {
        await db.insert(userActivityLogs).values({
          userId: grant.mentorId,
          action: "OUT_SPECIAL_PASS",
          details: `Student left with special pass. Student ID: ${grant.studentId}. Pass ID: ${grantId}`
        })
      } catch (logError) {
        console.error("Failed to log activity:", logError)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Special pass marked as OUT successfully",
      data: {
        id: updated.id,
        status: updated.status,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to process OUT request"
    console.error("Error in POST /api/special-pass/out/[id]:", errorMessage, error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
