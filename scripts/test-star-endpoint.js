#!/usr/bin/env node
/**
 * Test the actual API endpoint
 */
require('dotenv').config({ path: '.env.local' });

async function testAPIEndpoint() {
  console.log('🧪 Testing Star API Endpoint\n');

  try {
    // 1. Get a test student ID
    const { Client } = require('pg');
    const client = new Client({
      connectionString: "postgresql://postgres.gnnfaijjvqikohblyjlz:rasal786%40%40%40@aws-1-eu-central-2.pooler.supabase.com:6543/postgres",
    });
    await client.connect();

    const students = await client.query('SELECT id FROM students ORDER BY id DESC LIMIT 1');
    const studentId = students.rows[0].id;
    console.log(`1️⃣  Test student ID: ${studentId}\n`);

    // 2. Call the API endpoint
    console.log('2️⃣  Calling POST /api/students/${studentId}/stars...');
    const response = await fetch(`http://localhost:3000/api/students/${studentId}/stars`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify({
        action: 'award',
        stars: 3,
        awardedBy: 1,
        awardedByName: 'Test User',
        reason: 'Testing API',
      }),
    });

    console.log(`Status: ${response.status}`);
    console.log(`Headers:`, Object.fromEntries(response.headers));

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ API call successful!');
    } else {
      console.log('\n❌ API returned an error status');
    }

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Give the app a moment to start listening if needed
console.log('Make sure the dev server is running (pnpm dev)');
console.log('Waiting 2 seconds...\n');

setTimeout(() => {
  testAPIEndpoint();
}, 2000);
