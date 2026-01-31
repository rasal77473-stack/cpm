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

        console.log("📅 Monthly Leave Grant Request:", { leaveId, status: leave.status });

        // Check if passes have already been issued
        if (leave.passesIssued === "YES") {
            return NextResponse.json({
                message: "Passes have already been issued for this leave",
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
        const [endHour, endMin] = leave.endTime.split(":").map(Number);

        // Set issue time to start date + start time
        const issueTime = new Date(startDate);
        issueTime.setHours(startHour, startMin, 0, 0);

        // Set return time to end date + end time
        const returnTime = new Date(endDate);
        returnTime.setHours(endHour, endMin, 0, 0);

        console.log("⏰ Issue Time:", issueTime.toISOString());
        console.log("⏰ Return Time:", returnTime.toISOString());

        // Create special pass grants for all eligible students (both phone and gate)
        const passRecords: any[] = [];
        const leaveReason = `Monthly Leave (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`;

        eligibleStudents.forEach((student) => {
            // Phone pass - set to PENDING status initially
            passRecords.push({
                studentId: student.id,
                mentorId: mentorId || leave.createdBy,
                mentorName: mentorName || leave.createdByName,
                purpose: `PHONE: ${leaveReason}`,
                issueTime,
                returnTime,
                status: "PENDING", // Will be activated at start time
            });

            // Gate pass - set to PENDING status initially
            passRecords.push({
                studentId: student.id,
                mentorId: mentorId || leave.createdBy,
                mentorName: mentorName || leave.createdByName,
                purpose: `GATE: ${leaveReason}`,
                issueTime,
                returnTime,
                status: "PENDING", // Will be activated at start time
            });
        });

        console.log("💾 Creating passes with PENDING status:", passRecords.length);
        await db.insert(specialPassGrants).values(passRecords);

        // Update leave status to PENDING (not COMPLETED)
        // It will be updated to IN_PROGRESS when start time is reached
        await db
            .update(monthlyLeaves)
            .set({ status: "PENDING", passesIssued: "YES" })
            .where(eq(monthlyLeaves.id, leaveId));

        console.log("✅ Monthly leave marked as PENDING with passes issued");

        return NextResponse.json({
            success: true,
            message: `Created ${eligibleStudents.length * 2} passes (PENDING status) for ${eligibleStudents.length} students. Passes will activate at ${issueTime.toLocaleString()}`,
            granted: eligibleStudents.length * 2,
            status: "PENDING",
            activatesAt: issueTime.toISOString(),
        });
    } catch (error) {
        console.error("POST /api/monthly-leave/[id]/grant error:", error);
        return NextResponse.json(
            { error: "Failed to grant passes", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
