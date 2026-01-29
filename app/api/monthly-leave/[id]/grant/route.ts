import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { monthlyLeaves, leaveExclusions, students, specialPassGrants } from "@/db/schema";
import { eq, and, notInArray, gte, lte, sql } from "drizzle-orm";

// POST - Grant special passes to all eligible students for a leave
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const leaveId = parseInt(id);
        const body = await request.json();
        const { mentorId, mentorName } = body;

        if (isNaN(leaveId)) {
            return NextResponse.json({ error: "Invalid leave ID" }, { status: 400 });
        }

        // Get the leave details
        const [leave] = await db
            .select()
            .from(monthlyLeaves)
            .where(eq(monthlyLeaves.id, leaveId));

        if (!leave) {
            return NextResponse.json({ error: "Leave not found" }, { status: 404 });
        }

        // Get excluded student IDs
        const exclusions = await db
            .select({ studentId: leaveExclusions.studentId })
            .from(leaveExclusions)
            .where(eq(leaveExclusions.leaveId, leaveId));

        const excludedIds = exclusions.map((e) => e.studentId);

        // Get all eligible students (not excluded)
        let eligibleStudents;
        if (excludedIds.length > 0) {
            eligibleStudents = await db
                .select()
                .from(students)
                .where(notInArray(students.id, excludedIds));
        } else {
            eligibleStudents = await db.select().from(students);
        }

        if (eligibleStudents.length === 0) {
            return NextResponse.json({
                message: "No eligible students found",
                granted: 0
            });
        }

        // Calculate issue and return times based on leave dates
        const startDate = new Date(leave.startDate);
        const endDate = new Date(leave.endDate);

        // Parse start and end times
        const [startHour, startMin] = leave.startTime.split(":").map(Number);
        const [endHour, endMin] = leave.endTime.split(":").map(Number);

        // Set issue time to start date + start time
        const issueTime = new Date(startDate);
        issueTime.setHours(startHour, startMin, 0, 0);

        // Set return time to end date + end time
        const returnTime = new Date(endDate);
        returnTime.setHours(endHour, endMin, 0, 0);

        // Create special pass grants for all eligible students
        const passRecords = eligibleStudents.map((student) => ({
            studentId: student.id,
            mentorId: mentorId || leave.createdBy,
            mentorName: mentorName || leave.createdByName,
            purpose: `Monthly Leave (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`,
            issueTime,
            returnTime,
            status: "ACTIVE",
        }));

        await db.insert(specialPassGrants).values(passRecords);

        // Update leave status
        await db
            .update(monthlyLeaves)
            .set({ status: "COMPLETED" })
            .where(eq(monthlyLeaves.id, leaveId));

        return NextResponse.json({
            success: true,
            message: `Granted ${eligibleStudents.length} special passes`,
            granted: eligibleStudents.length,
        });
    } catch (error) {
        console.error("POST /api/monthly-leave/[id]/grant error:", error);
        return NextResponse.json(
            { error: "Failed to grant passes" },
            { status: 500 }
        );
    }
}
