import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { specialPassGrants } from "@/db/schema"
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
    // We don't reset student special_pass to NO yet, that happens on IN (return)
    await db
      .update(specialPassGrants)
      .set({
        status: "OUT",
      })
      .where(eq(specialPassGrants.id, grantId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to mark special pass as OUT:", error)
    return NextResponse.json({ error: "Failed to process out" }, { status: 500 })
  }
}
