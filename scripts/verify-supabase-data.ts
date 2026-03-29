import { db } from "@/db"
import { students, users, specialPassGrants, monthlyLeaves, leaveExclusions, phoneStatus } from "@/db/schema"

async function verifyData() {
  try {
    console.log("\n📊 Verifying Supabase Data...\n")

    // Count students
    const allStudents = await db.select().from(students)
    console.log(`✓ Students: ${allStudents.length}`)
    if (allStudents.length > 0) {
      console.log(`  Sample: ${allStudents[0].name} (${allStudents[0].admissionNumber})`)
    }

    // Count users
    const allUsers = await db.select().from(users)
    console.log(`\n✓ Users: ${allUsers.length}`)
    if (allUsers.length > 0) {
      console.log(`  Sample: ${allUsers[0].name} (${allUsers[0].role})`)
    }

    // Count special passes
    const allPasses = await db.select().from(specialPassGrants)
    console.log(`\n✓ Special Passes: ${allPasses.length}`)

    // Count monthly leaves
    const allLeaves = await db.select().from(monthlyLeaves)
    console.log(`\n✓ Monthly Leaves: ${allLeaves.length}`)

    // Count leave exclusions
    const allExclusions = await db.select().from(leaveExclusions)
    console.log(`\n✓ Leave Exclusions: ${allExclusions.length}`)

    // Count phone statuses
    const allPhoneStatuses = await db.select().from(phoneStatus)
    console.log(`\n✓ Phone Statuses: ${allPhoneStatuses.length}`)
    if (allPhoneStatuses.length > 0) {
      const status = allPhoneStatuses[0]
      const student = allStudents.find((s) => s.id === status.studentId)
      console.log(`  Sample: ${student?.name || "Unknown"} - ${status.status}`)
    }

    console.log("\n✅ All data verified successfully!\n")
  } catch (error) {
    console.error("❌ Error verifying data:", error)
    throw error
  }
}

verifyData()
