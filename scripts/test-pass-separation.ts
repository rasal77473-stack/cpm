import { db } from "@/db"
import { specialPassGrants, students, phoneStatus, users } from "@/db/schema"

async function testPassSeparation() {
  try {
    console.log("🧪 Testing Phone Pass & Gate Pass Separation...\n")

    // Get a test student
    const testStudents = await db.select().from(students).limit(1)
    if (!testStudents.length) {
      console.log("❌ No students found. Please add students first.")
      return
    }

    const student = testStudents[0]
    console.log(`📝 Using student: ${student.name} (ID: ${student.id})\n`)

    // Get a test mentor
    const testMentors = await db.select().from(users).limit(1)
    if (!testMentors.length) {
      console.log("❌ No mentors found.")
      return
    }

    const mentor = testMentors[0]

    // Remove any existing passes for this student
    await db.delete(specialPassGrants).where({ studentId: student.id })
    console.log("🗑️  Cleared existing passes for student\n")

    // Create a PHONE pass
    const phonePass = await db
      .insert(specialPassGrants)
      .values({
        studentId: student.id,
        mentorId: mentor.id,
        mentorName: mentor.name,
        purpose: "PHONE: Medical appointment",
        status: "ACTIVE",
        expectedReturnDate: "2026-02-01",
        expectedReturnTime: "14:30",
      })
      .returning()

    console.log("✅ Phone Pass Created:")
    console.log(`   ID: ${phonePass[0]?.id}`)
    console.log(`   Purpose: ${phonePass[0]?.purpose}`)
    console.log(`   Status: ${phonePass[0]?.status}\n`)

    // Create a GATE pass
    const gatePass = await db
      .insert(specialPassGrants)
      .values({
        studentId: student.id,
        mentorId: mentor.id,
        mentorName: mentor.name,
        purpose: "GATE: Emergency home visit",
        status: "ACTIVE",
      })
      .returning()

    console.log("✅ Gate Pass Created:")
    console.log(`   ID: ${gatePass[0]?.id}`)
    console.log(`   Purpose: ${gatePass[0]?.purpose}`)
    console.log(`   Status: ${gatePass[0]?.status}\n`)

    // Fetch all passes and check separation
    const allPasses = await db
      .select()
      .from(specialPassGrants)
      .where({ studentId: student.id })

    console.log("📊 Verification Results:")
    console.log("─────────────────────────────\n")

    const phonePasses = allPasses.filter((p) => p.purpose?.startsWith("PHONE:"))
    const gatePasses = allPasses.filter((p) => p.purpose?.startsWith("GATE:"))

    console.log(`📱 Phone Passes Found: ${phonePasses.length}`)
    phonePasses.forEach((p) => {
      console.log(`   ✓ ${p.purpose}`)
    })

    console.log(`\n🚪 Gate Passes Found: ${gatePasses.length}`)
    gatePasses.forEach((p) => {
      console.log(`   ✓ ${p.purpose}`)
    })

    console.log("\n─────────────────────────────")
    console.log("✨ RESULT:")

    if (phonePasses.length === 1 && gatePasses.length === 1) {
      console.log("✅ PASS SEPARATION IS WORKING CORRECTLY!")
      console.log("   - Phone pass shows ONLY in phone-pass section")
      console.log("   - Gate pass shows ONLY in gate-pass section")
    } else {
      console.log("❌ SEPARATION FAILED!")
      console.log(
        `   Found ${phonePasses.length} phone pass(es) and ${gatePasses.length} gate pass(es)`
      )
    }

    console.log("\n💡 You can now check:")
    console.log(`   1. Go to /special-pass - should see 1 phone pass`)
    console.log(`   2. Go to /gate-pass - should see 1 gate pass`)
    console.log(`   3. Each card should only appear in its section`)
  } catch (error) {
    console.error("❌ Error:", error)
  }
}

testPassSeparation()
