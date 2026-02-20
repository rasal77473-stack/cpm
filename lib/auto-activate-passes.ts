/**
 * Auto-Activate Monthly Leave Passes
 * 
 * This script should run periodically (every minute or via cron)
 * to activate PENDING passes when their start time is reached
 * and complete them when the end time is reached
 */

import { db } from "@/db"
import { monthlyLeaves, specialPassGrants, leaveExclusions, students } from "@/db/schema"
import { eq, lte, gte, and, notInArray, inArray } from "drizzle-orm"

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
      // Parse the leave start date and time - use UTC to match database
      const leaveStart = new Date(leave.startDate)
      const [startHour, startMin] = leave.startTime.split(":").map(Number)
      leaveStart.setUTCHours(startHour, startMin, 0, 0)
      
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

      // Parse start and end times
      const [startHour, startMin] = leave.startTime.split(":").map(Number)
      const [endHour, endMin] = leave.endTime.split(":").map(Number)

      // Get date strings from database dates (treating as UTC)
      const startDateObj = new Date(leave.startDate)
      const startDateStr = startDateObj.toISOString().split('T')[0]
      
      const endDateObj = new Date(leave.endDate)
      const endDateStr = endDateObj.toISOString().split('T')[0]

      // Create proper UTC times
      // Issue pass 5 hours 30 minutes before start time
      const issueTime = new Date(`${startDateStr}T${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00Z`)
      issueTime.setHours(issueTime.getHours() - 5)
      issueTime.setMinutes(issueTime.getMinutes() - 30)
      const returnTime = new Date(`${endDateStr}T${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00Z`)

      const leaveReason = `Monthly Leave (${startDateStr} - ${endDateStr})`

      // Get all students with active passes to skip them
      const studentsWithActivePasses = await db
        .select({ studentId: specialPassGrants.studentId })
        .from(specialPassGrants)
        .where(inArray(specialPassGrants.status, ["ACTIVE", "OUT", "PENDING"]))
      
      const activePassStudentIds = new Set(studentsWithActivePasses.map((p) => p.studentId))
      
      // Filter students who don't already have active passes
      const studentsToGrantPasses = eligibleStudents.filter(
        (student) => !activePassStudentIds.has(student.id)
      )

      const skippedCount = eligibleStudents.length - studentsToGrantPasses.length
      if (skippedCount > 0) {
        console.log(`⏭️  Skipped ${skippedCount} students who already have active passes`)
      }

      // Create passes for eligible students (both phone and gate)
      const passRecords: any[] = []
      studentsToGrantPasses.forEach((student) => {
        // Phone pass - set to ACTIVE
        passRecords.push({
          studentId: student.id,
          mentorId: leave.createdBy,
          mentorName: leave.createdByName,
          purpose: `PHONE: ${leaveReason}`,
          issueTime: issueTime.toISOString(),
          returnTime: returnTime.toISOString(),
          status: "ACTIVE",
        })

        // Gate pass - set to ACTIVE
        passRecords.push({
          studentId: student.id,
          mentorId: leave.createdBy,
          mentorName: leave.createdByName,
          purpose: `GATE: ${leaveReason}`,
          issueTime: issueTime.toISOString(),
          returnTime: returnTime.toISOString(),
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
      // Parse the leave end date and time - use UTC to match database
      const leaveEnd = new Date(leave.endDate)
      const [endHour, endMin] = leave.endTime.split(":").map(Number)
      leaveEnd.setUTCHours(endHour, endMin, 0, 0)
      
      const shouldComplete = leaveEnd <= now
      console.log(`   Leave ${leave.id}: endDate=${leaveEnd.toISOString()}, now=${now.toISOString()}, shouldComplete=${shouldComplete}`)
      return shouldComplete
    })

    console.log(`\n📅 Found ${completingLeaves.length} leaves ready to complete`)

    // Complete passes for these leaves
    for (const leave of completingLeaves) {
      console.log(`\n⏱️  Completing leave ${leave.id}`)
      
      // Convert startDate to Date object (it comes as string from DB)
      const leaveStartDate = new Date(leave.startDate)
      const leaveStartTime = leaveStartDate.getTime()
      
      // Create date boundaries and convert to ISO strings
      const lowerBound = new Date(leaveStartTime - 60000).toISOString()
      const upperBound = new Date(leaveStartTime + 60000).toISOString()
      
      // Get the corresponding ACTIVE passes for this leave
      const activePasses = await db
        .select()
        .from(specialPassGrants)
        .where(
          and(
            eq(specialPassGrants.status, "ACTIVE"),
            gte(specialPassGrants.issueTime, lowerBound),
            lte(specialPassGrants.issueTime, upperBound)
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
              gte(specialPassGrants.issueTime, lowerBound),
              lte(specialPassGrants.issueTime, upperBound)
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
