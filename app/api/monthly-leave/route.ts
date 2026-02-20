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
            
            // Get local timezone offset in minutes
            const tzOffset = new Date().getTimezoneOffset(); // Returns minutes offset from UTC
            
            // Parse the start date from the database
            const startDateObj = new Date(leave.startDate);
            const startDateStr = startDateObj.toISOString().split('T')[0]; // Get YYYY-MM-DD
            
            // Create date in local timezone (not UTC)
            // The time input is in local timezone, so we need to create a date that represents that local time
            const leaveStartTime = new Date(`${startDateStr}T${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00`);
            // Adjust for timezone offset to get correct UTC time
            leaveStartTime.setMinutes(leaveStartTime.getMinutes() - tzOffset);
            
            // Same for end date
            const endDateObj = new Date(leave.endDate);
            const endDateStr = endDateObj.toISOString().split('T')[0]; // Get YYYY-MM-DD
            const leaveEndTime = new Date(`${endDateStr}T${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`);
            leaveEndTime.setMinutes(leaveEndTime.getMinutes() - tzOffset);
            
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

        // Return with no-cache headers to ensure fresh data
        return NextResponse.json(enrichedLeaves, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
            }
        });
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
            return NextResponse.json(
                { error: `Missing required fields: ${missingFields.join(", ")}` },
                { status: 400 }
            );
        }

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
