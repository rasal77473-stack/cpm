import { db } from "@/db";
import { monthlyLeaves, specialPassGrants } from "@/db/schema";
import { eq } from "drizzle-orm";

async function checkMonthlyLeaveAndPasses() {
  try {
    console.log("🔍 Checking monthly leaves and their passes...\n");

    // Get all monthly leaves
    const leaves = await db.select().from(monthlyLeaves);
    console.log(`📅 Total monthly leaves: ${leaves.length}`);

    if (leaves.length === 0) {
      console.log("No monthly leaves found");
      process.exit(0);
    }

    // For each leave, check passes
    for (const leave of leaves) {
      console.log(`\n┌─ Leave ID: ${leave.id}`);
      console.log(`├─ Status: ${leave.status}`);
      console.log(`├─ Passes Issued: ${leave.passesIssued}`);
      console.log(`├─ Created: ${leave.createdAt}`);

      // Find passes for this leave (by checking the timeframe)
      const passes = await db
        .select()
        .from(specialPassGrants)
        .where(eq(specialPassGrants.mentorName, leave.createdByName));

      console.log(`├─ Total passes by this mentor: ${passes.length}`);

      // Filter passes that match this leave's timeframe
      const leaveStartTime = new Date(leave.startDate);
      const leaveEndTime = new Date(leave.endDate);

      const relevantPasses = passes.filter((pass) => {
        const passIssueTime = new Date(pass.issueTime);
        return (
          passIssueTime >= leaveStartTime &&
          passIssueTime <= leaveEndTime &&
          pass.purpose.includes("Monthly Leave")
        );
      });

      console.log(`├─ Passes for this leave: ${relevantPasses.length}`);

      if (relevantPasses.length > 0) {
        // Group by status
        const byStatus: { [key: string]: number } = {};
        relevantPasses.forEach((pass) => {
          byStatus[pass.status] = (byStatus[pass.status] || 0) + 1;
        });

        console.log(`├─ Pass breakdown:`);
        Object.entries(byStatus).forEach(([status, count]) => {
          console.log(`│  ├─ ${status}: ${count}`);
        });

        // Group by purpose
        const byPurpose: { [key: string]: number } = {};
        relevantPasses.forEach((pass) => {
          const purposeType = pass.purpose.includes("PHONE") ? "PHONE" : "GATE";
          byPurpose[purposeType] = (byPurpose[purposeType] || 0) + 1;
        });

        console.log(`├─ By type:`);
        Object.entries(byPurpose).forEach(([type, count]) => {
          console.log(`│  ├─ ${type}: ${count}`);
        });

        console.log(`├─ Sample pass:`);
        const samplePass = relevantPasses[0];
        console.log(`│  ├─ Student ID: ${samplePass.studentId}`);
        console.log(`│  ├─ Purpose: ${samplePass.purpose}`);
        console.log(`│  ├─ Status: ${samplePass.status}`);
        console.log(`│  ├─ Issue Time: ${samplePass.issueTime}`);
        console.log(`│  └─ Return Time: ${samplePass.returnTime}`);
      } else {
        console.log(`└─ ⚠️  No passes found for this leave`);
      }
    }

    console.log("\n✅ Check complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkMonthlyLeaveAndPasses();
