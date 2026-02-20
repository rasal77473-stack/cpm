import { db } from "../db";
import { specialPassGrants } from "../db/schema";
import { eq } from "drizzle-orm";

async function updatePhonePassesStatus() {
  try {
    console.log("Starting bulk update of ACTIVE phone passes to OUT status...");

    // Get all ACTIVE passes
    const activePasses = await db
      .select()
      .from(specialPassGrants)
      .where(eq(specialPassGrants.status, "ACTIVE"));

    console.log(`Found ${activePasses.length} ACTIVE passes`);

    // Filter for PHONE passes only
    const phonePassesToUpdate = activePasses.filter(
      (pass) =>
        pass.purpose && pass.purpose.toUpperCase().includes("PHONE")
    );

    console.log(
      `Found ${phonePassesToUpdate.length} PHONE passes to update`
    );

    if (phonePassesToUpdate.length === 0) {
      console.log("No PHONE passes found to update");
      process.exit(0);
    }

    // Update each pass to OUT status
    let updated = 0;
    for (const pass of phonePassesToUpdate) {
      await db
        .update(specialPassGrants)
        .set({ status: "OUT" })
        .where(eq(specialPassGrants.id, pass.id));
      updated++;
    }

    console.log(`✅ Successfully updated ${updated} PHONE passes to OUT status`);
    process.exit(0);
  } catch (error) {
    console.error("Error updating passes:", error);
    process.exit(1);
  }
}

updatePhonePassesStatus();
