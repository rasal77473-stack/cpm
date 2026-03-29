import { db } from "@/db";
import { monthlyLeaves, leaveExclusions, students, specialPassGrants } from "@/db/schema";
import { eq, notInArray } from "drizzle-orm";

async function directlyTestGrant() {
  try {
    console.log("🚀 Directly testing grant logic...\n");

    // Create a test monthly leave
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log("📝 Creating test leave...");
    const [newLeave] = await db
      .insert(monthlyLeaves)
      .values({
        startDate: today.toISOString(),
        endDate: tomorrow.toISOString(),
        startTime: "09:00",
        endTime: "17:00",
        reason: "Direct Test Leave",
        createdBy: 1,
        createdByName: "Test Script",
        status: "ACTIVE",
      })
      .returning();

    console.log(`✓ Created leave ID: ${newLeave.id}\n`);

    // Now simulate the grant logic
    const leaveId = newLeave.id;
    console.log(`🔄 Executing grant logic for leave ${leaveId}...\n`);

    // Get the leave
    const [leave] = await db
      .select()
      .from(monthlyLeaves)
      .where(eq(monthlyLeaves.id, leaveId));

    console.log("✓ Leave details:", {
      status: leave.status,
      startDate: leave.startDate,
      endDate: leave.endDate,
    });

    // Get exclusions
    const exclusions = await db
      .select({ studentId: leaveExclusions.studentId })
      .from(leaveExclusions)
      .where(eq(leaveExclusions.leaveId, leaveId));

    const excludedIds = exclusions.map((e) => e.studentId);
    console.log(`✓ Excluded students: ${excludedIds.length}`);

    // Get eligible students
    let eligibleStudents;
    if (excludedIds.length > 0) {
      eligibleStudents = await db
        .select()
        .from(students)
        .where(notInArray(students.id, excludedIds));
    } else {
      eligibleStudents = await db.select().from(students);
    }

    console.log(`✓ Eligible students: ${eligibleStudents.length}`);
    if (eligibleStudents.length === 0) {
      console.log("⚠️  No students found in database!");
      process.exit(1);
    }

    // Parse times
    const [startHour, startMin] = leave.startTime.split(":").map(Number);
    const [endHour, endMin] = leave.endTime.split(":").map(Number);

    const issueTime = new Date(leave.startDate);
    issueTime.setHours(startHour, startMin, 0, 0);

    const returnTime = new Date(leave.endDate);
    returnTime.setHours(endHour, endMin, 0, 0);

    console.log("\n✓ Pass times:");
    console.log(`  Issue: ${issueTime.toISOString()}`);
    console.log(`  Return: ${returnTime.toISOString()}`);

    // Create pass records
    const passRecords: any[] = [];
    const purpose = `Monthly Leave (${new Date(leave.startDate)
      .toISOString()
      .split("T")[0]} - ${new Date(leave.endDate).toISOString().split("T")[0]})`;

    // Convert times to ISO strings
    const issueTimeISO = issueTime.toISOString();
    const returnTimeISO = returnTime.toISOString();

    for (const student of eligibleStudents) {
      // Phone pass
      passRecords.push({
        studentId: student.id,
        mentorId: 1,
        mentorName: "Test Script",
        purpose: `PHONE: ${purpose}`,
        issueTime: issueTimeISO,  // Use ISO string
        returnTime: returnTimeISO,  // Use ISO string
        status: "ACTIVE",
      });

      // Gate pass
      passRecords.push({
        studentId: student.id,
        mentorId: 1,
        mentorName: "Test Script",
        purpose: `GATE: ${purpose}`,
        issueTime: issueTimeISO,  // Use ISO string
        returnTime: returnTimeISO,  // Use ISO string
        status: "ACTIVE",
      });
    }

    console.log(`\n✓ Created ${passRecords.length} pass record objects`);
    console.log(`  (${eligibleStudents.length} students × 2 types)`);

    // Insert passes
    if (passRecords.length > 0) {
      console.log("\n💾 Inserting passes into database...");
      try {
        const result = await db.insert(specialPassGrants).values(passRecords);
        console.log("✅ Passes inserted successfully");
      } catch (insertError) {
        console.error("❌ Error inserting passes:", insertError);
        throw insertError;
      }
    }

    // Update leave status
    console.log("📝 Updating leave status to IN_PROGRESS...");
    await db
      .update(monthlyLeaves)
      .set({ status: "IN_PROGRESS", passesIssued: "YES" })
      .where(eq(monthlyLeaves.id, leaveId));
    console.log("✓ Leave updated");

    // Verify passes were created
    const createdPasses = await db
      .select()
      .from(specialPassGrants);
    
    const thisLeavePassesCount = createdPasses.filter(p => p.purpose.includes(purpose.split('(')[0])).length;
    console.log(`\n✅ Verification: ${thisLeavePassesCount} passes created (expected ${passRecords.length})`);

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

directlyTestGrant();
