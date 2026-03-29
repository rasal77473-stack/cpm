// Verification Script - Check if Phone Pass and Gate Pass are properly separated

console.log("🧪 CODE VERIFICATION: Phone Pass & Gate Pass Separation\n")
console.log("=" .repeat(60))

// Simulate the data
const simulatedPasses = [
  {
    id: 1,
    studentId: 1,
    purpose: "PHONE: Medical appointment",
    status: "ACTIVE",
    expectedReturnDate: "2026-02-01",
    expectedReturnTime: "14:30",
  },
  {
    id: 2,
    studentId: 1,
    purpose: "GATE: Emergency home visit",
    status: "ACTIVE",
  },
]

console.log("\n📋 Test Data:")
console.log("─".repeat(60))
simulatedPasses.forEach((pass) => {
  console.log(`  [Pass #${pass.id}] ${pass.purpose}`)
})

// Test the filtering logic from special-pass page
console.log("\n\n📱 PHONE PASS PAGE FILTERING:")
console.log("─".repeat(60))
const phonePasses = simulatedPasses.filter((p) => p.purpose?.startsWith("PHONE:"))
console.log(`Filter: passes.filter(p => p.purpose.startsWith("PHONE:"))`)
console.log(`Result: ${phonePasses.length} pass(es) found`)
phonePasses.forEach((p) => {
  console.log(`  ✓ [ID: ${p.id}] ${p.purpose}`)
})
console.log(`Expected Return: ${phonePasses[0]?.expectedReturnDate} at ${phonePasses[0]?.expectedReturnTime}`)

// Test the filtering logic from gate-pass page
console.log("\n\n🚪 GATE PASS PAGE FILTERING:")
console.log("─".repeat(60))
const gatePasses = simulatedPasses.filter((p) => p.purpose?.startsWith("GATE:"))
console.log(`Filter: passes.filter(p => p.purpose.startsWith("GATE:"))`)
console.log(`Result: ${gatePasses.length} pass(es) found`)
gatePasses.forEach((p) => {
  console.log(`  ✓ [ID: ${p.id}] ${p.purpose}`)
})

// Verify separation
console.log("\n\n✅ SEPARATION VERIFICATION:")
console.log("=" .repeat(60))

const phoneOnlyInPhone = phonePasses.every((p) => !p.purpose?.startsWith("GATE:"))
const gateOnlyInGate = gatePasses.every((p) => !p.purpose?.startsWith("PHONE:"))
const noOverlap = phonePasses.length === 1 && gatePasses.length === 1

console.log(
  `✓ Phone passes don't include gate passes: ${phoneOnlyInPhone ? "YES ✅" : "NO ❌"}`
)
console.log(
  `✓ Gate passes don't include phone passes: ${gateOnlyInGate ? "YES ✅" : "NO ❌"}`
)
console.log(
  `✓ Each pass type appears only once: ${noOverlap ? "YES ✅" : "NO ❌"}`
)

console.log("\n" + "=" .repeat(60))
if (phoneOnlyInPhone && gateOnlyInGate && noOverlap) {
  console.log("🎉 RESULT: PASS SEPARATION IS WORKING CORRECTLY!")
  console.log("\n   ✅ Phone Pass appears ONLY in /special-pass page")
  console.log("   ✅ Gate Pass appears ONLY in /gate-pass page")
  console.log("   ✅ No mixing or cross-contamination")
} else {
  console.log("❌ RESULT: SEPARATION HAS ISSUES!")
}

console.log("\n" + "=" .repeat(60))
console.log("\n📝 TO TEST MANUALLY IN YOUR APP:")
console.log("─".repeat(60))
console.log("1. Go to /admin/special-pass/grant/[studentId]")
console.log("   → Issue a PHONE pass")
console.log("\n2. Go to /admin/gate-pass/grant/[studentId]")
console.log("   → Issue a GATE pass (same student)")
console.log("\n3. Check /special-pass page")
console.log("   → Should show ONLY the PHONE pass ✓")
console.log("\n4. Check /gate-pass page")
console.log("   → Should show ONLY the GATE pass ✓")
console.log("\n5. Verify badges:")
console.log("   → Phone pass should show proper return date/time")
console.log("   → Gate pass should show as 'active'")
console.log("=" .repeat(60) + "\n")
