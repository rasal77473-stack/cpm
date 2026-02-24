import { db } from "@/db"
import { students, studentStars } from "@/db/schema"
import { eq, isNull } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    // Single optimized query using LEFT JOIN to get all students with their stars
    const studentsWithStars = await db
      .select({
        starId: studentStars.id,
        studentId: students.id,
        studentName: students.name,
        admissionNumber: students.admissionNumber,
        studentClass: students.class_name,
        stars: studentStars.stars,
        awardedBy: studentStars.awardedBy,
        awardedByName: studentStars.awardedByName,
        reason: studentStars.reason,
        awardedAt: studentStars.awardedAt,
      })
      .from(students)
      .leftJoin(studentStars, eq(students.id, studentStars.studentId))
      .execute()

    // Transform the result to handle null star records
    const transformed = studentsWithStars.map((row) => ({
      id: row.starId || 0,
      studentId: row.studentId,
      studentName: row.studentName,
      admissionNumber: row.admissionNumber,
      studentClass: row.studentClass || null,
      stars: row.stars || 0,
      awardedBy: row.awardedBy || 0,
      awardedByName: row.awardedByName || "System",
      reason: row.reason || null,
      awardedAt: row.awardedAt || new Date().toISOString(),
    }))

    console.log(`[WithStars API] Returning ${transformed.length} students, ${transformed.filter(s => s.stars > 0).length} with stars`)

    return NextResponse.json(transformed, {
      headers: {
        "Cache-Control": "public, s-maxage=0, must-revalidate",
      },
    })
  } catch (error) {
    console.error("Error fetching students with stars:", error)
    return NextResponse.json(
      { error: "Failed to fetch students with stars" },
      { status: 500 }
    )
  }
}
