/**
 * Auto-Activate Monthly Leave Passes
 * 
 * This script should run periodically (every minute or via cron)
 * to activate PENDING passes when their start time is reached
 * and complete them when the end time is reached
 */

import { db } from "@/db"
import { monthlyLeaves, specialPassGrants, leaveExclusions, students } from "@/db/schema"
import { eq, lte, gte, and, notInArray } from "drizzle-orm"

export async function autoActivateMonthlyLeavePasses() {
  try {
    const now = new Date()
    console.log(`\n🔄 Auto-Activate Monthly Leave Passes - ${now.toISOString()}`)
    
    // Get all PENDING leaves (regardless of date first to debug)
    const allPendingLeaves = await db
      .select()
      .from(monthlyLeaves)
      .where(eq(monthlyLeaves.status, "PENDING"))

    console.log(`📅 Total PENDING leaves in DB: ${allPendingLeaves.length}`)
    
    // Check which ones should activate
    const activatingLeaves = allPendingLeaves.filter((leave) => {
      // Parse the leave start date and time
      const leaveStart = new Date(leave.startDate)
      const [startHour, startMin] = leave.startTime.split(":").map(Number)
      leaveStart.setHours(startHour, startMin, 0, 0)
      
      const shouldActivate = leaveStart <= now
      console.log(`   Leave ${leave.id}: startDate=${leaveStart.toISOString()}, now=${now.toISOString()}, shouldActivate=${shouldActivate}`)
      return shouldActivate
    })

    console.log(`📅 Found ${activatingLeaves.length} leaves ready to activate`)

    // Create and activate passes for these leaves
    for (const leave of activatingLeaves) {
      console.log(`\n⏱️  Processing leave ${leave.id}: ${leave.startDate} to ${leave.endDate}`)
      
      // Get excluded students for this leave
      const exclusions = await db
        .select({ studentId: leaveExclusions.studentId })
        .from(leaveExclusions)
        .where(eq(leaveExclusions.leaveId, leave.id))

      const excludedIds = exclusions.map((e) => e.studentId)

      // Get all eligible students (not excluded)
      let eligibleStudents
      if (excludedIds.length > 0) {
        eligibleStudents = await db
          .select()
          .from(students)
          .where(notInArray(students.id, excludedIds))
      } else {
        eligibleStudents = await db.select().from(students)
      }

      console.log(`✨ Creating passes for ${eligibleStudents.length} students`)

      // Calculate return times based on leave dates
      const startDate = new Date(leave.startDate)
      const endDate = new Date(leave.endDate)

      // Parse start and end times
      const [startHour, startMin] = leave.startTime.split(":").map(Number)
      const [endHour, endMin] = leave.endTime.split(":").map(Number)

      // Set issue time to start date + start time
      const issueTime = new Date(startDate)
      issueTime.setHours(startHour, startMin, 0, 0)

      // Set return time to end date + end time
      const returnTime = new Date(endDate)
      returnTime.setHours(endHour, endMin, 0, 0)

      const leaveReason = `Monthly Leave (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`

      // Create passes for all eligible students (both phone and gate)
      const passRecords: any[] = []
      eligibleStudents.forEach((student) => {
        // Phone pass - set to ACTIVE
        passRecords.push({
          studentId: student.id,
          mentorId: leave.createdBy,
          mentorName: leave.createdByName,
          purpose: `PHONE: ${leaveReason}`,
          issueTime,
          returnTime,
          status: "ACTIVE",
        })

        // Gate pass - set to ACTIVE
        passRecords.push({
          studentId: student.id,
          mentorId: leave.createdBy,
          mentorName: leave.createdByName,
          purpose: `GATE: ${leaveReason}`,
          issueTime,
          returnTime,
          status: "ACTIVE",
        })
      })

      if (passRecords.length > 0) {
        console.log(`💾 Creating ${passRecords.length} passes at ${issueTime.toISOString()}`)
        await db.insert(specialPassGrants).values(passRecords)
      }

      // Update leave status to IN_PROGRESS
      console.log(`📝 Updating leave ${leave.id} status to IN_PROGRESS`)
      await db
        .update(monthlyLeaves)
        .set({ status: "IN_PROGRESS" })
        .where(eq(monthlyLeaves.id, leave.id))

      console.log(`✅ Leave ${leave.id} activated - ${passRecords.length} passes created and set to ACTIVE`)
    }

    // Get all IN_PROGRESS leaves
    const allInProgressLeaves = await db
      .select()
      .from(monthlyLeaves)
      .where(eq(monthlyLeaves.status, "IN_PROGRESS"))

    console.log(`\n📅 Total IN_PROGRESS leaves in DB: ${allInProgressLeaves.length}`)

    // Check which ones should complete
    const completingLeaves = allInProgressLeaves.filter((leave) => {
      // Parse the leave end date and time
      const leaveEnd = new Date(leave.endDate)
      const [endHour, endMin] = leave.endTime.split(":").map(Number)
      leaveEnd.setHours(endHour, endMin, 0, 0)
      
      const shouldComplete = leaveEnd <= now
      console.log(`   Leave ${leave.id}: endDate=${leaveEnd.toISOString()}, now=${now.toISOString()}, shouldComplete=${shouldComplete}`)
      return shouldComplete
    })

    console.log(`\n📅 Found ${completingLeaves.length} leaves ready to complete`)

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
        console.log(`📝 Updating leave ${leave.id} status to COMPLETED`)
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
    console.error("Stack trace:", error instanceof Error ? error.stack : "N/A")
  }
}

// Export for use in API route or cron job
export default autoActivateMonthlyLeavePasses
