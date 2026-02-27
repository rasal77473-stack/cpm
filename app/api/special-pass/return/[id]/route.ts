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

    if (!grantId || isNaN(grantId)) {
      return NextResponse.json({ error: "Invalid pass ID" }, { status: 400 })
    }

    // Update pass status to COMPLETED immediately (skip SELECT)
    const [updated] = await db
      .update(specialPassGrants)
      .set({
        status: "COMPLETED",
        submissionTime: new Date().toISOString(),
      })
      .where(eq(specialPassGrants.id, grantId))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: "Special pass not found" }, { status: 404 })
    }

    // Wait for everything to sync to prevent SWR race conditions
    const studentId = updated.studentId

    await Promise.all([
      // Update student special_pass to NO
      db.update(students).set({ specialPass: "NO" }).where(eq(students.id, studentId)),
      // Upsert phone status to IN
      db.select().from(phoneStatus).where(eq(phoneStatus.studentId, studentId)).limit(1)
        .then(([existing]: any[]) => {
          if (existing) {
            return db.update(phoneStatus).set({
              status: "IN",
              lastUpdated: new Date().toISOString(),
              updatedBy: updated.mentorName,
              notes: updated.purpose
            }).where(eq(phoneStatus.studentId, studentId))
          } else {
            return db.insert(phoneStatus).values({
              studentId,
              status: "IN",
              updatedBy: updated.mentorName,
              notes: updated.purpose,
              lastUpdated: new Date().toISOString()
            })
          }
        }),
      // Record phone history
      db.insert(phoneHistory).values({
        studentId,
        status: "IN",
        updatedBy: updated.mentorName,
        notes: `PHONE PASS RETURNED: ${updated.purpose}`,
      }),
      // Log activity
      updated.mentorId
        ? db.insert(userActivityLogs).values({
          userId: updated.mentorId,
          action: "RETURN_SPECIAL_PASS",
          details: `Special pass returned for student ${studentId}. Pass ID: ${grantId}`,
        })
        : Promise.resolve()
    ]).catch((err) => {
      console.error("Secondary return error:", err)
    })

    return NextResponse.json({
      success: true,
      message: "Special pass returned successfully",
      data: updated,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to return special pass" }, { status: 500 })
  }
}
