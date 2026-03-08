import { db } from "@/db";
import { phoneStatus, phoneHistory } from "@/db/schema";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getCached, setCache, invalidateCache, PHONE_STATUS_CACHE_KEY } from "@/lib/student-cache";

const PHONE_STATUS_TTL = 10 * 1000 // 10 seconds

// GET - Retrieve all phone statuses
export async function GET() {
  try {
    // Serve from in-memory cache instantly
    const cached = getCached<any[]>(PHONE_STATUS_CACHE_KEY)
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': 'no-store, max-age=0' }
      });
    }

    const statuses = await db
      .select()
      .from(phoneStatus)
      .orderBy(desc(phoneStatus.lastUpdated));

    setCache(PHONE_STATUS_CACHE_KEY, statuses, PHONE_STATUS_TTL)

    return NextResponse.json(statuses, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (error) {
    console.error("GET /api/phone-status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch phone statuses" },
      { status: 500 }
    );
  }
}

// POST - Create a new phone status record
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentId, status, notes, updatedBy } = body;

    // Validate required fields
    if (!studentId || !status) {
      return NextResponse.json(
        { error: "studentId and status are required" },
        { status: 400 }
      );
    }

    // Validate status value
    const validStatuses = ["IN", "OUT"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Insert new phone status record
    const newRecord = await db
      .insert(phoneStatus)
      .values({
        studentId,
        status,
        notes: notes || null,
        updatedBy: updatedBy || "system",
      })
      .returning();

    // Also record to phone history for audit trail
    await db.insert(phoneHistory).values({
      studentId,
      status,
      updatedBy: updatedBy || "system",
      notes: notes || null,
    });

    return NextResponse.json(newRecord[0], { status: 201 });
  } catch (error) {
    console.error("POST /api/phone-status error:", error);
    return NextResponse.json(
      { error: "Failed to create phone status record" },
      { status: 500 }
    );
  }
}