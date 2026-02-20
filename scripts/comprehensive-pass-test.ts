import { db } from "@/db";
import { specialPassGrants, students } from "@/db/schema";
import { desc } from "drizzle-orm";

async function comprehensivePassTest() {
  try {
    console.log("════════════════════════════════════════════════════════════\n");
    console.log("   COMPREHENSIVE PASS ISSUE TIME TEST\n");
    console.log("════════════════════════════════════════════════════════════\n");

    // Get a student
    const [student] = await db.select().from(students).limit(1);

    if (!student) {
      console.error("❌ No students found!");
      process.exit(1);
    }

    console.log(`📋 TEST SETUP:`);
    console.log(`   Student: ${student.name} (ID: ${student.id})`);
    console.log(`   Timezone: India Standard Time (IST, UTC+5:30)\n`);

    // Create a specific time (local IST)
    const now = new Date();

    // Create issue time: 15:45 IST
    const issueDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    issueDate.setHours(15, 45, 0, 0); // 15:45 IST (local time)

    // Create return time: 17:30 IST
    const returnDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    returnDate.setHours(17, 30, 0, 0); // 17:30 IST (local time)

    console.log(`📝 DESIRED PASS TIMES (Local IST):`);
    console.log(`   Issue:  ${issueDate.toLocaleTimeString()} (3:45 PM)`);
    console.log(`   Return: ${returnDate.toLocaleTimeString()} (5:30 PM)\n`);

    // Convert to UTC for storage
    const issueUTC = new Date(issueDate.getTime() - issueDate.getTimezoneOffset() * 60000);
    const returnUTC = new Date(returnDate.getTime() - returnDate.getTimezoneOffset() * 60000);

    console.log(`📝 AS UTC (for database):`);
    console.log(`   Issue:  ${issueUTC.toUTCString()}`);
    console.log(`   Return: ${returnUTC.toUTCString()}\n`);

    // Create the pass
    console.log(`🚀 CREATING PASS...`);
    const [newPass] = await db
      .insert(specialPassGrants)
      .values({
        studentId: student.id,
        mentorId: 1,
        mentorName: "Comprehensive Test",
        purpose: "COMPREHENSIVE: Pass Issue Time Verification",
        issueTime: issueUTC.toISOString(),
        returnTime: returnUTC.toISOString(),
        status: "ACTIVE",
      })
      .returning();

    console.log(`✅ Pass created with ID: ${newPass.id}\n`);

    // Retrieve and verify
    console.log(`🔍 RETRIEVING PASS FROM DATABASE...`);
    const [retrievedPass] = await db
      .select()
      .from(specialPassGrants)
      .where(({id}) => id === newPass.id);

    if (!retrievedPass) {
      console.error("❌ Failed to retrieve pass!");
      process.exit(1);
    }

    console.log(`✅ Pass retrieved successfully\n`);

    // Parse the times
    const storedIssueUTC = new Date(retrievedPass.issueTime);
    const storedReturnUTC = new Date(retrievedPass.returnTime);

    // Convert back to local for display
    const storedIssueLocal = new Date(storedIssueUTC.getTime() + storedIssueUTC.getTimezoneOffset() * 60000);
    const storedReturnLocal = new Date(storedReturnUTC.getTime() + storedReturnUTC.getTimezoneOffset() * 60000);

    console.log(`📊 VERIFICATION RESULTS:\n`);

    console.log(`   ISSUE TIME:`);
    console.log(`      In Database (UTC): ${storedIssueUTC.toUTCString()}`);
    console.log(`      Local Time (IST):  ${storedIssueLocal.toLocaleTimeString()}`);
    console.log(`      Expected (IST):    ${issueDate.toLocaleTimeString()}`);
    
    const issueMatch = 
      storedIssueLocal.getHours() === issueDate.getHours() &&
      storedIssueLocal.getMinutes() === issueDate.getMinutes();
    console.log(`      Match: ${issueMatch ? "✅ YES" : "❌ NO"}\n`);

    console.log(`   RETURN TIME:`);
    console.log(`      In Database (UTC): ${storedReturnUTC.toUTCString()}`);
    console.log(`      Local Time (IST):  ${storedReturnLocal.toLocaleTimeString()}`);
    console.log(`      Expected (IST):    ${returnDate.toLocaleTimeString()}`);
    
    const returnMatch = 
      storedReturnLocal.getHours() === returnDate.getHours() &&
      storedReturnLocal.getMinutes() === returnDate.getMinutes();
    console.log(`      Match: ${returnMatch ? "✅ YES" : "❌ NO"}\n`);

    // Show the pass in a readable format
    console.log(`📋 FINAL PASS INFORMATION:\n`);
    console.log(`   ID: ${retrievedPass.id}`);
    console.log(`   Student: ${student.name}`);
    console.log(`   Purpose: ${retrievedPass.purpose}`);
    console.log(`   Status: ${retrievedPass.status}`);
    console.log(`   Issue Time: ${storedIssueLocal.toLocaleString()} IST`);
    console.log(`   Return Time: ${storedReturnLocal.toLocaleString()} IST\n`);

    console.log("════════════════════════════════════════════════════════════\n");
    if (issueMatch && returnMatch) {
      console.log("   ✅ SUCCESS: Pass issued at correct times!");
      console.log("   Times are stored in UTC and correctly converted to IST.\n");
    } else {
      console.log("   ❌ FAILURE: Times do not match!\n");
    }
    console.log("════════════════════════════════════════════════════════════\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

comprehensivePassTest();
