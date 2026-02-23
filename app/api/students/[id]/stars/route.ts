import { db } from "@/db"
import { studentStars, students, starHistory } from "@/db/schema"
import { eq } from "drizzle-orm"

// Helper function to verify authentication
function verifyAuth(request: Request): boolean {
  console.log("[StarAuth] Checking authentication...")
  const authHeader = request.headers.get("Authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("[StarAuth] No valid auth header found")
    return false
  }
  console.log("[StarAuth] ✓ Authorization header present")
  return true
}

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

    console.log(`[StarAPI] Processing ${action} action for student ${studentId}:`, { stars, awardedBy, awardedByName })

    // Verify student exists
    const student = await db
      .select()
      .from(students)
      .where(eq(students.id, studentId))
      .then((results) => results[0])

    if (!student) {
      console.error(`[StarAPI] Student ${studentId} not found`)
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
      console.log(`[StarAPI] Creating new star record for student ${studentId}`)
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
      console.log(`[StarAPI] Awarding ${stars} stars to student ${studentId}. New count: ${newStarCount}`)
      
      try {
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

        console.log(`[StarAPI] Updated studentStars:`, updated[0])

        // Log to star history with explicit timestamp
        try {
          const historyInsert = await db
            .insert(starHistory)
            .values({
              studentId,
              action: "award",
              stars,
              awardedBy,
              awardedByName,
              reason: reason || null,
              currentStars: newStarCount,
              timestamp: new Date().toISOString(),
            })
            .returning()

          console.log(`[StarAPI] Inserted to star history:`, historyInsert[0])
        } catch (historyError) {
          console.error(`[StarAPI] Error inserting to history:`, historyError)
          // Still return success even if history fails, but log it
        }

        return Response.json({ success: true, data: updated[0] })
      } catch (updateError) {
        console.error(`[StarAPI] Error updating student stars:`, updateError)
        throw updateError
      }
    } else if (action === "remove") {
      const newStarCount = Math.max(0, (starRecord.stars || 0) - stars)
      console.log(`[StarAPI] Removing ${stars} stars from student ${studentId}. New count: ${newStarCount}`)
      
      try {
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

        // Log to star history with explicit timestamp
        try {
          await db
            .insert(starHistory)
            .values({
              studentId,
              action: "remove",
              stars,
              awardedBy,
              awardedByName,
              reason: reason || null,
              currentStars: newStarCount,
              timestamp: new Date().toISOString(),
            })
            .returning()
        } catch (historyError) {
          console.error(`[StarAPI] Error inserting to history:`, historyError)
          // Still return success even if history fails
        }

        return Response.json({ success: true, data: updated[0] })
      } catch (updateError) {
        console.error(`[StarAPI] Error updating student stars:`, updateError)
        throw updateError
      }
    } else {
      console.error(`[StarAPI] Invalid action: ${action}`)
      return Response.json(
        { error: "Invalid action" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("[StarAPI] Error updating stars:", error)
    return Response.json(
      { error: `Failed to update stars: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}
