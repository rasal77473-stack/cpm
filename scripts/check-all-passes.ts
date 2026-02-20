import { db } from "@/db";
import { specialPassGrants, monthlyLeaves } from "@/db/schema";
import { desc, like } from "drizzle-orm";

async function checkAllPasses() {
  try {
    console.log("🔍 Checking all special passes with 'Monthly Leave' purpose...\n");

    // Get all passes with 'Monthly Leave' in purpose
    const passes = await db
      .select()
      .from(specialPassGrants)
      .orderBy(desc(specialPassGrants.issueTime));

    console.log(`📋 Total passes in system: ${passes.length}`);

    // Filter for monthly leave passes
    const monthlyLeavePasses = passes.filter((p) =>
      p.purpose.includes("Monthly Leave")
    );

    console.log(`📅 Monthly Leave passes: ${monthlyLeavePasses.length}\n`);

    if (monthlyLeavePasses.length === 0) {
      console.log("⚠️  No monthly leave passes found!\n");
    } else {
      // Group by status
      const byStatus: { [key: string]: number } = {};
      monthlyLeavePasses.forEach((pass) => {
        byStatus[pass.status] = (byStatus[pass.status] || 0) + 1;
      });

      console.log("Status breakdown:");
      Object.entries(byStatus).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });

      // Group by type
      const byType: { [key: string]: number } = {};
      monthlyLeavePasses.forEach((pass) => {
        const type = pass.purpose.includes("PHONE") ? "PHONE" : "GATE";
        byType[type] = (byType[type] || 0) + 1;
      });

      console.log("\nType breakdown:");
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });

      console.log("\nRecent monthly leave passes:");
      monthlyLeavePasses.slice(0, 5).forEach((pass, idx) => {
        console.log(`\n${idx + 1}. Student ID: ${pass.studentId}`);
        console.log(`   Purpose: ${pass.purpose}`);
        console.log(`   Status: ${pass.status}`);
        console.log(`   Issue: ${new Date(pass.issueTime).toLocaleString()}`);
        console.log(`   Return: ${new Date(pass.returnTime).toLocaleString()}`);
        console.log(`   Mentor: ${pass.mentorName}`);
      });
    }

    // Also show summary of monthly leaves
    console.log("\n" + "=".repeat(60));
    console.log("📅 Monthly Leaves Summary:");
    const leaves = await db.select().from(monthlyLeaves);
    console.log(`Total leaves: ${leaves.length}`);

    leaves.forEach((leave) => {
      console.log(
        `\nLeave ${leave.id}: ${leave.status} | Passes: ${leave.passesIssued}`
      );
      console.log(
        `  Date: ${new Date(leave.startDate).toDateString()} - ${new Date(
          leave.endDate
        ).toDateString()}`
      );
      console.log(`  Time: ${leave.startTime} - ${leave.endTime}`);
    });

    console.log("\n✅ Check complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkAllPasses();
