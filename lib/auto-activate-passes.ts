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
    
    // Find all leaves that should be IN_PROGRESS (PENDING leaves where start time has arrived)
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
      console.log(`\n⏱️  Processing leave ${leave.id}: ${leave.startDate} to ${leave.endDate}`)
      
      // Get the corresponding PENDING passes (created by this monthly leave)
      const pendingPasses = await db
        .select()
        .from(specialPassGrants)
        .where(
          and(
            eq(specialPassGrants.status, "PENDING"),
            gte(specialPassGrants.issueTime, new Date(leave.startDate.getTime() - 60000)), // Within 1 min of leave start
            lte(specialPassGrants.issueTime, new Date(leave.startDate.getTime() + 60000))
          )
        )

      console.log(`✨ Found ${pendingPasses.length} PENDING passes to activate for leave ${leave.id}`)

      if (pendingPasses.length > 0) {
        // Update passes to ACTIVE
        await db
          .update(specialPassGrants)
          .set({ status: "ACTIVE" })
          .where(
            and(
              eq(specialPassGrants.status, "PENDING"),
              gte(specialPassGrants.issueTime, new Date(leave.startDate.getTime() - 60000)),
              lte(specialPassGrants.issueTime, new Date(leave.startDate.getTime() + 60000))
            )
          )

        // Update leave status to IN_PROGRESS
        await db
          .update(monthlyLeaves)
          .set({ status: "IN_PROGRESS" })
          .where(eq(monthlyLeaves.id, leave.id))

        console.log(`✅ Leave ${leave.id} activated - ${pendingPasses.length} passes are now ACTIVE`)
      }
    }

    // Find all leaves that should be COMPLETED (IN_PROGRESS leaves where end time has passed)
    const completingLeaves = await db
      .select()
      .from(monthlyLeaves)
      .where(
        and(
          eq(monthlyLeaves.status, "IN_PROGRESS"),
          lte(monthlyLeaves.endDate, now) // End date has passed
        )
      )

    console.log(`\n📅 Found ${completingLeaves.length} leaves to complete`)

    // Complete passes for these leaves
    for (const leave of completingLeaves) {
      console.log(`\n⏱️  Completing leave ${leave.id}`)
      
      // Get the corresponding ACTIVE passes for this leave
      const activePasses = await db
        .select()
        .from(specialPassGrants)
        .where(
          and(
            eq(specialPassGrants.status, "ACTIVE"),
            gte(specialPassGrants.issueTime, new Date(leave.startDate.getTime() - 60000)),
            lte(specialPassGrants.issueTime, new Date(leave.startDate.getTime() + 60000))
          )
        )

      console.log(`✨ Found ${activePasses.length} ACTIVE passes to complete for leave ${leave.id}`)

      if (activePasses.length > 0) {
        // Update passes to COMPLETED
        await db
          .update(specialPassGrants)
          .set({ status: "COMPLETED" })
          .where(
            and(
              eq(specialPassGrants.status, "ACTIVE"),
              gte(specialPassGrants.issueTime, new Date(leave.startDate.getTime() - 60000)),
              lte(specialPassGrants.issueTime, new Date(leave.startDate.getTime() + 60000))
            )
          )

        // Update leave status to COMPLETED
        await db
          .update(monthlyLeaves)
          .set({ status: "COMPLETED" })
          .where(eq(monthlyLeaves.id, leave.id))

        console.log(`✅ Leave ${leave.id} completed - ${activePasses.length} passes are now COMPLETED`)
      }
    }

    console.log("✅ Auto-activation check complete\n")
  } catch (error) {
    console.error("❌ Error in autoActivateMonthlyLeavePasses:", error)
  }
}

// Export for use in API route or cron job
export default autoActivateMonthlyLeavePasses
