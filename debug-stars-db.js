const { client, db } = require("./db/index.ts");

async function debug() {
  try {
    console.log("Connecting to database...");
    
    // Get raw SQL result
    const result = await db.execute(`
      SELECT 
        COUNT(*) as total_students,
        (SELECT COUNT(*) FROM student_stars) as total_stars_records,
        (SELECT COUNT(*) FROM student_stars WHERE stars > 0) as students_with_stars,
        (SELECT COUNT(*) FROM star_history) as total_history
    `);
    
    console.log("Database Summary:", result);

    // Get actual star data
    const starsData = await db.query(`
      SELECT 
        ss.id,
        ss.student_id,
        s.name as student_name,
        s.admission_number,
        s.class_name,
        ss.stars,
        ss.awarded_by,
        ss.awarded_by_name,
        ss.reason
      FROM student_stars ss
      LEFT JOIN students s ON ss.student_id = s.id
      ORDER BY ss.stars DESC
      LIMIT 10
    `);

    console.log("Top star records:", starsData);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

debug();
