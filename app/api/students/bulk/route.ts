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

    // Prepare students for insert - omit id and special_pass handling
    const studentsToInsert = data.map((s: any) => {
      const { id, special_pass, ...rest } = s;
      return {
        ...rest,
        special_pass: special_pass || "NO"
      };
    });

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
