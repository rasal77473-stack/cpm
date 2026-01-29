import { db } from "@/db"
import { students } from "@/db/schema"

async function addTestStudent() {
  try {
    console.log("Adding test student...")

    const newStudent = await db.insert(students).values({
      admission_number: "TST001",
      name: "Test Student",
      locker_number: "L-001",
      phone_number: "+1234567890",
      class: "10A",
      roll_number: "01",
      phone_name: "iPhone 12",
      class_name: "Class 10-A",
      roll_no: "01",
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
