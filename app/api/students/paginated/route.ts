import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { students } from "@/db/schema"
import { ilike, desc } from "drizzle-orm"

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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const search = searchParams.get("search") || ""
    const pageSize = 50 // Load 50 students per page

    let query = db.select().from(students)

    // Search by name or admission number
    if (search) {
      query = query.where(
        search.includes("+") 
          ? ilike(students.admissionNumber, `%${search}%`)
          : ilike(students.name, `%${search}%`)
      )
    }

    // Count total
    const countResult = await db
      .select({ count: db.sql<number>`count(*)::integer` })
      .from(students)

    const total = countResult[0]?.count || 0
    const totalPages = Math.ceil(total / pageSize)

    // Fetch paginated results
    const offset = (page - 1) * pageSize
    const result = await query
      .orderBy(students.name)
      .limit(pageSize)
      .offset(offset)

    return NextResponse.json({
      data: result.map(transformStudent),
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch students"
    console.error("GET /api/students/paginated error:", errorMessage)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
