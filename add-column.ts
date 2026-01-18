import { db } from './db/index.ts';
import { sql } from 'drizzle-orm';

async function addColumn() {
    try {
        await db.execute(sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS special_pass TEXT DEFAULT 'NO'`);
        console.log('✅ Column special_pass added successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding column:', error);
        process.exit(1);
    }
}

addColumn();
