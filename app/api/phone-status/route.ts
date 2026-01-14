import { db } from "@/db";
import { phoneStatus } from "@/db/schema";
import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const allStatus = await db.select().from(phoneStatus).orderBy(desc(phoneStatus.lastUpdated));
    
    const statusMap = allStatus.reduce((acc, curr) => {
      if (!acc[curr.studentId]) {
        acc[curr.studentId] = {
          student_id: curr.studentId,
          status: curr.status,
          last_updated: curr.lastUpdated?.toISOString() || new Date().toISOString()
        }
      }
      return acc;
    }, {} as Record<number, any>);

    return NextResponse.json(statusMap, {
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10'
      }
    });
  } catch (error) {
    console.error("GET /api/phone-status error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch status";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentId, status, notes, updatedBy, permissions } = body;

    // Permissions check
    if (permissions && !permissions.includes('in_out_control') && !permissions.includes('manage_students')) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const newStatus = await db.insert(phoneStatus).values({
      studentId,
      status,
      notes,
      updatedBy,
    }).returning();

    return NextResponse.json(newStatus[0]);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}