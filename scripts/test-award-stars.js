#!/usr/bin/env node
/**
 * Test script for award stars functionality
 * Run: node scripts/test-award-stars.js
 */

require('dotenv').config({ path: '.env.local' });

async function testAwardStars() {
  console.log('🧪 Testing Award Stars Functionality\n');

  try {
    // 1. Check database connection and tables
    console.log('1️⃣  Checking database tables...');
    const { Client } = require('pg');
    const client = new Client({
      connectionString: "postgresql://postgres.gnnfaijjvqikohblyjlz:rasal786%40%40%40@aws-1-eu-central-2.pooler.supabase.com:6543/postgres",
    });
    await client.connect();
    console.log('✅ Database connected\n');
    
    // 2. Check if star_history table exists
    console.log('2️⃣  Checking star_history table...');
    const result = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'star_history'
      );
    `);
    
    if (result.rows[0].exists) {
      console.log('✅ star_history table exists');
      
      // Check table structure
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'star_history'
        ORDER BY ordinal_position;
      `);
      console.log('   Columns:', columns.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
    } else {
      console.error('❌ star_history table NOT found. Run: node apply-star-history-migration.js');
    }
    
    console.log('\n3️⃣  Checking student_stars table...');
    const checkStarTable = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'student_stars'
      );
    `);
    
    if (checkStarTable.rows[0].exists) {
      console.log('✅ student_stars table exists');
    } else {
      console.error('❌ student_stars table NOT found. Run: node apply-stars-migration.js');
    }
    
    console.log('\n4️⃣  Checking students table...');
    const studentsCount = await client.query('SELECT COUNT(*) FROM students');
    console.log(`✅ ${studentsCount.rows[0].count} students in database`);
    
    console.log('\n5️⃣  Checking star_history records...');
    const logsCount = await client.query('SELECT COUNT(*) FROM star_history');
    console.log(`✅ ${logsCount.rows[0].count} records in star_history`);
    
    if (logsCount.rows[0].count > 0) {
      const recentLogs = await client.query(`
        SELECT 
          sh.id, 
          s.name as student_name,
          sh.action,
          sh.stars,
          sh.current_stars,
          sh.timestamp
        FROM star_history sh
        JOIN students s ON sh.student_id = s.id
        ORDER BY sh.timestamp DESC
        LIMIT 5
      `);
      console.log('\n   Recent star activities:');
      recentLogs.rows.forEach(log => {
        console.log(`   - ${log.student_name}: ${log.action} ${log.stars} star(s) (Total: ${log.current_stars}) at ${log.timestamp}`);
      });
    }
    
    console.log('\n6️⃣  Checking student_stars records...');
    const starsCount = await client.query('SELECT COUNT(*) FROM student_stars WHERE stars > 0');
    console.log(`✅ ${starsCount.rows[0].count} students have stars`);
    
    if (starsCount.rows[0].count > 0) {
      const topStudents = await client.query(`
        SELECT 
          s.name,
          s.admission_number,
          ss.stars,
          ss.awarded_by_name,
          ss.awarded_at
        FROM student_stars ss
        JOIN students s ON ss.student_id = s.id
        WHERE ss.stars > 0
        ORDER BY ss.stars DESC
        LIMIT 5
      `);
      console.log('\n   Top students with stars:');
      topStudents.rows.forEach(row => {
        console.log(`   - ${row.name} (${row.admission_number}): ⭐ ${row.stars} stars by ${row.awarded_by_name}`);
      });
    }
    
    await client.end();
    console.log('\n✅ All checks passed! Award stars should work.');
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

testAwardStars();
