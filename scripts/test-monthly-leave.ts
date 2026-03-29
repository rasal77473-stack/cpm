import { db } from "@/db";
import { monthlyLeaves } from "@/db/schema";

async function createTestMonthlyLeave() {
  try {
    console.log("🚀 Creating test monthly leave...");
    console.log("Database:", db ? "✓ Connected" : "✗ Not connected");

    if (!db) {
      console.error("❌ Database not connected!");
      process.exit(1);
    }

    // Create a monthly leave for today and tomorrow
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const testLeave = {
      startDate: today.toISOString(),
      endDate: tomorrow.toISOString(),
      startTime: "09:00",
      endTime: "17:00",
      reason: "Test Monthly Leave",
      createdBy: 1,
      createdByName: "Test Admin",
      status: "ACTIVE" as const,
    };

    console.log("Inserting test leave:", JSON.stringify(testLeave, null, 2));

    const [newLeave] = await db
      .insert(monthlyLeaves)
      .values(testLeave)
      .returning();

    console.log("✓ Test monthly leave created successfully!");
    console.log("Leave ID:", newLeave.id);
    console.log("Leave details:", JSON.stringify(newLeave, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating test monthly leave:");
    console.error(error);
    process.exit(1);
  }
}

createTestMonthlyLeave();
