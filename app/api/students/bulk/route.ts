import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { students } from "@/db/schema"

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
    // PostgreSQL typically has a limit around 65535 parameters
    // With ~11 columns per student, we can safely batch 50-100 at a time
    const BATCH_SIZE = 50;
    const batches = [];
    
    for (let i = 0; i < studentsToInsert.length; i += BATCH_SIZE) {
      const batch = studentsToInsert.slice(i, i + BATCH_SIZE);
      batches.push(batch);
    }

    // Execute batches sequentially
    let totalInserted = 0;
    for (const batch of batches) {
      const result = await db.insert(students).values(batch).returning()
      totalInserted += result.length;
    }
    
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
