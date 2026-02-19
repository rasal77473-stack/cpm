import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { studentFines, students, fines } from "@/db/schema"
import { eq, desc, ilike, and, sql } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const classFilter = searchParams.get("class") || ""
    const statusFilter = searchParams.get("status") || "" // "pending" or "paid"

    // Build the query with joins
    let query = db
      .select({
        id: studentFines.id,
        studentId: studentFines.studentId,
        studentName: students.name,
        studentClass: students.class,
        admissionNumber: students.admissionNumber,
        fineId: studentFines.fineId,
        fineName: fines.name,
        amount: studentFines.amount,
        reason: studentFines.reason,
        isPaid: studentFines.isPaid,
        issuedBy: studentFines.issuedBy,
        issuedByName: studentFines.issuedByName,
        paidDate: studentFines.paidDate,
        issuedAt: studentFines.issuedAt,
      })
      .from(studentFines)
      .innerJoin(students, eq(studentFines.studentId, students.id))
      .leftJoin(fines, eq(studentFines.fineId, fines.id))

    // Build WHERE conditions
    const conditions: any[] = []

    // Search by student name or admission number
    if (search) {
      conditions.push(
        sql`(${ilike(students.name, `%${search}%`)} OR ${ilike(students.admissionNumber, `%${search}%`)})`
      )
    }

    // Filter by class
    if (classFilter && classFilter !== "all") {
      conditions.push(eq(students.class, classFilter))
    }

    // Filter by status
    if (statusFilter === "pending") {
      conditions.push(eq(studentFines.isPaid, "NO"))
    } else if (statusFilter === "paid") {
      conditions.push(eq(studentFines.isPaid, "YES"))
    }

    // Apply conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    // Order: pending first, then by issued date
    const result = await query.orderBy(
      desc(sql`CASE WHEN ${studentFines.isPaid} = 'NO' THEN 0 ELSE 1 END`),
      desc(studentFines.issuedAt)
    )

    return NextResponse.json(result)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch fines"
    console.error("GET /api/fines/student-fines error:", errorMessage)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
