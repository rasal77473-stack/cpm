import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { monthlyLeaves, leaveExclusions, students, specialPassGrants } from "@/db/schema";
import { eq, and, notInArray, gte, lte, sql } from "drizzle-orm";

// POST - Mark monthly leave as ready to grant passes (don't create them yet)
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

        console.log("📅 Monthly Leave Ready for Grant:", { leaveId, status: leave.status });

        // Check if passes have already been issued
        if (leave.passesIssued === "YES") {
            return NextResponse.json({
                message: "Passes have already been scheduled for this leave",
                status: leave.status,
                passesIssued: true
            }, { status: 400 });
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

        console.log("✨ Eligible students count:", eligibleStudents.length);

        // Calculate issue and return times based on leave dates
        const startDate = new Date(leave.startDate);
        const endDate = new Date(leave.endDate);

        // Parse start and end times
        const [startHour, startMin] = leave.startTime.split(":").map(Number);

        // Set issue time to start date + start time
        const issueTime = new Date(startDate);
        issueTime.setHours(startHour, startMin, 0, 0);

        console.log("⏰ Passes will be issued at:", issueTime.toISOString());

        // Mark leave as PENDING - passes will be created automatically by scheduler at start time
        await db
            .update(monthlyLeaves)
            .set({ status: "PENDING", passesIssued: "YES" })
            .where(eq(monthlyLeaves.id, leaveId));

        console.log("✅ Monthly leave marked as PENDING - scheduler will create passes at start time");

        return NextResponse.json({
            success: true,
            message: `Monthly leave scheduled. ${eligibleStudents.length} students will receive passes at ${issueTime.toLocaleString()}`,
            granted: eligibleStudents.length,
            status: "PENDING",
            scheduledAt: issueTime.toISOString(),
        });
    } catch (error) {
        console.error("POST /api/monthly-leave/[id]/grant error:", error);
        return NextResponse.json(
            { error: "Failed to schedule passes", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
