import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { studentTallies } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        const tallyId = parseInt(id)
        if (isNaN(tallyId)) {
            return NextResponse.json({ error: "Invalid tally ID" }, { status: 400 })
        }

        await db.delete(studentTallies).where(eq(studentTallies.id, tallyId))
        return NextResponse.json({ success: true, message: "Tally deleted successfully" })
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to delete tally"
        console.error("DELETE /api/tallies/[id] error:", errorMessage)
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
