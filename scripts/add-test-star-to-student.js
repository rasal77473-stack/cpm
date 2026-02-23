const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: "postgresql://postgres.gnnfaijjvqikohblyjlz:rasal786%40%40%40@aws-1-eu-central-2.pooler.supabase.com:6543/postgres",
});

async function addTestStar() {
  try {
    await client.connect();
    console.log('🔍 Finding student: "muhammed rasil p"\n');

    // 1. Find the student
    const studentResult = await client.query(
      `SELECT id, name, admission_number, class_name FROM students 
       WHERE LOWER(name) LIKE LOWER('%muhammed rasil%') OR LOWER(name) LIKE LOWER('%rasil%')
       LIMIT 5`
    );

    if (studentResult.rows.length === 0) {
      console.log('❌ Student not found. Searching for similar names...\n');
      const similar = await client.query(
        `SELECT id, name, admission_number FROM students 
         WHERE LOWER(name) LIKE LOWER('%muhammed%') OR LOWER(name) LIKE LOWER('%rasil%')
         LIMIT 10`
      );
      console.log('Found similar students:');
      similar.rows.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.name} (ID: ${s.id})`);
      });
      await client.end();
      return;
    }

    const student = studentResult.rows[0];
    console.log(`✅ Found student: ${student.name}`);
    console.log(`   ID: ${student.id}`);
    console.log(`   Admission: ${student.admission_number}`);
    console.log(`   Class: ${student.class_name}\n`);

    // 2. Check current stars
    console.log('2️⃣  Checking current stars...');
    const currentStars = await client.query(
      'SELECT stars FROM student_stars WHERE student_id = $1',
      [student.id]
    );
    const currentCount = currentStars.rows[0]?.stars || 0;
    console.log(`   Current stars: ${currentCount}\n`);

    // 3. Add 1 star
    console.log('3️⃣  Adding 1 star...');
    let result;
    
    if (currentStars.rows.length === 0) {
      // Insert new record
      result = await client.query(
        `INSERT INTO student_stars (student_id, stars, awarded_by, awarded_by_name, reason, awarded_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [student.id, 1, 1, 'System Test', 'Test star award']
      );
      console.log('   ✅ Created new star record');
    } else {
      // Update existing record
      const newCount = currentCount + 1;
      result = await client.query(
        `UPDATE student_stars 
         SET stars = $1, awarded_by = $2, awarded_by_name = $3, reason = $4, awarded_at = NOW()
         WHERE student_id = $5
         RETURNING *`,
        [newCount, 1, 'System Test', 'Test star award', student.id]
      );
      console.log(`   ✅ Updated to ${newCount} stars`);
    }

    // 4. Log to history
    console.log('\n4️⃣  Logging to history...');
    const historyResult = await client.query(
      `INSERT INTO star_history (student_id, action, stars, awarded_by, awarded_by_name, reason, current_stars, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [student.id, 'award', 1, 1, 'System Test', 'Test star award', result.rows[0].stars]
    );
    console.log('   ✅ History logged\n');

    // 5. Verify
    console.log('5️⃣  Verification:');
    const verified = await client.query(
      'SELECT * FROM student_stars WHERE student_id = $1',
      [student.id]
    );
    console.log(`   ⭐ Total stars: ${verified.rows[0].stars}`);
    console.log(`   📝 Last awarded by: ${verified.rows[0].awarded_by_name}`);
    console.log(`   💬 Reason: ${verified.rows[0].reason}`);

    console.log('\n✅ Test star added successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

addTestStar();
