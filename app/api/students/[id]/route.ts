import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { students } from "@/db/schema"
import { eq } from "drizzle-orm"

// Transform student data to match frontend expectations (camelCase)
function transformStudent(student: any) {
  return {
    id: student.id,
    name: student.name,
    admissionNumber: student.admissionNumber,
    lockerNumber: student.lockerNumber,
    phoneNumber: student.phoneNumber,
    class: student.class,
    rollNumber: student.rollNumber,
    phoneName: student.phoneName,
    className: student.className,
    rollNo: student.rollNo,
    specialPass: student.specialPass,
    createdAt: student.createdAt,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const studentId = parseInt(id)

    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: "Invalid student ID" },
        { status: 400 }
      )
    }

    const student = await db
      .select()
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1)

    if (!student || student.length === 0) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(transformStudent(student[0]))
  } catch (error) {
    console.error("Error fetching student:", error)
    return NextResponse.json(
      { error: "Failed to fetch student data" },
      { status: 500 }
    )
  }
}
