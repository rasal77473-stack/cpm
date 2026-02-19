import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { students, phoneStatus, userActivityLogs, phoneHistory, specialPassGrants, studentFines, leaveExclusions } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getCached, setCache, invalidateCache, STUDENTS_CACHE_KEY } from "@/lib/student-cache"

async function logActivity(userId: number, action: string, details: string) {
  try {
    await db.insert(userActivityLogs).values({ userId, action, details })
  } catch (e) {
    console.error("Logging failed:", e)
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")

    if (id) {
      const student = await db.query.students.findFirst({
        where: eq(students.id, Number.parseInt(id))
      })
      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 })
      }
      return NextResponse.json(student, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
        }
      })
    }

    // Check in-memory cache first for instant response
    const cached = getCached<any[]>(STUDENTS_CACHE_KEY)
    if (cached) {
      console.log("⚡ Serving students from cache (instant)")
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      })
    }

    const allStudents = await db.select().from(students)
    setCache(STUDENTS_CACHE_KEY, allStudents)
    console.log("📥 Fetched students from DB and cached")
    return NextResponse.json(allStudents, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    })
  } catch (error: any) {
    console.error("Database error in GET /api/students:", error)
    const errorMessage = error?.message || "Failed to fetch students"

    // If the table doesn't exist yet, return an empty array instead of 500
    if (error.code === '42P01' || errorMessage.includes("does not exist")) {
      console.log("Students table doesn't exist yet, returning empty array")
      return NextResponse.json([])
    }

    // Log more detailed error info
    if (error.code) {
      console.error("PostgreSQL Error Code:", error.code)
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Validate required fields
    if (!data.admission_number || !data.name || !data.locker_number) {
      return NextResponse.json(
        { error: "Missing required fields: admission_number, name, locker_number" },
        { status: 400 }
      )
    }

    const newStudent = await db.insert(students).values({
      admission_number: String(data.admission_number).trim(),
      name: String(data.name).trim(),
      locker_number: String(data.locker_number || "-").trim(),
      phone_number: data.phone_number ? String(data.phone_number).trim() : null,
      class: data.class ? String(data.class).trim() : null,
      roll_number: data.roll_number ? String(data.roll_number).trim() : null,
      phone_name: data.phone_name ? String(data.phone_name).trim() : null,
      class_name: data.class_name ? String(data.class_name).trim() : null,
      roll_no: data.roll_no ? String(data.roll_no).trim() : null,
      special_pass: data.special_pass ? String(data.special_pass).trim() : "NO",
    }).returning()

    invalidateCache(STUDENTS_CACHE_KEY)

    if (data.staffId) {
      await logActivity(Number(data.staffId), "ADD_STUDENT", `Added student: ${data.name} (${data.admission_number})`)
    }

    return NextResponse.json(newStudent[0])
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to create student"
    console.error("POST /api/students error:", errorMessage, error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    const { id, ...updateData } = data

    if (!id) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
    }

    const updated = await db.update(students)
      .set({
        admission_number: updateData.admission_number ? String(updateData.admission_number).trim() : undefined,
        name: updateData.name ? String(updateData.name).trim() : undefined,
        locker_number: updateData.locker_number ? String(updateData.locker_number).trim() : undefined,
        phone_number: updateData.phone_number ? String(updateData.phone_number).trim() : undefined,
        class: updateData.class ? String(updateData.class).trim() : undefined,
        roll_number: updateData.roll_number ? String(updateData.roll_number).trim() : undefined,
        phone_name: updateData.phone_name ? String(updateData.phone_name).trim() : undefined,
        class_name: updateData.class_name ? String(updateData.class_name).trim() : undefined,
        roll_no: updateData.roll_no ? String(updateData.roll_no).trim() : undefined,
        special_pass: updateData.special_pass ? String(updateData.special_pass).trim() : undefined,
      })
      .where(eq(students.id, Number(id)))
      .returning()

    if (updated.length === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    invalidateCache(STUDENTS_CACHE_KEY)
    return NextResponse.json(updated[0])
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update student"
    console.error("PUT /api/students error:", errorMessage, error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
    }

    const studentId = Number.parseInt(id)

    // Delete in order of foreign key dependencies
    // 1. Delete leave exclusions
    await db.delete(leaveExclusions).where(eq(leaveExclusions.studentId, studentId))
    
    // 2. Delete student fines
    await db.delete(studentFines).where(eq(studentFines.studentId, studentId))
    
    // 3. Delete phone history
    await db.delete(phoneHistory).where(eq(phoneHistory.studentId, studentId))
    
    // 4. Delete phone status
    await db.delete(phoneStatus).where(eq(phoneStatus.studentId, studentId))
    
    // 5. Delete special pass grants
    await db.delete(specialPassGrants).where(eq(specialPassGrants.studentId, studentId))

    // 6. Finally delete the student
    const deleted = await db.delete(students).where(eq(students.id, studentId)).returning()

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    invalidateCache(STUDENTS_CACHE_KEY)
    return NextResponse.json({ success: true, message: "Student deleted successfully" })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete student"
    console.error("DELETE /api/students error:", errorMessage, error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get("action")

    if (action === "deleteAll") {
      // Delete in order of foreign key dependencies
      // 1. Delete leave exclusions (depends on students)
      await db.delete(leaveExclusions)
      
      // 2. Delete student fines (depends on students)
      await db.delete(studentFines)
      
      // 3. Delete phone history (depends on students)
      await db.delete(phoneHistory)
      
      // 4. Delete phone status (depends on students)
      await db.delete(phoneStatus)
      
      // 5. Delete special pass grants (depends on students)
      await db.delete(specialPassGrants)
      
      // 6. Finally delete all students
      await db.delete(students)
      
      invalidateCache(STUDENTS_CACHE_KEY)
      return NextResponse.json({ success: true, message: "All students and related records deleted successfully" })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete all students"
    console.error("PATCH /api/students error:", errorMessage, error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
