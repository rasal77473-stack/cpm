import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { fines } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getCached, setCache, invalidateCache, FINES_CACHE_KEY } from "@/lib/student-cache"

// GET /api/fines/all — list all fine types
export async function GET() {
    try {
        // Check cache first
        const cached = getCached<any[]>(FINES_CACHE_KEY)
        if (cached) {
            return NextResponse.json(cached)
        }

        const allFines = await db.select().from(fines).orderBy(fines.createdAt)
        setCache(FINES_CACHE_KEY, allFines)
        return NextResponse.json(allFines)
    } catch (error: any) {
        console.error("GET /api/fines/all error:", error)
        if (error.code === "42P01" || error?.message?.includes("does not exist")) {
            return NextResponse.json([])
        }
        return NextResponse.json({ error: error.message || "Failed to fetch fines" }, { status: 500 })
    }
}

// POST /api/fines/all — create a new fine type
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, amount, description } = body

        if (!name || amount === undefined || amount === null) {
            return NextResponse.json({ error: "Name and amount are required" }, { status: 400 })
        }

        const parsedAmount = parseFloat(amount)
        if (isNaN(parsedAmount) || parsedAmount < 0) {
            return NextResponse.json({ error: "Amount must be a valid positive number" }, { status: 400 })
        }

        const created = await db
            .insert(fines)
            .values({
                name: String(name).trim(),
                amount: parsedAmount,
                description: description ? String(description).trim() : null,
                isActive: "YES",
            })
            .returning()

        invalidateCache(FINES_CACHE_KEY)
        return NextResponse.json(created[0], { status: 201 })
    } catch (error: any) {
        console.error("POST /api/fines/all error:", error)
        return NextResponse.json({ error: error.message || "Failed to create fine" }, { status: 500 })
    }
}
