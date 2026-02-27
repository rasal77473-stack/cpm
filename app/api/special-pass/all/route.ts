import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { specialPassGrants, students } from "@/db/schema"
import { desc, eq } from "drizzle-orm"

// In-memory cache for passes
let passesCache: any[] | null = null
let passesCacheTime = 0
const PASSES_CACHE_TTL = 5000 // 5 seconds

export async function GET(request: NextRequest) {
  try {
    const now = Date.now()

    // Serve from cache if fresh
    if (passesCache && (now - passesCacheTime) < PASSES_CACHE_TTL) {
      return NextResponse.json(passesCache, {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'X-Cache': 'HIT'
        }
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
        status: specialPassGrants.status,
      })
      .from(specialPassGrants)
      .innerJoin(students, eq(specialPassGrants.studentId, students.id))
      .orderBy(desc(specialPassGrants.issueTime))

    // Cache it
    passesCache = allPasses
    passesCacheTime = now

    return NextResponse.json(allPasses, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Cache': 'MISS'
      }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch special passes"
    console.error("GET /api/special-pass/all error:", errorMessage, error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// Export cache invalidator for use after mutations
export function invalidatePassesCache() {
  passesCache = null
  passesCacheTime = 0
}
