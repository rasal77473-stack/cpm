import { db } from "@/db"
import { students, studentStars, starHistory } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET(req: Request) {
  try {
    // Get all star history logs with student details
    const logs = await db
      .select({
        id: starHistory.id,
        studentId: starHistory.studentId,
        studentName: students.name,
        admissionNumber: students.admissionNumber,
        studentClass: students.className,
        action: starHistory.action,
        stars: starHistory.stars,
        awardedBy: starHistory.awardedBy,
        awardedByName: starHistory.awardedByName,
        timestamp: starHistory.timestamp,
        reason: starHistory.reason,
        currentStars: starHistory.currentStars,
      })
      .from(starHistory)
      .innerJoin(students, eq(starHistory.studentId, students.id))
      .orderBy(starHistory.timestamp)

    // Build summary by aggregating the logs
    const summaryMap = new Map()

    for (const log of logs) {
      const key = log.studentId
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          studentId: log.studentId,
          studentName: log.studentName,
          admissionNumber: log.admissionNumber,
          studentClass: log.studentClass,
          totalStars: 0,
          totalAwarded: 0,
          totalRemoved: 0,
          lastUpdated: log.timestamp,
        })
      }

      const summary = summaryMap.get(key)
      if (log.action === "award") {
        summary.totalAwarded += log.currentStars === 0 ? 0 : 1
      } else if (log.action === "remove") {
        summary.totalRemoved += 1
      }
      summary.lastUpdated = log.timestamp
    }

    // Get current star counts
    const starRecords = await db
      .select({
        studentId: studentStars.studentId,
        currentStars: studentStars.stars,
      })
      .from(studentStars)

    // Update summary with current stars
    const starMap = new Map()
    starRecords.forEach(record => {
      starMap.set(record.studentId, record.currentStars)
    })

    const summary = Array.from(summaryMap.values()).map(item => ({
      ...item,
      totalStars: starMap.get(item.studentId) || 0,
    }))

    return Response.json({ 
      logs: logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      summary 
    })
  } catch (error) {
    console.error("[StarLogs API] Failed to fetch star logs:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[StarLogs API] Error details:", { errorMessage, stack: error instanceof Error ? error.stack : 'N/A' })
    return Response.json(
      { error: "Failed to fetch star logs", details: errorMessage },
      { status: 500 }
    )
  }
}
