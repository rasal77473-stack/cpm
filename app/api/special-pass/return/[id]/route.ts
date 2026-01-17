import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { specialPassGrants, userActivityLogs, students, phoneStatus } from "@/db/schema"
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

    // Update student's special_pass status to NO
    if (grant) {
      try {
        await db.update(students)
          .set({ special_pass: "NO" })
          .where(eq(students.id, grant.studentId))
      } catch (err) {
        console.error("Error updating student special_pass status:", err)
        // Continue execution, as this is non-critical for the response but important for data integrity
      }

      // Sync main phone status to IN
      try {
        const studentId = grant.studentId
        const [existingStatus] = await db
          .select()
          .from(phoneStatus)
          .where(eq(phoneStatus.studentId, studentId))

        if (existingStatus) {
          await db.update(phoneStatus)
            .set({ status: "IN", lastUpdated: new Date(), updatedBy: "special_pass" })
            .where(eq(phoneStatus.studentId, studentId))
        } else {
          await db.insert(phoneStatus)
            .values({
              studentId,
              status: "IN",
              updatedBy: "special_pass",
              lastUpdated: new Date()
            })
        }
      } catch (err) {
        console.error("Error syncing phone status:", err)
        throw new Error("Failed to sync main phone status: " + (err instanceof Error ? err.message : String(err)))
      }
    }

    // Log the action
    if (grant.mentorId) {
      try {
        await db.insert(userActivityLogs).values({
          userId: grant.mentorId,
          action: "RETURN_SPECIAL_PASS",
          details: `Special pass returned for student ${grant.studentId}. Pass ID: ${grantId}`,
        })
      } catch (e) {
        console.error("Logging failed:", e)
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
