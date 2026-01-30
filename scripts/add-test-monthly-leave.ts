import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { monthlyLeaves, specialPassGrants, students } from "@/db/schema";

const DATABASE_URL = "postgresql://postgres.gnnfaijjvqikohblyjlz:rasal786%40%40%40@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const db = drizzle(pool, { schema: { monthlyLeaves, specialPassGrants, students } });

async function createTestMonthlyLeave() {
  try {
    console.log("Creating test monthly leave...");

    // Create monthly leave
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0);
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 18, 0, 0);

    const [newLeave] = await db
      .insert(monthlyLeaves)
      .values({
        startDate,
        endDate,
        startTime: "09:00",
        endTime: "18:00",
        reason: "Monthly Leave",
        createdBy: 1,
        createdByName: "Admin",
        status: "ACTIVE",
      })
      .returning();

    console.log("✅ Monthly leave created:", newLeave);

    // Get all students
    const allStudents = await db.select().from(students);
    console.log(`Found ${allStudents.length} students`);

    // Create phone and gate passes for first 3 students
    const studentsToGrant = allStudents.slice(0, 3);
    const passRecords: any[] = [];

    studentsToGrant.forEach((student: any) => {
      // Phone pass
      passRecords.push({
        studentId: student.id,
        mentorId: 1,
        mentorName: "Admin",
        purpose: `PHONE: Monthly Leave (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`,
        issueTime: startDate,
        returnTime: endDate,
        status: "ACTIVE",
      });

      // Gate pass
      passRecords.push({
        studentId: student.id,
        mentorId: 1,
        mentorName: "Admin",
        purpose: `GATE: Monthly Leave (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`,
        issueTime: startDate,
        returnTime: endDate,
        status: "ACTIVE",
      });
    });

    await db.insert(specialPassGrants).values(passRecords);

    console.log(`✅ Created ${passRecords.length} passes for ${studentsToGrant.length} students`);
    console.log("\nStudents who received passes:");
    studentsToGrant.forEach((s: any) => {
      console.log(`  - ${s.name} (ID: ${s.id})`);
    });

    console.log("\n✅ Test monthly leave created successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createTestMonthlyLeave();
