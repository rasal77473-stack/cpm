import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: "postgresql://cpm_user:OQ0iug8OXf2JPILmyuVk2U99bamhii6T@dpg-d5age8ruibrs73brk60g-a.virginia-postgres.render.com/cpm?ssl=true",
    ssl: {
        rejectUnauthorized: false,
    },
});

async function updateTable() {
    try {
        const client = await pool.connect();
        try {
            // Add submission_time column to special_pass_grants if it doesn't exist
            await client.query(`ALTER TABLE special_pass_grants ADD COLUMN IF NOT EXISTS submission_time TIMESTAMP`);
            console.log('✅ Column submission_time added successfully!');
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Error updating table:', error);
    } finally {
        await pool.end();
    }
}

updateTable();
