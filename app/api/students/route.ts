import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { students } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")

    if (id) {
      const student = await db.query.students.findFirst({
        where: eq(students.id, Number.parseInt(id))
      })
      if (!student) {
        return NextResponse.json({ message: "Student not found" }, { status: 404 })
      }
      return NextResponse.json(student)
    }

    const allStudents = await db.select().from(students)
    return NextResponse.json(allStudents)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: "Failed to fetch students" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const newStudent = await db.insert(students).values({
      admission_number: data.admission_number,
      name: data.name,
      locker_number: data.locker_number,
    }).returning()
    
    return NextResponse.json(newStudent[0])
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: "Failed to create student" }, { status: 500 })
  }
}
