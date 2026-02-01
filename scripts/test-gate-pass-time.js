// Test script to verify 5:30 hour time adjustment on gate pass creation

async function testGatePass() {
  try {
    // Use student ID 1 as test
    const payload = {
      studentId: 1,
      mentorId: 1,
      mentorName: "Test Mentor",
      purpose: "Test Gate Pass",
      returnTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
      submissionTime: (() => {
        const time = new Date();
        console.log("⏰ Original time (browser would send):", time.toISOString());
        time.setHours(time.getHours() - 5);
        time.setMinutes(time.getMinutes() - 30);
        console.log("⏰ Adjusted time (-5:30 hours):", time.toISOString());
        return time.toISOString();
      })(),
      staffId: 1,
    };

    console.log("\n📤 Test Payload to send to API:");
    console.log(JSON.stringify(payload, null, 2));

    const response = await fetch("http://localhost:5000/api/gate-pass/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    console.log("\n📥 Response Status:", response.status);
    console.log("📥 Response Data:");
    console.log(JSON.stringify(data, null, 2));

    if (response.ok && data.data) {
      console.log("\n✅ Success! Gate pass created");
      console.log("Stored issueTime:", data.data.issueTime);
    } else {
      console.log("\n❌ Error:", data.error || data.message);
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testGatePass();
