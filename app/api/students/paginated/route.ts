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

    // Build the where condition
    const whereCondition = search
      ? (search.includes("+") 
          ? ilike(students.admissionNumber, `%${search}%`)
          : ilike(students.name, `%${search}%`))
      : undefined

    // Count FILTERED total
    let countQuery = db.select({ count: db.sql<number>`count(*)::integer` }).from(students)
    if (whereCondition) {
      countQuery = countQuery.where(whereCondition)
    }

    const countResult = await countQuery
    const total = countResult[0]?.count || 0
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1

    // Fetch paginated results
    const offset = (page - 1) * pageSize
    let resultQuery = db.select().from(students).orderBy(students.name)
    if (whereCondition) {
      resultQuery = resultQuery.where(whereCondition)
    }
    const result = await resultQuery.limit(pageSize).offset(offset)

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
