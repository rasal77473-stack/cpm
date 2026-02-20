import { db } from "@/db"
import { students } from "@/db/schema"

async function addTestStudent() {
  try {
    console.log("Adding test student...")

    const newStudent = await db.insert(students).values({
      admissionNumber: "TST001",
      name: "Test Student",
      lockerNumber: "L-001",
      phoneNumber: "+1234567890",
      class: "10A",
      rollNumber: "01",
      phoneName: "iPhone 12",
      className: "Class 10-A",
      rollNo: "01",
    }).returning()

    console.log("✓ Test student added successfully:", newStudent[0])
  } catch (error) {
    console.error("✗ Error adding test student:", error)
    throw error
  }
}

addTestStudent().then(() => {
  console.log("Done!")
  process.exit(0)
}).catch((error) => {
  console.error("Failed:", error)
  process.exit(1)
})
