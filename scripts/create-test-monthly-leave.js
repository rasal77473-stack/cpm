const API_URL = "http://localhost:5000"; // Adjust if needed

async function createMonthlyLeave() {
  try {
    // Create monthly leave
    const today = new Date();
    const startDate = today.toISOString().split("T")[0]; // YYYY-MM-DD
    const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0]; // 7 days from now

    console.log(`Creating monthly leave from ${startDate} to ${endDate}...`);

    const createLeaveResponse = await fetch(
      `${API_URL}/api/monthly-leave`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: `${startDate}T09:00:00.000Z`,
          endDate: `${endDate}T18:00:00.000Z`,
          startTime: "09:00",
          endTime: "18:00",
          createdBy: 1, // Admin user ID
          createdByName: "Admin",
          excludedStudents: [],
        }),
      }
    );

    if (!createLeaveResponse.ok) {
      const error = await createLeaveResponse.json();
      throw new Error(`Failed to create leave: ${JSON.stringify(error)}`);
    }

    const leaveData = await createLeaveResponse.json();
    console.log("✅ Monthly leave created:", leaveData);

    // Grant passes for the leave
    console.log(`\nGranting passes for leave ID ${leaveData.id}...`);

    const grantResponse = await fetch(
      `${API_URL}/api/monthly-leave/${leaveData.id}/grant`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentorId: 1,
          mentorName: "Admin",
        }),
      }
    );

    if (!grantResponse.ok) {
      const error = await grantResponse.json();
      throw new Error(`Failed to grant passes: ${JSON.stringify(error)}`);
    }

    const grantData = await grantResponse.json();
    console.log("✅ Passes granted:", grantData);
    console.log(`\n✅ Successfully created monthly leave with ${grantData.granted} passes!`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

createMonthlyLeave();
