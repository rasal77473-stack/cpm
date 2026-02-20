import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { monthlyLeaves, leaveExclusions, students, specialPassGrants } from "@/db/schema";
import { eq, and, notInArray, gte, lte, sql } from "drizzle-orm";

// POST - Immediately create and issue phone and gate passes for monthly leave
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const leaveId = parseInt(id);
        const body = await request.json();
        const { mentorId, mentorName } = body;

        console.log(`\n🚀 POST /api/monthly-leave/${leaveId}/grant - Request received`);
        console.log("Body:", { mentorId, mentorName });

        if (isNaN(leaveId)) {
            console.error("❌ Invalid leave ID");
            return NextResponse.json({ error: "Invalid leave ID" }, { status: 400 });
        }

        // Get the leave details
        const [leave] = await db
            .select()
            .from(monthlyLeaves)
            .where(eq(monthlyLeaves.id, leaveId));

        if (!leave) {
            console.error(`❌ Leave ${leaveId} not found`);
            return NextResponse.json({ error: "Leave not found" }, { status: 404 });
        }

        console.log(`✓ Leave ${leaveId} found:`, {
            status: leave.status,
            passesIssued: leave.passesIssued,
            startDate: leave.startDate,
            endDate: leave.endDate,
        });

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
        console.log(`✓ Found ${exclusions.length} excluded students`);

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

        console.log(`✓ Total eligible students: ${eligibleStudents.length}`);
        if (eligibleStudents.length === 0) {
            console.warn("⚠️  No eligible students found");
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

        console.log("📅 Creating passes:", {
            issueTime: issueTime.toISOString(),
            returnTime: returnTime.toISOString(),
            studentCount: eligibleStudents.length,
        });

        // Create both PHONE and GATE passes for each eligible student
        const passRecords: any[] = [];
        const purpose = `Monthly Leave (${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]})`;

        for (const student of eligibleStudents) {
            // Phone pass - convert dates to ISO strings
            passRecords.push({
                studentId: student.id,
                mentorId: mentorId,
                mentorName: mentorName,
                purpose: `PHONE: ${purpose}`,
                issueTime: issueTime.toISOString(),  // Convert to ISO string
                returnTime: returnTime.toISOString(),  // Convert to ISO string
                status: "ACTIVE",
            });

            // Gate pass - convert dates to ISO strings
            passRecords.push({
                studentId: student.id,
                mentorId: mentorId,
                mentorName: mentorName,
                purpose: `GATE: ${purpose}`,
                issueTime: issueTime.toISOString(),  // Convert to ISO string
                returnTime: returnTime.toISOString(),  // Convert to ISO string
                status: "ACTIVE",
            });
        }

        if (passRecords.length > 0) {
            console.log(`💾 Inserting ${passRecords.length} pass records`);
            try {
                await db.insert(specialPassGrants).values(passRecords);
                console.log("✅ Passes created successfully");
            } catch (insertError) {
                console.error("❌ Error inserting passes:", insertError);
                throw insertError;
            }
        } else {
            console.warn("⚠️  No pass records to insert");
        }

        // Mark leave as IN_PROGRESS with passes issued
        console.log(`📝 Updating leave ${leaveId} status to IN_PROGRESS`);
        await db
            .update(monthlyLeaves)
            .set({ status: "IN_PROGRESS", passesIssued: "YES" })
            .where(eq(monthlyLeaves.id, leaveId));

        console.log(`✅ Monthly leave ${leaveId} processed. ${passRecords.length / 2} students granted passes\n`);

        return NextResponse.json({
            success: true,
            message: `Monthly leave created! ${passRecords.length / 2} students granted phone and gate passes`,
            granted: passRecords.length / 2,
            status: "IN_PROGRESS",
            passesCreated: passRecords.length,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : "";
        console.error(`\n❌ POST /api/monthly-leave/[id]/grant error: ${errorMessage}`);
        console.error("Stack:", errorStack);
        console.error("Full error:", error);
        
        return NextResponse.json(
            { error: "Failed to schedule passes", details: errorMessage },
            { status: 500 }
        );
    }
}
