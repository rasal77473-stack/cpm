/**
 * Auto-Activate Monthly Leave Passes
 * 
 * This script should run periodically (every minute or via cron)
 * to activate PENDING passes when their start time is reached
 * and complete them when the end time is reached
 */

import { db } from "@/db"
import { monthlyLeaves, specialPassGrants } from "@/db/schema"
import { eq, lte, gte, and } from "drizzle-orm"

export async function autoActivateMonthlyLeavePasses() {
  try {
    const now = new Date()
    console.log(`\n🔄 Auto-Activate Monthly Leave Passes - ${now.toISOString()}`)
    
    // Find all leaves that should be IN_PROGRESS
    const activatingLeaves = await db
      .select()
      .from(monthlyLeaves)
      .where(
        and(
          eq(monthlyLeaves.status, "PENDING"),
          lte(monthlyLeaves.startDate, now) // Start date has passed
        )
      )

    console.log(`📅 Found ${activatingLeaves.length} leaves to activate`)

    // Activate PENDING passes for these leaves
    for (const leave of activatingLeaves) {
      const passesAffected = await db
        .select()
        .from(specialPassGrants)
        .where(
          and(
            eq(specialPassGrants.status, "PENDING"),
            gte(specialPassGrants.returnTime, now) // Return time hasn't passed yet
          )
        )

      console.log(`✨ Activating ${passesAffected.length} PENDING passes for leave ${leave.id}`)

      // Update passes to ACTIVE
      await db
        .update(specialPassGrants)
        .set({ status: "ACTIVE" })
        .where(eq(specialPassGrants.status, "PENDING"))

      // Update leave status to IN_PROGRESS
      await db
        .update(monthlyLeaves)
        .set({ status: "IN_PROGRESS" })
        .where(eq(monthlyLeaves.id, leave.id))

      console.log(`✅ Leave ${leave.id} activated - passes are now ACTIVE`)
    }

    // Find all leaves that should be COMPLETED
    const completingLeaves = await db
      .select()
      .from(monthlyLeaves)
      .where(
        and(
          eq(monthlyLeaves.status, "IN_PROGRESS"),
          lte(monthlyLeaves.endDate, now) // End date has passed
        )
      )

    console.log(`📅 Found ${completingLeaves.length} leaves to complete`)

    // Complete passes for these leaves
    for (const leave of completingLeaves) {
      const passesAffected = await db
        .select()
        .from(specialPassGrants)
        .where(eq(specialPassGrants.status, "ACTIVE"))

      console.log(`✨ Completing ${passesAffected.length} ACTIVE passes for leave ${leave.id}`)

      // Update passes to COMPLETED
      await db
        .update(specialPassGrants)
        .set({ status: "COMPLETED" })
        .where(eq(specialPassGrants.status, "ACTIVE"))

      // Update leave status to COMPLETED
      await db
        .update(monthlyLeaves)
        .set({ status: "COMPLETED" })
        .where(eq(monthlyLeaves.id, leave.id))

      console.log(`✅ Leave ${leave.id} completed`)
    }

    console.log("✅ Auto-activation check complete\n")
  } catch (error) {
    console.error("❌ Error in autoActivateMonthlyLeavePasses:", error)
  }
}

// Export for use in API route or cron job
export default autoActivateMonthlyLeavePasses
