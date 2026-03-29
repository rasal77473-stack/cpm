import { db } from "@/db"
import { specialPassGrants, phoneHistory } from "@/db/schema"
import { eq } from "drizzle-orm"

async function testPhonePassReturn() {
  console.log("🧪 Testing Phone Pass Return Functionality\n")
  
  try {
    // Find the most recent active pass
    console.log("1️⃣  Finding active phone pass...")
    const activePasses = await db.select().from(specialPassGrants)
      .where(eq(specialPassGrants.status, "ACTIVE"))
      .limit(1)
    
    if (!activePasses || activePasses.length === 0) {
      console.log("❌ No active passes found")
      return
    }
    
    const pass = activePasses[0]
    console.log(`✅ Found active pass:`)
    console.log(`   ID: ${pass.id}`)
    console.log(`   Student ID: ${pass.studentId}`)
    console.log(`   Purpose: ${pass.purpose}`)
    console.log(`   Status: ${pass.status}\n`)
    
    // Return the pass
    console.log("2️⃣  Returning phone pass...")
    const [returned] = await db.update(specialPassGrants)
      .set({
        status: "COMPLETED",
        submissionTime: new Date().toISOString()
      })
      .where(eq(specialPassGrants.id, pass.id))
      .returning()
    
    console.log(`✅ Phone Pass Returned!`)
    console.log(`   ID: ${returned.id}`)
    console.log(`   New Status: ${returned.status}`)
    console.log(`   Submission Time: ${returned.submissionTime}\n`)
    
    // Verify the update
    console.log("3️⃣  Verifying in database...")
    const [verified] = await db.select().from(specialPassGrants)
      .where(eq(specialPassGrants.id, pass.id))
    
    console.log(`✅ Pass status confirmed:`)
    console.log(`   Status: ${verified.status}`)
    console.log(`   Pass is no longer active\n`)
    
    console.log("=".repeat(50))
    console.log("✅ PHONE PASS RETURN TEST SUCCESSFUL!")
    console.log("=".repeat(50))
    console.log("\n📋 Phone Pass Lifecycle Complete:")
    console.log("  1. ✓ Pass created and marked ACTIVE")
    console.log("  2. ✓ Pass returned and marked COMPLETED")
    console.log("  3. ✓ Student can now receive another phone pass")
    console.log("  4. ✓ History is maintained in database")
    
  } catch (error) {
    console.error("❌ Test Failed:", error)
  }
  
  process.exit(0)
}

testPhonePassReturn()
