import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { specialPassGrants } from "@/db/schema"
import { eq } from "drizzle-orm"
import { invalidateCache, PASSES_CACHE_KEY, PHONE_STATUS_CACHE_KEY } from "@/lib/student-cache"

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        const passId = parseInt(id)
        if (isNaN(passId)) {
            return NextResponse.json({ error: "Invalid pass ID" }, { status: 400 })
        }

        await db.delete(specialPassGrants).where(eq(specialPassGrants.id, passId))

        invalidateCache(PASSES_CACHE_KEY)
        invalidateCache(PHONE_STATUS_CACHE_KEY)

        return NextResponse.json({ success: true, message: "Pass deleted successfully" })
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to delete pass"
        console.error("DELETE /api/special-pass/[id] error:", errorMessage)
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
