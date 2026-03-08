import { db } from "../db/index";
import { students, specialPassGrants, phoneStatus } from "../db/schema";
import { eq, ilike } from "drizzle-orm";
import * as fs from "fs";

async function run() {
    let output = "";
    output += "Fetching Rasil...\n";
    const sList = await db.select().from(students).where(ilike(students.name, '%rasil%'));
    for (const s of sList) {
        output += `\n--- Student: ${s.name} (ID: ${s.id}) ---\n`;
        const pList = await db.select().from(phoneStatus).where(eq(phoneStatus.studentId, s.id));
        output += `PhoneStatus Records (${pList.length}):\n`;
        output += JSON.stringify(pList, null, 2) + "\n";

        const gList = await db.select().from(specialPassGrants).where(eq(specialPassGrants.studentId, s.id));
        output += `Special Passes (${gList.length}):\n`;
        output += JSON.stringify(gList, null, 2) + "\n";
    }
    fs.writeFileSync("rasil.json", output);
    process.exit(0);
}
run();
