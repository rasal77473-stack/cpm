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

    const [grant] = await db
      .select()
      .from(specialPassGrants)
      .where(eq(specialPassGrants.id, grantId))

    if (!grant) {
      return NextResponse.json({ error: "Grant not found" }, { status: 404 })
    }

    // Update grant status to OUT
    const result = await db
      .update(specialPassGrants)
      .set({
        status: "OUT",
      })
      .where(eq(specialPassGrants.id, grantId))
      .returning()

    // Log the out action
    if (grant.mentorId) {
      await db.insert(userActivityLogs).values({
        userId: grant.mentorId,
        action: "OUT_SPECIAL_PASS",
        details: `Student left with special pass. Student ID: ${grant.studentId}. Pass ID: ${grantId}`
      })
    }

    return NextResponse.json({ success: true, message: "Special pass marked as OUT" })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to process out"
    console.error("Failed to mark special pass as OUT:", error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
