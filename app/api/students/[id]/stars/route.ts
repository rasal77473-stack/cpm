import { db } from "@/db"
import { studentStars, students } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = parseInt(params.id, 10)

    // Get student stars record, create one if doesn't exist
    let starRecord = await db
      .select()
      .from(studentStars)
      .where(eq(studentStars.studentId, studentId))
      .then((results) => results[0])

    if (!starRecord) {
      // Create a new record with 0 stars
      const inserted = await db
        .insert(studentStars)
        .values({
          studentId,
          stars: 0,
          awardedBy: 0,
          awardedByName: "System",
          reason: "Initial record",
        })
        .returning()

      starRecord = inserted[0]
    }

    return Response.json(starRecord)
  } catch (error) {
    console.error("Error fetching stars:", error)
    return Response.json(
      { error: "Failed to fetch stars" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { action, stars, awardedBy, awardedByName, reason } = body
    const studentId = parseInt(params.id, 10)

    // Verify student exists
    const student = await db
      .select()
      .from(students)
      .where(eq(students.id, studentId))
      .then((results) => results[0])

    if (!student) {
      return Response.json(
        { error: "Student not found" },
        { status: 404 }
      )
    }

    // Get or create stars record
    let starRecord = await db
      .select()
      .from(studentStars)
      .where(eq(studentStars.studentId, studentId))
      .then((results) => results[0])

    if (!starRecord) {
      const inserted = await db
        .insert(studentStars)
        .values({
          studentId,
          stars: 0,
          awardedBy,
          awardedByName,
          reason,
        })
        .returning()

      starRecord = inserted[0]
    }

    if (action === "award") {
      const newStarCount = Math.max(0, (starRecord.stars || 0) + stars)
      const updated = await db
        .update(studentStars)
        .set({
          stars: newStarCount,
          awardedBy,
          awardedByName,
          reason,
          awardedAt: new Date().toISOString(),
        })
        .where(eq(studentStars.studentId, studentId))
        .returning()

      return Response.json(updated[0])
    } else if (action === "remove") {
      const newStarCount = Math.max(0, (starRecord.stars || 0) - stars)
      const updated = await db
        .update(studentStars)
        .set({
          stars: newStarCount,
          awardedBy,
          awardedByName,
          reason,
          awardedAt: new Date().toISOString(),
        })
        .where(eq(studentStars.studentId, studentId))
        .returning()

      return Response.json(updated[0])
    } else {
      return Response.json(
        { error: "Invalid action" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Error updating stars:", error)
    return Response.json(
      { error: "Failed to update stars" },
      { status: 500 }
    )
  }
}
