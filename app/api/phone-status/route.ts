import { db } from "@/db";
import { phoneStatus } from "@/db/schema";
import { NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";

export async function GET() {
  try {
    // Get only the latest status record for each student
    const allStatus = await db
      .selectDistinct({ studentId: phoneStatus.studentId })
      .from(phoneStatus)
      .orderBy(desc(phoneStatus.lastUpdated));

    // Build map with latest status for each student
    const statusMap: Record<number, any> = {};
    
    for (const record of allStatus) {
      const latest = await db.query.phoneStatus.findFirst({
        where: (ps: any) => sql`${ps.studentId} = ${record.studentId}`,
        orderBy: [desc(phoneStatus.lastUpdated)]
      });

      if (latest) {
        statusMap[latest.studentId] = {
          student_id: latest.studentId,
          status: latest.status,
          last_updated: latest.lastUpdated?.toISOString() || new Date().toISOString()
        };
      }
    }

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