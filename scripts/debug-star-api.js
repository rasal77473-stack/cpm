const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: "postgresql://postgres.gnnfaijjvqikohblyjlz:rasal786%40%40%40@aws-1-eu-central-2.pooler.supabase.com:6543/postgres",
});

async function testStarAPI() {
  try {
    await client.connect();
    console.log('🧪 Testing Star Award Process\n');

    // 1. Get a student to test with
    console.log('1️⃣  Getting a test student...');
    const students = await client.query('SELECT id, name, admission_number FROM students LIMIT 1');
    if (students.rows.length === 0) {
      console.error('❌ No students found in database');
      await client.end();
      return;
    }
    
    const testStudent = students.rows[0];
    console.log(`✅ Test student: ${testStudent.name} (ID: ${testStudent.id})\n`);

    // 2. Check current stars
    console.log('2️⃣  Checking current stars...');
    const currentStars = await client.query(
      'SELECT * FROM student_stars WHERE student_id = $1',
      [testStudent.id]
    );
    console.log(`   Current stars: ${currentStars.rows[0]?.stars || 0}\n`);

    // 3. Simulate the API call - Insert into student_stars
    console.log('3️⃣  Simulating API award (inserting 5 stars)...');
    const starsToAdd = 5;
    const awardedBy = 1;
    const awardedByName = 'Test Staff';
    const reason = 'Test award';

    // Get or create star record
    let starRecord = currentStars.rows[0];
    
    if (!starRecord) {
      console.log('   Creating new star record...');
      const created = await client.query(
        `INSERT INTO student_stars (student_id, stars, awarded_by, awarded_by_name, reason, awarded_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [testStudent.id, starsToAdd, awardedBy, awardedByName, reason]
      );
      starRecord = created.rows[0];
      console.log('✅ Created:', starRecord);
    } else {
      console.log('   Updating existing star record...');
      const newStarCount = (starRecord.stars || 0) + starsToAdd;
      const updated = await client.query(
        `UPDATE student_stars 
         SET stars = $1, awarded_by = $2, awarded_by_name = $3, reason = $4, awarded_at = NOW()
         WHERE student_id = $5
         RETURNING *`,
        [newStarCount, awardedBy, awardedByName, reason, testStudent.id]
      );
      starRecord = updated.rows[0];
      console.log('✅ Updated:', starRecord);
    }

    // 4. Insert into star_history
    console.log('\n4️⃣  Logging to star_history...');
    const newStarCount = starRecord.stars;
    const historyResult = await client.query(
      `INSERT INTO star_history (student_id, action, stars, awarded_by, awarded_by_name, reason, current_stars, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [testStudent.id, 'award', starsToAdd, awardedBy, awardedByName, reason, newStarCount]
    );
    console.log('✅ History logged:', historyResult.rows[0]);

    // 5. Verify the data
    console.log('\n5️⃣  Verifying updates...');
    const verified = await client.query(
      'SELECT * FROM student_stars WHERE student_id = $1',
      [testStudent.id]
    );
    console.log(`✅ Final stars in DB: ${verified.rows[0].stars}`);

    const historyVerify = await client.query(
      'SELECT * FROM star_history WHERE student_id = $1 ORDER BY timestamp DESC LIMIT 1',
      [testStudent.id]
    );
    console.log(`✅ Latest history entry: action=${historyVerify.rows[0].action}, stars=${historyVerify.rows[0].stars}, current_stars=${historyVerify.rows[0].current_stars}`);

    console.log('\n✅ Test completed successfully! API should work.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

testStarAPI();
