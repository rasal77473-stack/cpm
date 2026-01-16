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

    // Validate pass ID
    if (!grantId || isNaN(grantId)) {
      return NextResponse.json(
        { error: "Invalid pass ID" },
        { status: 400 }
      )
    }

    // Find the grant
    const [grant] = await db
      .select()
      .from(specialPassGrants)
      .where(eq(specialPassGrants.id, grantId))

    if (!grant) {
      return NextResponse.json(
        { error: "Special pass not found" },
        { status: 404 }
      )
    }

    // Mark pass as completed
    const [updated] = await db
      .update(specialPassGrants)
      .set({
        status: "COMPLETED",
        returnTime: new Date(),
      })
      .where(eq(specialPassGrants.id, grantId))
      .returning()

    // Log the action
    if (grant.mentorId) {
      await db.insert(userActivityLogs).values({
        userId: grant.mentorId,
        action: "RETURN_SPECIAL_PASS",
        details: `Special pass returned for student ${grant.studentId}. Pass ID: ${grantId}`,
      })
    }

    return NextResponse.json(
      {
        success: true,
        message: "Special pass returned successfully",
        data: updated,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("POST /api/special-pass/return/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to return special pass" },
      { status: 500 }
    )
  }
}
