import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: "postgresql://cpm_user:OQ0iug8OXf2JPILmyuVk2U99bamhii6T@dpg-d5age8ruibrs73brk60g-a.virginia-postgres.render.com/cpm?ssl=true",
    ssl: {
        rejectUnauthorized: false,
    },
});

async function checkLogs() {
    try {
        const client = await pool.connect();
        try {
            // Check if table exists
            const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'user_activity_logs'
        )
      `);
            console.log('Table exists:', tableCheck.rows[0].exists);

            // Check logs count
            const result = await client.query('SELECT COUNT(*) FROM user_activity_logs');
            console.log('Total logs:', result.rows[0].count);

            // Show sample logs
            const logs = await client.query('SELECT * FROM user_activity_logs ORDER BY timestamp DESC LIMIT 10');
            console.log('Sample logs:', logs.rows);

        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Error checking logs:', error);
    } finally {
        await pool.end();
    }
}

checkLogs();
