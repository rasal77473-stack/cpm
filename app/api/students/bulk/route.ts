import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { students } from "@/db/schema"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 })
    }

    // Perform bulk insert - omit id and special_pass handling
    const studentsToInsert = data.map((s: any) => {
      const { id, special_pass, ...rest } = s;
      return {
        ...rest,
        special_pass: special_pass || "NO"
      };
    });
    
    const result = await db.insert(students).values(studentsToInsert).returning()
    
    return NextResponse.json({ 
      success: true,
      message: "Bulk import successful", 
      count: result.length 
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to perform bulk import"
    console.error("POST /api/students/bulk error:", errorMessage, error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
