import { db } from "@/db"
import { students, studentStars } from "@/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    // Fetch all students with stars
    const allStudents = await db.select().from(students)
    
    const studentsWithStars = await Promise.all(
      allStudents.map(async (student) => {
        const starRecord = await db
          .select()
          .from(studentStars)
          .where(eq(studentStars.studentId, student.id))
          .then((results) => results[0])

        return {
          id: starRecord?.id || 0,
          studentId: student.id,
          studentName: student.name,
          admissionNumber: student.admissionNumber,
          studentClass: student.className || student.class || null,
          stars: starRecord?.stars || 0,
          awardedBy: starRecord?.awardedBy || 0,
          awardedByName: starRecord?.awardedByName || "System",
          reason: starRecord?.reason || null,
          awardedAt: starRecord?.awardedAt || new Date().toISOString(),
        }
      })
    )

    return NextResponse.json(studentsWithStars)
  } catch (error) {
    console.error("Error fetching students with stars:", error)
    return NextResponse.json(
      { error: "Failed to fetch students with stars" },
      { status: 500 }
    )
  }
}
