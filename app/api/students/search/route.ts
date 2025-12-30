import { type NextRequest, NextResponse } from "next/server"

const STUDENTS_DB = [
  {
    id: 1,
    admission_number: "ADM001",
    name: "Rajesh Kumar",
    locker_number: "L-101",
  },
  {
    id: 2,
    admission_number: "ADM002",
    name: "Priya Singh",
    locker_number: "L-102",
  },
  {
    id: 3,
    admission_number: "ADM003",
    name: "Amit Patel",
    locker_number: "L-103",
  },
  {
    id: 4,
    admission_number: "ADM004",
    name: "Neha Sharma",
    locker_number: "L-104",
  },
  {
    id: 5,
    admission_number: "ADM005",
    name: "Rohan Verma",
    locker_number: "L-105",
  },
]

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")?.toLowerCase() || ""

    if (!query) {
      return NextResponse.json(STUDENTS_DB)
    }

    const filtered = STUDENTS_DB.filter(
      (student) =>
        student.name.toLowerCase().includes(query) ||
        student.admission_number.toLowerCase().includes(query) ||
        student.locker_number.toLowerCase().includes(query),
    )

    return NextResponse.json(filtered)
  } catch (error) {
    return NextResponse.json({ message: "Search failed" }, { status: 500 })
  }
}
