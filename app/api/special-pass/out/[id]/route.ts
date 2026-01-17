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

    // Sync main phone status to OUT (fire and forget)
    const studentId = grant.studentId
    db.select()
      .from(phoneStatus)
      .where(eq(phoneStatus.studentId, studentId))
      .limit(1)
      .then(([existingStatus]) => {
        if (existingStatus) {
          db.update(phoneStatus)
            .set({ status: "OUT", lastUpdated: new Date(), updatedBy: "special_pass" })
            .where(eq(phoneStatus.studentId, studentId))
            .catch(err => console.error("Error updating phone status:", err))
        } else {
          db.insert(phoneStatus)
            .values({
              studentId,
              status: "OUT",
              updatedBy: "special_pass",
              lastUpdated: new Date()
            })
            .catch(err => console.error("Error creating phone status:", err))
        }
      })
      .catch(err => console.error("Error fetching phone status:", err))

    // Log the action in background (fire and forget)
    if (grant.mentorId) {
      db.insert(userActivityLogs).values({
        userId: grant.mentorId,
        action: "OUT_SPECIAL_PASS",
        details: `Student left with special pass. Student ID: ${grant.studentId}. Pass ID: ${grantId}`
      }).catch(err => console.error("Failed to log activity:", err))
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
