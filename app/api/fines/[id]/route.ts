import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { fines } from "@/db/schema"
import { eq } from "drizzle-orm"
import { invalidateCache, FINES_CACHE_KEY } from "@/lib/student-cache"

// PUT /api/fines/[id] — update fine type
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id)
        if (isNaN(id)) {
            return NextResponse.json({ error: "Invalid fine ID" }, { status: 400 })
        }

        const body = await request.json()
        const { name, amount, description, isActive } = body

        if (!name || amount === undefined || amount === null) {
            return NextResponse.json({ error: "Name and amount are required" }, { status: 400 })
        }

        const parsedAmount = parseFloat(amount)
        if (isNaN(parsedAmount) || parsedAmount < 0) {
            return NextResponse.json({ error: "Amount must be a valid positive number" }, { status: 400 })
        }

        const updated = await db
            .update(fines)
            .set({
                name: String(name).trim(),
                amount: parsedAmount,
                description: description ? String(description).trim() : null,
                isActive: isActive ?? "YES",
                updatedAt: new Date().toISOString(),
            })
            .where(eq(fines.id, id))
            .returning()

        if (updated.length === 0) {
            return NextResponse.json({ error: "Fine not found" }, { status: 404 })
        }

        invalidateCache(FINES_CACHE_KEY)
        return NextResponse.json(updated[0])
    } catch (error: any) {
        console.error("PUT /api/fines/[id] error:", error)
        return NextResponse.json({ error: error.message || "Failed to update fine" }, { status: 500 })
    }
}

// DELETE /api/fines/[id] — delete a fine type
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id)
        if (isNaN(id)) {
            return NextResponse.json({ error: "Invalid fine ID" }, { status: 400 })
        }

        const deleted = await db.delete(fines).where(eq(fines.id, id)).returning()

        if (deleted.length === 0) {
            return NextResponse.json({ error: "Fine not found" }, { status: 404 })
        }

        invalidateCache(FINES_CACHE_KEY)
        return NextResponse.json({ success: true, message: "Fine deleted successfully" })
    } catch (error: any) {
        console.error("DELETE /api/fines/[id] error:", error)
        return NextResponse.json({ error: error.message || "Failed to delete fine" }, { status: 500 })
    }
}
