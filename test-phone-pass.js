const http = require('http');

// Test data - using student ID 2 (ABDUL AHAD NAZIR)
const studentId = 2;
const mentorId = 1;
const mentorName = "Test Staff";

const payload = {
  studentId: studentId,
  mentorId: mentorId,
  mentorName: mentorName,
  purpose: "Medical appointment - test pass",
  staffId: mentorId,
  expectedReturnDate: "2026-02-19",
  expectedReturnTime: "17:00",
};

console.log("📤 Testing Phone Pass Grant...\n");
console.log("Payload:", JSON.stringify(payload, null, 2));

// Make request
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/special-pass/grant',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(JSON.stringify(payload))
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log("\n✅ Response Status:", res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log("Response Data:", JSON.stringify(parsed, null, 2));
      
      if (res.statusCode === 201) {
        console.log("\n🎉 Phone Pass Created Successfully!");
        console.log("Pass ID:", parsed.data?.id);
        process.exit(0);
      } else {
        console.log("\n❌ Error:", parsed.error || "Unknown error");
        process.exit(1);
      }
    } catch (e) {
      console.log("Response:", data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request Error:', error.message);
  process.exit(1);
});

req.write(JSON.stringify(payload));
req.end();
