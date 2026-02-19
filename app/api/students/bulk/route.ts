import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { students } from "@/db/schema"
import { invalidateCache, STUDENTS_CACHE_KEY } from "@/lib/student-cache"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 })
    }

    // Prepare students for insert - map snake_case to camelCase and handle special_pass
    const studentsToInsert = data.map((s: any) => {
      // Map snake_case from Excel to camelCase for Drizzle
      return {
        admissionNumber: s.admission_number || s.admissionNumber || "",
        name: s.name || "",
        lockerNumber: s.locker_number || s.lockerNumber || "-",
        phoneNumber: s.phone_number || s.phoneNumber,
        class: s.class,
        rollNumber: s.roll_number || s.rollNumber,
        phoneName: s.phone_name || s.phoneName,
        className: s.class_name || s.className,
        rollNo: s.roll_no || s.rollNo,
        specialPass: s.special_pass || "NO",
      };
    }).filter(s => s.admissionNumber && s.name); // Filter out invalid records

    if (studentsToInsert.length === 0) {
      return NextResponse.json({ 
        error: "No valid students found. Each student must have admission_number and name." 
      }, { status: 400 })
    }

    // Batch insert to avoid exceeding parameter limits
    // Insert in batches of 25 to be extra safe with parameter limits
    const BATCH_SIZE = 25;
    let totalInserted = 0;

    for (let i = 0; i < studentsToInsert.length; i += BATCH_SIZE) {
      const batch = studentsToInsert.slice(i, i + BATCH_SIZE);

      try {
        const result = await db.insert(students).values(batch).onConflictDoNothing().returning()
        totalInserted += result.length;
        console.log(`✓ Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.length} students`)
      } catch (batchError) {
        console.error(`✗ Failed to insert batch ${Math.floor(i / BATCH_SIZE) + 1}:`, batchError)
        throw new Error(`Failed to insert batch at position ${i}: ${batchError instanceof Error ? batchError.message : String(batchError)}`)
      }
    }

    invalidateCache(STUDENTS_CACHE_KEY)

    return NextResponse.json({
      success: true,
      message: "Bulk import successful",
      count: totalInserted
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to perform bulk import"
    console.error("POST /api/students/bulk error:", errorMessage, error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
