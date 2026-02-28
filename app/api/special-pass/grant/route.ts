import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { userActivityLogs, specialPassGrants, students, phoneHistory, phoneStatus } from "@/db/schema"
import { eq, and, inArray } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, mentorId, mentorName, purpose, returnTime, submissionTime, staffId, expectedReturnDate, expectedReturnTime } = body

    // Validate required fields
    if (!studentId || mentorId === undefined || mentorId === null || !mentorName || !purpose) {
      return NextResponse.json(
        { error: "studentId, mentorId, mentorName, and purpose are required" },
        { status: 400 }
      )
    }

    const validMentorId = parseInt(mentorId)
    if (isNaN(validMentorId) || validMentorId <= 0) {
      return NextResponse.json(
        { error: "Invalid mentor ID. Please log in again." },
        { status: 400 }
      )
    }

    const sid = Number(studentId)

    // Run both validation queries IN PARALLEL instead of sequentially
    const [studentResult, existingPhonePasses] = await Promise.all([
      db.select().from(students).where(eq(students.id, sid)).limit(1),
      db.select().from(specialPassGrants).where(
        and(
          eq(specialPassGrants.studentId, sid),
          inArray(specialPassGrants.status, ["ACTIVE", "OUT", "PENDING"])
        )
      )
    ])

    const student = studentResult[0]
    if (!student) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 })
    }

    const hasNoPhone = !student.phoneName ||
      student.phoneName.toLowerCase() === "nill" ||
      student.phoneName.toLowerCase() === "nil" ||
      student.phoneName.toLowerCase() === "none"

    if (hasNoPhone) {
      return NextResponse.json(
        { error: "Cannot issue a phone pass to a student without a registered phone." },
        { status: 400 }
      )
    }

    const activePhonePasses = existingPhonePasses.filter((p: any) => p.purpose?.startsWith("PHONE:"))
    if (activePhonePasses.length > 0) {
      return NextResponse.json(
        { error: `Student already has an active PHONE pass (Status: ${activePhonePasses[0].status}). Only 1 phone pass allowed per student at a time.` },
        { status: 400 }
      )
    }

    // Create the pass - this is the critical operation
    const issueTime = new Date()

    const [newGrant] = await db
      .insert(specialPassGrants)
      .values({
        studentId: sid,
        mentorId: validMentorId,
        mentorName,
        purpose: `PHONE: ${purpose}`,
        issueTime: issueTime.toISOString(),
        returnTime: returnTime ? new Date(returnTime).toISOString() : null,
        submissionTime: submissionTime ? new Date(submissionTime).toISOString() : new Date().toISOString(),
        expectedReturnDate: expectedReturnDate || null,
        expectedReturnTime: expectedReturnTime || null,
      })
      .returning()

    // Return response IMMEDIATELY after insert
    const response = NextResponse.json(
      { success: true, message: "Special pass granted successfully", data: newGrant },
      { status: 201 }
    )

    // Fire-and-forget: all secondary operations in parallel background
    Promise.all([
      // Phone status upsert
      db.select().from(phoneStatus).where(eq(phoneStatus.studentId, sid)).limit(1)
        .then(([existing]: any[]) => {
          if (existing) {
            return db.update(phoneStatus).set({
              status: "ACTIVE",
              lastUpdated: new Date().toISOString(),
              updatedBy: mentorName,
              notes: `PHONE PASS ISSUED: ${purpose}`,
            }).where(eq(phoneStatus.studentId, sid))
          } else {
            return db.insert(phoneStatus).values({
              studentId: sid,
              status: "ACTIVE",
              updatedBy: mentorName,
              notes: `PHONE PASS ISSUED: ${purpose}`,
              lastUpdated: new Date().toISOString(),
            })
          }
        }),
      // Phone history
      db.insert(phoneHistory).values({
        studentId: sid,
        status: "ACTIVE",
        updatedBy: mentorName,
        notes: `PHONE PASS ISSUED: ${purpose}`,
      }),
      // Update student special_pass
      db.update(students).set({ specialPass: "YES" }).where(eq(students.id, sid)),
      // Activity log
      staffId && parseInt(staffId) > 0
        ? db.insert(userActivityLogs).values({
          userId: parseInt(staffId),
          action: "GRANT_SPECIAL_PASS",
          details: `Granted special pass to student ${studentId}. Purpose: ${purpose}`,
        })
        : Promise.resolve()
    ]).catch(() => { })

    return response
  } catch (error) {
    const errorDetails = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: "Failed to grant special pass", details: errorDetails },
      { status: 500 }
    )
  }
}
