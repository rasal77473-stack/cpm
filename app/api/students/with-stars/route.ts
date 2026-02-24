import { db } from "@/db"
import { students, studentStars } from "@/db/schema"
import { eq, isNull } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    console.log("[WithStars API] Starting query...")
    
    // First, get all students (to ensure we have them)
    const allStudents = await db
      .select({
        id: students.id,
        name: students.name,
        admissionNumber: students.admissionNumber,
        className: students.class_name,
      })
      .from(students)

    console.log(`[WithStars API] Found ${allStudents.length} total students`)

    // Then get all student stars records
    const allStars = await db
      .select({
        id: studentStars.id,
        studentId: studentStars.studentId,
        stars: studentStars.stars,
        awardedBy: studentStars.awardedBy,
        awardedByName: studentStars.awardedByName,
        reason: studentStars.reason,
        awardedAt: studentStars.awardedAt,
      })
      .from(studentStars)

    console.log(`[WithStars API] Found ${allStars.length} star records`)
    if (allStars.length > 0) {
      console.log("[WithStars API] Sample star records:", allStars.slice(0, 3))
    }

    // Now merge them in JavaScript
    const transformed = allStudents.map((student) => {
      const starRecord = allStars.find((s) => s.studentId === student.id)
      return {
        id: starRecord?.id || 0,
        studentId: student.id,
        studentName: student.name,
        admissionNumber: student.admissionNumber,
        studentClass: student.className || null,
        stars: starRecord?.stars || 0,
        awardedBy: starRecord?.awardedBy || 0,
        awardedByName: starRecord?.awardedByName || "System",
        reason: starRecord?.reason || null,
        awardedAt: starRecord?.awardedAt || new Date().toISOString(),
      }
    })

    const withStars = transformed.filter(s => s.stars > 0)
    console.log(`[WithStars API] Returning ${transformed.length} students, ${withStars.length} with stars`)
    if (withStars.length > 0) {
      console.log("[WithStars API] Students with stars:", withStars)
    }

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
