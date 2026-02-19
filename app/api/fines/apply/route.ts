import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { studentFines, fines, students } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

// POST /api/fines/apply — issue a fine to one or more students
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { studentIds, fineId, amount, reason, issuedBy, issuedByName } = body

        // Support both single studentId and array of studentIds
        const ids: number[] = Array.isArray(studentIds)
            ? studentIds.map(Number)
            : body.studentId
                ? [Number(body.studentId)]
                : []

        if (ids.length === 0 || !fineId || amount === undefined || !issuedBy || !issuedByName) {
            return NextResponse.json(
                { error: "studentIds (or studentId), fineId, amount, issuedBy, and issuedByName are required" },
                { status: 400 }
            )
        }

        const parsedAmount = parseFloat(amount)
        if (isNaN(parsedAmount) || parsedAmount < 0) {
            return NextResponse.json({ error: "Amount must be a valid positive number" }, { status: 400 })
        }

        const results = []
        for (const studentId of ids) {
            const created = await db
                .insert(studentFines)
                .values({
                    studentId,
                    fineId: Number(fineId),
                    amount: parsedAmount,
                    reason: reason ? String(reason).trim() : null,
                    isPaid: "NO",
                    issuedBy: Number(issuedBy),
                    issuedByName: String(issuedByName).trim(),
                })
                .returning()
            results.push(created[0])
        }

        return NextResponse.json(
            { success: true, count: results.length, records: results },
            { status: 201 }
        )
    } catch (error: any) {
        console.error("POST /api/fines/apply error:", error)
        return NextResponse.json({ error: error.message || "Failed to apply fine" }, { status: 500 })
    }
}

// GET /api/fines/apply — get all issued fines, or filter by studentId
export async function GET(request: NextRequest) {
    try {
        const studentId = request.nextUrl.searchParams.get("studentId")

        const records = await db
            .select({
                id: studentFines.id,
                studentId: studentFines.studentId,
                fineId: studentFines.fineId,
                amount: studentFines.amount,
                reason: studentFines.reason,
                isPaid: studentFines.isPaid,
                issuedBy: studentFines.issuedBy,
                issuedByName: studentFines.issuedByName,
                paidDate: studentFines.paidDate,
                issuedAt: studentFines.issuedAt,
                fineName: fines.name,
                studentName: students.name,
                admissionNumber: students.admissionNumber,
                className: students.className,
            })
            .from(studentFines)
            .leftJoin(fines, eq(studentFines.fineId, fines.id))
            .leftJoin(students, eq(studentFines.studentId, students.id))
            .orderBy(desc(studentFines.issuedAt))
            .where(studentId ? eq(studentFines.studentId, Number(studentId)) : undefined as any)

        // If no where clause, fetch all
        if (!studentId) {
            const allRecords = await db
                .select({
                    id: studentFines.id,
                    studentId: studentFines.studentId,
                    fineId: studentFines.fineId,
                    amount: studentFines.amount,
                    reason: studentFines.reason,
                    isPaid: studentFines.isPaid,
                    issuedBy: studentFines.issuedBy,
                    issuedByName: studentFines.issuedByName,
                    paidDate: studentFines.paidDate,
                    issuedAt: studentFines.issuedAt,
                    fineName: fines.name,
                    studentName: students.name,
                    admissionNumber: students.admissionNumber,
                    className: students.className,
                })
                .from(studentFines)
                .leftJoin(fines, eq(studentFines.fineId, fines.id))
                .leftJoin(students, eq(studentFines.studentId, students.id))
                .orderBy(desc(studentFines.issuedAt))

            return NextResponse.json(allRecords)
        }

        return NextResponse.json(records)
    } catch (error: any) {
        console.error("GET /api/fines/apply error:", error)
        if (error.code === "42P01" || error?.message?.includes("does not exist")) {
            return NextResponse.json([])
        }
        return NextResponse.json({ error: error.message || "Failed to fetch fines" }, { status: 500 })
    }
}

// PATCH /api/fines/apply — mark a student fine as paid
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json()
        const { id } = body

        if (!id) {
            return NextResponse.json({ error: "Fine record ID is required" }, { status: 400 })
        }

        const updated = await db
            .update(studentFines)
            .set({
                isPaid: "YES",
                paidDate: new Date().toISOString(),
            })
            .where(eq(studentFines.id, Number(id)))
            .returning()

        if (updated.length === 0) {
            return NextResponse.json({ error: "Fine record not found" }, { status: 404 })
        }

        return NextResponse.json(updated[0])
    } catch (error: any) {
        console.error("PATCH /api/fines/apply error:", error)
        return NextResponse.json({ error: error.message || "Failed to mark fine as paid" }, { status: 500 })
    }
}
