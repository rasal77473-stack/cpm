import { db } from "../db"
import { specialPassGrants, students, phoneStatus } from "../db/schema"
import { eq, and, inArray } from "drizzle-orm"

async function run() {
    console.log("Checking for active phone passes on students with no registered phone...")

    // 1. Get all students with "no phone" using the correct property 'phoneName'
    const allStudents = await db.select().from(students)
    const nillStudents = allStudents.filter((s) => {
        // IMPORTANT: the student object has 'phoneName' not 'phone_name' from the JS side
        const p = s.phoneName?.toLowerCase() || ""
        return !p || p === "nill" || p === "nil" || p === "none"
    })

    console.log(`Found ${nillStudents.length} students with no phone.`)

    const nillStudentIds = nillStudents.map((s) => s.id)

    if (nillStudentIds.length === 0) {
        console.log("No nill students found.")
        return
    }

    // 2. Find passes that are ACTIVE, OUT, or PENDING for these users
    const invalidPasses = await db
        .select()
        .from(specialPassGrants)
        .where(
            and(
                inArray(specialPassGrants.studentId, nillStudentIds),
                inArray(specialPassGrants.status, ["ACTIVE", "OUT", "PENDING"])
            )
        )

    const phonePasses = invalidPasses.filter((p) => p.purpose?.startsWith("PHONE:"))

    console.log(`Found ${phonePasses.length} invalid active phone passes for actual nill students.`)

    if (phonePasses.length === 0) {
        console.log("All clean! No invalid passes found.")
        return
    }

    // 3. Complete these passes
    for (const pass of phonePasses) {
        console.log(`Fixing pass ID: ${pass.id} for Student ID: ${pass.studentId}`)
        await db
            .update(specialPassGrants)
            .set({
                status: "COMPLETED",
                submissionTime: new Date().toISOString(),
            })
            .where(eq(specialPassGrants.id, pass.id))

        // also set phoneStatus back to IN
        await db
            .update(phoneStatus)
            .set({
                status: "IN",
                lastUpdated: new Date().toISOString(),
                notes: "Terminated by admin script",
            })
            .where(eq(phoneStatus.studentId, pass.studentId))
    }

    console.log("Successfully fixed all invalid passes.");
}

run()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
