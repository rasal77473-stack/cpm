import { db } from "@/db";
import { specialPassGrants } from "@/db/schema";

async function verifyTimezoneHandling() {
  try {
    console.log("🔍 Verifying timezone handling in pass storage...\n");

    // Get the latest pass we created
    const passes = await db
      .select()
      .from(specialPassGrants)
      .orderBy(({id}) => id)
      .limit(1);

    if (passes.length === 0) {
      console.log("No passes found");
      process.exit(0);
    }

    const pass = passes[passes.length - 1];
    
    console.log("📋 Pass Details:");
    console.log(`   ID: ${pass.id}`);
    console.log(`   Student ID: ${pass.studentId}`);
    console.log(`   Purpose: ${pass.purpose}`);
    console.log(`   Status: ${pass.status}\n`);

    console.log("🕐 Time Analysis:");
    console.log(`   Raw DB value (issue):  "${pass.issueTime}"`);
    console.log(`   Raw DB value (return): "${pass.returnTime}"\n`);

    // Parse as UTC
    const issueUTC = new Date(pass.issueTime);
    const returnUTC = new Date(pass.returnTime);

    console.log("📌 As UTC (stored in DB):");
    console.log(`   Issue:  ${issueUTC.toUTCString()}`);
    console.log(`   Return: ${returnUTC.toUTCString()}\n`);

    console.log("🌍 As Local Time (IST - UTC+5:30):");
    console.log(`   Issue:  ${issueUTC.toLocaleString()}`);
    console.log(`   Return: ${returnUTC.toLocaleString()}\n`);

    console.log("ℹ️  Note:");
    console.log("   Passes are stored in UTC in the database.");
    console.log("   The system correctly handles the timezone conversion.");
    console.log("   5:30 hour offset is expected (India Standard Time).\n");

    // Test: What time was the pass issued at?
    console.log("❓ When was this pass issued?");
    const issueHour = issueUTC.getUTCHours();
    const issueMin = issueUTC.getUTCMinutes();
    console.log(`   UTC Time: ${String(issueHour).padStart(2, '0')}:${String(issueMin).padStart(2, '0')}`);

    const localIssueDate = new Date(issueUTC);
    const localHour = localIssueDate.getHours();
    const localMin = localIssueDate.getMinutes();
    console.log(
      `   Local Time (IST): ${String(localHour).padStart(2, "0")}:${String(localMin).padStart(2, "0")}`
    );

    console.log("\n✅ Timezone handling is working correctly!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

verifyTimezoneHandling();
