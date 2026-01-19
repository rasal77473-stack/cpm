import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { monthlyLeaves, leaveExclusions, students, specialPassGrants } from "@/db/schema";
import { eq, and, notInArray, inArray } from "drizzle-orm";

// GET - Get leave details with exclusions
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const leaveId = parseInt(id);

        if (isNaN(leaveId)) {
            return NextResponse.json({ error: "Invalid leave ID" }, { status: 400 });
        }

        // Get the leave
        const [leave] = await db
            .select()
            .from(monthlyLeaves)
            .where(eq(monthlyLeaves.id, leaveId));

        if (!leave) {
            return NextResponse.json({ error: "Leave not found" }, { status: 404 });
        }

        // Get exclusions
        const exclusions = await db
            .select({
                studentId: leaveExclusions.studentId,
                studentName: students.name,
                admissionNumber: students.admission_number,
            })
            .from(leaveExclusions)
            .leftJoin(students, eq(leaveExclusions.studentId, students.id))
            .where(eq(leaveExclusions.leaveId, leaveId));

        return NextResponse.json({
            ...leave,
            exclusions: exclusions.map((e) => ({
                studentId: e.studentId,
                studentName: e.studentName,
                admissionNumber: e.admissionNumber,
            })),
        });
    } catch (error) {
        console.error("GET /api/monthly-leave/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to fetch leave details" },
            { status: 500 }
        );
    }
}

// PUT - Update leave exclusions
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const leaveId = parseInt(id);
        const body = await request.json();
        const { excludedStudents, updatedBy, updatedByName } = body;

        if (isNaN(leaveId)) {
            return NextResponse.json({ error: "Invalid leave ID" }, { status: 400 });
        }

        // Delete existing exclusions
        await db.delete(leaveExclusions).where(eq(leaveExclusions.leaveId, leaveId));

        // Add new exclusions
        if (excludedStudents && excludedStudents.length > 0) {
            const exclusionRecords = excludedStudents.map((studentId: number) => ({
                leaveId,
                studentId,
                excludedBy: updatedBy,
                excludedByName: updatedByName,
                reason: "Marked ineligible by admin",
            }));

            await db.insert(leaveExclusions).values(exclusionRecords);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("PUT /api/monthly-leave/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to update leave exclusions" },
            { status: 500 }
        );
    }
}

// DELETE - Cancel/delete a monthly leave
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const leaveId = parseInt(id);

        if (isNaN(leaveId)) {
            return NextResponse.json({ error: "Invalid leave ID" }, { status: 400 });
        }

        // Delete exclusions first
        await db.delete(leaveExclusions).where(eq(leaveExclusions.leaveId, leaveId));

        // Delete the leave
        await db.delete(monthlyLeaves).where(eq(monthlyLeaves.id, leaveId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/monthly-leave/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to delete leave" },
            { status: 500 }
        );
    }
}
