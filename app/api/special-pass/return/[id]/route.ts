import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { specialPassGrants, students, userActivityLogs } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const grantId = parseInt(id)

    const [grant] = await db
      .select()
      .from(specialPassGrants)
      .where(eq(specialPassGrants.id, grantId))

    if (!grant) {
      return NextResponse.json({ error: "Grant not found" }, { status: 404 })
    }

    // Update grant status and return time
    const result = await db
      .update(specialPassGrants)
      .set({
        status: "COMPLETED",
        returnTime: new Date(),
      })
      .where(eq(specialPassGrants.id, grantId))
      .returning()

    // Log the return action
    if (grant.mentorId) {
      await db.insert(userActivityLogs).values({
        userId: grant.mentorId,
        action: "RETURN_SPECIAL_PASS",
        details: `Special pass returned for student ID: ${grant.studentId}. Pass ID: ${grantId}`
      })
    }

    return NextResponse.json({ success: true, message: "Special pass completed successfully" })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to process return"
    console.error("Failed to return special pass:", error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
