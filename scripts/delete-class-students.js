const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const mode = process.argv[2];
  if (!mode || (mode !== "list" && mode !== "delete")) {
    console.error("Usage: node scripts/delete-class-students.js <list|delete> <class1> [class2 ...]");
    process.exit(1);
  }

  const classes = process.argv.slice(3).map(c => c.toLowerCase());
  if (classes.length === 0) {
    console.error("Please provide at least one class name.");
    process.exit(1);
  }

  try {
    const client = await pool.connect();

    console.log(`\n=== Students matching classes: ${classes.join(", ")} ===`);
    
    // Create parameter placeholders for the IN clause
    const placeholders = classes.map((_, i) => `$${i + 1}`).join(", ");
    
    const studentsResult = await client.query(
      `SELECT id, name, admission_number, class, class_name, roll_number 
       FROM students 
       WHERE LOWER(class) IN (${placeholders}) OR LOWER(class_name) IN (${placeholders}) 
       ORDER BY class_name, name`,
      classes
    );

    if (studentsResult.rows.length === 0) {
      console.log(`No students found for classes: ${classes.join(", ")}`);
      client.release();
      await pool.end();
      return;
    }

    console.log(`Found ${studentsResult.rows.length} students:`);
    if (mode === "list") {
      console.table(studentsResult.rows);
    }

    if (mode === "delete") {
      const studentIds = studentsResult.rows.map((s) => s.id);
      console.log(`\nDeleting ${studentIds.length} students and their related records...`);

      // Delete from all related tables first (foreign key constraints)
      const tables = [
        "phone_status",
        "phone_history",
        "special_pass_grants",
        "leave_exclusions",
        "student_fines",
        "student_tallies",
        "student_stars",
        "star_history",
      ];

      for (const table of tables) {
        const res = await client.query(
          `DELETE FROM ${table} WHERE student_id = ANY($1)`,
          [studentIds]
        );
        console.log(`  ✓ Deleted ${res.rowCount} rows from ${table}`);
      }

      // Delete the students
      const deleteResult = await client.query(
        "DELETE FROM students WHERE id = ANY($1) RETURNING id, name, admission_number, class_name",
        [studentIds]
      );
      console.log(`\n✅ Successfully deleted ${deleteResult.rowCount} students.`);
      
      // Group by class for better display
      const deletedByClass = {};
      deleteResult.rows.forEach(s => {
        const cls = s.class_name || 'Unknown';
        if (!deletedByClass[cls]) deletedByClass[cls] = [];
        deletedByClass[cls].push(s);
      });

      for (const cls in deletedByClass) {
        console.log(`\nClass ${cls} (${deletedByClass[cls].length} students):`);
        deletedByClass[cls].forEach(s => {
          console.log(`   - ${s.name} (${s.admission_number})`);
        });
      }
    } else {
      console.log("\n⚠️  This was a DRY RUN. To actually delete, run:");
      console.log(`   node scripts/delete-class-students.js delete ${classes.join(" ")}`);
    }

    client.release();
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

main();
