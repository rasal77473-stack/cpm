import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { specialPassGrants, students } from "@/db/schema"
import { desc, eq } from "drizzle-orm"
import { getCached, setCache } from "@/lib/student-cache"

const PASSES_CACHE_KEY = "all_special_passes"
const PASSES_TTL = 15 * 1000 // 15 seconds - passes change frequently

export async function GET(request: NextRequest) {
  try {
    // Serve from cache instantly if available (15s TTL for pass freshness)
    const cached = getCached<any[]>(PASSES_CACHE_KEY)
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': 'no-store, max-age=0' }
      })
    }

    const allPasses = await db
      .select({
        id: specialPassGrants.id,
        studentId: specialPassGrants.studentId,
        studentName: students.name,
        admissionNumber: students.admissionNumber,
        className: students.className,
        lockerNumber: students.lockerNumber,
        rollNo: students.rollNo,
        phoneName: students.phoneName,
        mentorName: specialPassGrants.mentorName,
        purpose: specialPassGrants.purpose,
        issueTime: specialPassGrants.issueTime,
        returnTime: specialPassGrants.returnTime,
        submissionTime: specialPassGrants.submissionTime,
        expectedReturnDate: specialPassGrants.expectedReturnDate,
        expectedReturnTime: specialPassGrants.expectedReturnTime,
        status: specialPassGrants.status,
      })
      .from(specialPassGrants)
      .innerJoin(students, eq(specialPassGrants.studentId, students.id))
      .orderBy(desc(specialPassGrants.issueTime))

    setCache(PASSES_CACHE_KEY, allPasses, PASSES_TTL)

    return NextResponse.json(allPasses, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch special passes"
    console.error("GET /api/special-pass/all error:", errorMessage, error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
