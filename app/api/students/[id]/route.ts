import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { students } from "@/db/schema"
import { eq } from "drizzle-orm"

// Transform camelCase Drizzle object to snake_case API response
function transformStudent(student: any) {
  return {
    id: student.id,
    admission_number: student.admissionNumber,
    name: student.name,
    locker_number: student.lockerNumber,
    phone_number: student.phoneNumber,
    class: student.class,
    roll_number: student.rollNumber,
    phone_name: student.phoneName,
    class_name: student.className,
    roll_no: student.rollNo,
    special_pass: student.specialPass,
    created_at: student.createdAt,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = parseInt(params.id)

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
