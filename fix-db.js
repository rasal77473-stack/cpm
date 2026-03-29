import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: "postgresql://cpm_user:OQ0iug8OXf2JPILmyuVk2U99bamhii6T@dpg-d5age8ruibrs73brk60g-a.virginia-postgres.render.com/cpm?ssl=true",
    ssl: {
        rejectUnauthorized: false,
    },
});

async function addColumn() {
    try {
        const client = await pool.connect();
        try {
            await client.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS special_pass TEXT DEFAULT 'NO'`);
            console.log('✅ Column special_pass added successfully!');
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Error adding column:', error);
    } finally {
        await pool.end();
    }
}

addColumn();
