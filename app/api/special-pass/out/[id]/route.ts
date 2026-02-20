import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { specialPassGrants, userActivityLogs, phoneStatus } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const grantId = parseInt(id)

    // Check if grant exists
    const [grant] = await db
      .select()
      .from(specialPassGrants)
      .where(eq(specialPassGrants.id, grantId))

    if (!grant) {
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

    // Sync main phone status to OUT (synchronous)
    const studentId = grant.studentId
    const [existingStatus] = await db
      .select()
      .from(phoneStatus)
      .where(eq(phoneStatus.studentId, studentId))
      .limit(1)

    if (existingStatus) {
      await db.update(phoneStatus)
        .set({
          status: "OUT",
          lastUpdated: new Date().toISOString(),
          updatedBy: grant.mentorName,
          notes: grant.purpose
        })
        .where(eq(phoneStatus.studentId, studentId))
    } else {
      await db.insert(phoneStatus)
        .values({
          studentId,
          status: "OUT",
          updatedBy: grant.mentorName,
          notes: grant.purpose,
          lastUpdated: new Date().toISOString()
        })
    }

    // Log the action in background (fire and forget)
    if (grant.mentorId) {
      db.insert(userActivityLogs).values({
        userId: grant.mentorId,
        action: "OUT_SPECIAL_PASS",
        details: `Student left with special pass. Student ID: ${grant.studentId}. Pass ID: ${grantId}`
      }).catch(err => {})
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
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
