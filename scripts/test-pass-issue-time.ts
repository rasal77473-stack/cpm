import { db } from "@/db";
import { specialPassGrants, students } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

async function testPassIssueTime() {
  try {
    console.log("🚀 Testing pass creation with specific issue time...\n");

    // Get a student
    const [student] = await db.select().from(students).limit(1);

    if (!student) {
      console.error("❌ No students found in database!");
      process.exit(1);
    }

    console.log(`✓ Using student: ${student.name} (ID: ${student.id})\n`);

    // Create a test pass with specific times
    const now = new Date();
    const issueTime = new Date(now);
    issueTime.setHours(14, 30, 0, 0); // 14:30 (2:30 PM)

    const returnTime = new Date(now);
    returnTime.setHours(16, 45, 0, 0); // 16:45 (4:45 PM)

    console.log("📝 Creating test pass with:");
    console.log(`   Issue Time:  ${issueTime.toLocaleString()} (${issueTime.toISOString()})`);
    console.log(`   Return Time: ${returnTime.toLocaleString()} (${returnTime.toISOString()})`);
    console.log(`   Status: ACTIVE\n`);

    const [newPass] = await db
      .insert(specialPassGrants)
      .values({
        studentId: student.id,
        mentorId: 1,
        mentorName: "Test Admin",
        purpose: "TEST: Phone Pass Issue Time Check",
        issueTime: issueTime.toISOString(),
        returnTime: returnTime.toISOString(),
        status: "ACTIVE",
      })
      .returning();

    console.log(`✅ Pass created with ID: ${newPass.id}\n`);

    // Retrieve and verify the pass
    console.log("🔍 Retrieving pass from database...\n");

    const [retrievedPass] = await db
      .select()
      .from(specialPassGrants)
      .where(eq(specialPassGrants.id, newPass.id));

    if (!retrievedPass) {
      console.error("❌ Failed to retrieve pass!");
      process.exit(1);
    }

    console.log("📋 Pass Details:");
    console.log(`   ID: ${retrievedPass.id}`);
    console.log(`   Student: ${retrievedPass.studentId}`);
    console.log(`   Purpose: ${retrievedPass.purpose}`);
    console.log(`   Status: ${retrievedPass.status}`);
    console.log(`   Issue Time (DB):  ${retrievedPass.issueTime}`);
    console.log(`   Return Time (DB): ${retrievedPass.returnTime}\n`);

    // Parse and display times
    const dbIssueTime = new Date(retrievedPass.issueTime);
    const dbReturnTime = new Date(retrievedPass.returnTime);

    console.log("⏰ Parsed Times:");
    console.log(`   Issue:  ${dbIssueTime.toLocaleString()}`);
    console.log(`   Return: ${dbReturnTime.toLocaleString()}\n`);

    // Verify times match
    const issueMatch =
      issueTime.getHours() === dbIssueTime.getHours() &&
      issueTime.getMinutes() === dbIssueTime.getMinutes();

    const returnMatch =
      returnTime.getHours() === dbReturnTime.getHours() &&
      returnTime.getMinutes() === dbReturnTime.getMinutes();

    if (issueMatch && returnMatch) {
      console.log(
        "✅ PASS: Times match correctly! Pass issued and stored with correct times."
      );
    } else {
      console.log("❌ FAIL: Times do not match!");
      if (!issueMatch) {
        console.log(
          `   Issue time mismatch: Expected ${issueTime.toLocaleString()}, got ${dbIssueTime.toLocaleString()}`
        );
      }
      if (!returnMatch) {
        console.log(
          `   Return time mismatch: Expected ${returnTime.toLocaleString()}, got ${dbReturnTime.toLocaleString()}`
        );
      }
    }

    // Show recent passes
    console.log("\n📅 Recent Test Passes:");
    const recentPasses = await db
      .select()
      .from(specialPassGrants)
      .where(eq(specialPassGrants.mentorName, "Test Admin"))
      .orderBy(desc(specialPassGrants.id))
      .limit(5);

    recentPasses.forEach((pass, idx) => {
      const issueDate = new Date(pass.issueTime);
      console.log(
        `   ${idx + 1}. ID: ${pass.id} | Issue: ${issueDate.toLocaleTimeString()} | Status: ${pass.status}`
      );
    });

    console.log("\n✅ Test complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testPassIssueTime();
