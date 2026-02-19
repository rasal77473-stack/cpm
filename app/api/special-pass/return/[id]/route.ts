import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { specialPassGrants, userActivityLogs, students, phoneStatus, phoneHistory } from "@/db/schema"
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

    // Mark pass as completed with submission time
    const [updated] = await db
      .update(specialPassGrants)
      .set({
        status: "COMPLETED",
        submissionTime: new Date(),
      })
      .where(eq(specialPassGrants.id, grantId))
      .returning()

    // Update student's special_pass status and sync phone status in background (fire and forget)
    if (grant) {
      const studentId = grant.studentId

      // Sync main phone status to IN (synchronous)
      const [existingStatus] = await db
        .select()
        .from(phoneStatus)
        .where(eq(phoneStatus.studentId, studentId))
        .limit(1)

      if (existingStatus) {
        await db.update(phoneStatus)
          .set({
            status: "IN",
            lastUpdated: new Date(),
            updatedBy: grant.mentorName,
            notes: grant.purpose
          })
          .where(eq(phoneStatus.studentId, studentId))
      } else {
        await db.insert(phoneStatus)
          .values({
            studentId,
            status: "IN",
            updatedBy: grant.mentorName,
            notes: grant.purpose,
            lastUpdated: new Date()
          })
      }

      // Record to phone history - mark as IN (phone returned)
      await db.insert(phoneHistory).values({
        studentId,
        status: "IN",
        updatedBy: grant.mentorName,
        notes: `PHONE PASS RETURNED: ${grant.purpose}`,
      })
      console.log(`📜 Phone history recorded: student ${studentId} marked as IN (pass returned)`)

      // Log the action in background
      if (grant.mentorId) {
        db.insert(userActivityLogs).values({
          userId: grant.mentorId,
          action: "RETURN_SPECIAL_PASS",
          details: `Special pass returned for student ${grant.studentId}. Pass ID: ${grantId}`,
        }).catch(err => console.error("Logging failed:", err))
      }
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
