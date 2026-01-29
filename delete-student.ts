import { Pool } from "pg";

async function deleteStudent(studentId: number) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    const client = await pool.connect();
    console.log(`Deleting student with ID: ${studentId}...`);

    // 1. Delete related phone status records
    await client.query("DELETE FROM phone_status WHERE student_id = $1", [
      studentId,
    ]);
    console.log("✓ Deleted phone status records");

    // 2. Delete related special pass grants
    await client.query("DELETE FROM special_pass_grants WHERE student_id = $1", [
      studentId,
    ]);
    console.log("✓ Deleted special pass grants");

    // 3. Delete the student
    const result = await client.query(
      "DELETE FROM students WHERE id = $1 RETURNING name, admission_number",
      [studentId]
    );

    client.release();

    if (result.rows.length > 0) {
      const { name, admission_number } = result.rows[0];
      console.log(`✓ Student deleted: ${name} (${admission_number})`);
    } else {
      console.log("⚠ Student not found");
    }

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error deleting student:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run with student ID from command line: npx ts-node delete-student.ts 1
const studentId = parseInt(process.argv[2], 10);
if (!studentId || isNaN(studentId)) {
  console.error(
    "Please provide a valid student ID: npx ts-node delete-student.ts <student_id>"
  );
  process.exit(1);
}

deleteStudent(studentId);
