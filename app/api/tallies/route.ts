import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { studentTallies, students } from "@/db/schema"
import { desc } from "drizzle-orm"
import { sql } from "drizzle-orm"

// Transform database object to API response
function transformTally(tally: any, student: any) {
  return {
    id: tally.id,
    studentId: tally.studentId,
    studentName: student.name,
    studentClass: student.className,
    admissionNumber: student.admissionNumber,
    tallyTypeId: tally.tallyTypeId,
    tallyTypeName: tally.tallyTypeName,
    tallyType: tally.tallyType,
    count: tally.count || 1, // Include count field
    reason: tally.reason,
    issuedBy: tally.issuedBy,
    issuedByName: tally.issuedByName,
    issuedAt: tally.issuedAt,
  }
}

export async function GET() {
  try {
    if (!db) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      )
    }

    // Fetch all tallies with student info
    const tallies = await db
      .select({
        tally: studentTallies,
        student: students,
      })
      .from(studentTallies)
      .innerJoin(students, sql`${studentTallies.studentId} = ${students.id}`)
      .orderBy(desc(studentTallies.issuedAt))

    const transformedTallies = tallies.map((row) =>
      transformTally(row.tally, row.student)
    )

    return NextResponse.json(transformedTallies, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("GET /api/tallies error:", errorMessage)
    return NextResponse.json(
      { error: "Failed to fetch tallies", details: errorMessage },
      { status: 500 }
    )
  }
}
