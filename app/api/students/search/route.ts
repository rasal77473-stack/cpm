import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { students } from "@/db/schema"
import { ilike, or } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q") || ""

    if (!query) {
      const allStudents = await db.select().from(students)
      return NextResponse.json(allStudents)
    }

    const filtered = await db.select().from(students).where(
      or(
        ilike(students.name, `%${query}%`),
        ilike(students.admission_number, `%${query}%`),
        ilike(students.locker_number, `%${query}%`)
      )
    )

    return NextResponse.json(filtered)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: "Search failed" }, { status: 500 })
  }
}
