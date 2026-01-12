import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { userActivityLogs } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = Number.parseInt(id)
    const logs = await db.select().from(userActivityLogs).where(eq(userActivityLogs.userId, userId)).orderBy(desc(userActivityLogs.timestamp))
    return NextResponse.json(logs)
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch logs" }, { status: 500 })
  }
}
