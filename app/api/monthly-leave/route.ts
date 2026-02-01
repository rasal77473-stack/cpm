import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { monthlyLeaves, leaveExclusions, students, specialPassGrants } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

// GET - Fetch all monthly leaves
export async function GET() {
    try {
        const leaves = await db
            .select()
            .from(monthlyLeaves)
            .orderBy(desc(monthlyLeaves.createdAt));

        // Calculate status for each leave based on current time
        const now = new Date();
        const enrichedLeaves = leaves.map((leave) => {
            const [startHour, startMin] = leave.startTime.split(":").map(Number);
            const [endHour, endMin] = leave.endTime.split(":").map(Number);
            
            const leaveStartTime = new Date(leave.startDate);
            leaveStartTime.setHours(startHour, startMin, 0, 0);
            
            const leaveEndTime = new Date(leave.endDate);
            leaveEndTime.setHours(endHour, endMin, 0, 0);
            
            let calculatedStatus = "PENDING";
            if (now >= leaveEndTime) {
                calculatedStatus = "COMPLETED";
            } else if (now >= leaveStartTime) {
                calculatedStatus = "ACTIVE";
            }
            
            return {
                ...leave,
                calculatedStatus,
                passIssuedTime: leaveStartTime.toISOString(),
                passCompletionTime: leaveEndTime.toISOString(),
            };
        });

        return NextResponse.json(enrichedLeaves);
    } catch (error) {
        console.error("GET /api/monthly-leave error:", error);
        return NextResponse.json(
            { error: "Failed to fetch monthly leaves" },
            { status: 500 }
        );
    }
}

// POST - Create a new monthly leave
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { startDate, endDate, startTime, endTime, createdBy, createdByName, excludedStudents } = body;

        // Check each field and provide specific error message
        const missingFields = [];
        if (!startDate) missingFields.push("startDate");
        if (!endDate) missingFields.push("endDate");
        if (!startTime) missingFields.push("startTime");
        if (!endTime) missingFields.push("endTime");
        if (!createdBy && createdBy !== 0) missingFields.push("createdBy");
        if (!createdByName) missingFields.push("createdByName");

        if (missingFields.length > 0) {
            console.error("Missing required fields:", missingFields, "Received:", body);
            return NextResponse.json(
                { error: `Missing required fields: ${missingFields.join(", ")}` },
                { status: 400 }
            );
        }

        console.log("Creating monthly leave with:", { startDate, endDate, startTime, endTime });

        // Create the monthly leave record
        const [newLeave] = await db
            .insert(monthlyLeaves)
            .values({
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                startTime,
                endTime,
                reason: "Monthly Leave",
                createdBy,
                createdByName,
                status: "ACTIVE",
            })
            .returning();

        console.log("Monthly leave created:", newLeave);

        // Add exclusions if any
        if (excludedStudents && excludedStudents.length > 0) {
            const exclusionRecords = excludedStudents.map((studentId: number) => ({
                leaveId: newLeave.id,
                studentId,
                excludedBy: createdBy,
                excludedByName: createdByName,
                reason: "Marked ineligible by admin",
            }));

            await db.insert(leaveExclusions).values(exclusionRecords);
        }

        return NextResponse.json(newLeave, { status: 201 });
    } catch (error) {
        console.error("POST /api/monthly-leave error:", error);
        return NextResponse.json(
            { error: "Failed to create monthly leave", details: String(error) },
            { status: 500 }
        );
    }
}

// DELETE - Delete a monthly leave by ID
export async function DELETE(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const id = url.pathname.split("/").pop();
        
        if (!id || isNaN(parseInt(id))) {
            return NextResponse.json({ error: "Invalid leave ID" }, { status: 400 });
        }

        const leaveId = parseInt(id);

        // Delete exclusions first (foreign key constraint)
        await db.delete(leaveExclusions).where(eq(leaveExclusions.leaveId, leaveId));

        // Delete the monthly leave
        const result = await db.delete(monthlyLeaves).where(eq(monthlyLeaves.id, leaveId));

        return NextResponse.json({ success: true, message: "Monthly leave deleted successfully" });
    } catch (error) {
        console.error("DELETE /api/monthly-leave error:", error);
        return NextResponse.json(
            { error: "Failed to delete monthly leave" },
            { status: 500 }
        );
    }
}
