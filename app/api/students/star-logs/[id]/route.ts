import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { starHistory } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        const logId = parseInt(id)
        if (isNaN(logId)) {
            return NextResponse.json({ error: "Invalid log ID" }, { status: 400 })
        }

        await db.delete(starHistory).where(eq(starHistory.id, logId))

        return NextResponse.json({ success: true, message: "Log deleted successfully" })
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to delete log"
        console.error("DELETE /api/students/star-logs/[id] error:", errorMessage)
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
