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

    // Update grant status to OUT immediately (skip the SELECT check - UPDATE is idempotent)
    const [updated] = await db
      .update(specialPassGrants)
      .set({ status: "OUT" })
      .where(eq(specialPassGrants.id, grantId))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: "Special pass not found" }, { status: 404 })
    }

    // Return response IMMEDIATELY - do phone status sync in background
    const response = NextResponse.json({
      success: true,
      message: "Special pass marked as OUT successfully",
      data: { id: updated.id, status: updated.status, timestamp: new Date().toISOString() }
    })

    // Invalidate caches FIRST so any subsequent requests get fresh data
    const { invalidatePassesCache } = require("../../all/route")
    const { invalidatePhoneStatusCache } = require("../../../phone-status/route")
    invalidatePassesCache()
    invalidatePhoneStatusCache()

    // Fire-and-forget: sync phone status + log activity in parallel
    const studentId = updated.studentId
    Promise.all([
      // Upsert phone status
      db.select().from(phoneStatus).where(eq(phoneStatus.studentId, studentId)).limit(1)
        .then(([existing]: any[]) => {
          if (existing) {
            return db.update(phoneStatus).set({
              status: "OUT",
              lastUpdated: new Date().toISOString(),
              updatedBy: updated.mentorName,
              notes: updated.purpose
            }).where(eq(phoneStatus.studentId, studentId))
          } else {
            return db.insert(phoneStatus).values({
              studentId,
              status: "OUT",
              updatedBy: updated.mentorName,
              notes: updated.purpose,
              lastUpdated: new Date().toISOString()
            })
          }
        }),
      // Log activity
      updated.mentorId
        ? db.insert(userActivityLogs).values({
          userId: updated.mentorId,
          action: "OUT_SPECIAL_PASS",
          details: `Student left with special pass. Student ID: ${studentId}. Pass ID: ${grantId}`
        })
        : Promise.resolve()
    ]).catch(() => { })

    return response
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to process OUT request"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
