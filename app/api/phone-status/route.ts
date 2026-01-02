import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { phoneStatus } from "@/db/schema"
import { desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const allStatus = await db.select().from(phoneStatus).orderBy(desc(phoneStatus.lastUpdated))
    
    // Convert array to record for dashboard
    const statusMap = allStatus.reduce((acc, curr) => {
      // Since we want the LATEST status for each student, and we ordered by desc,
      // the first one we encounter is the latest
      if (!acc[curr.studentId]) {
        acc[curr.studentId] = {
          student_id: curr.studentId,
          status: curr.status,
          last_updated: curr.lastUpdated?.toISOString() || new Date().toISOString()
        }
      }
      return acc
    }, {} as Record<number, any>)

    return NextResponse.json(statusMap, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30'
      }
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: "Failed to fetch phone status" }, { status: 500 })
  }
}
