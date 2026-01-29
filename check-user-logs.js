import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: "postgresql://cpm_user:OQ0iug8OXf2JPILmyuVk2U99bamhii6T@dpg-d5age8ruibrs73brk60g-a.virginia-postgres.render.com/cpm?ssl=true",
    ssl: {
        rejectUnauthorized: false,
    },
});

async function checkUserLogs() {
    try {
        const client = await pool.connect();
        try {
            // Get all users
            const users = await client.query('SELECT id, name, username FROM users ORDER BY id');
            console.log('Users in database:', users.rows);

            // Get log count per user
            const logStats = await client.query(`
        SELECT user_id, COUNT(*) as log_count 
        FROM user_activity_logs 
        GROUP BY user_id 
        ORDER BY log_count DESC
      `);
            console.log('\nLog count per user ID:');
            logStats.rows.forEach(row => {
                console.log(`  User ID ${row.user_id}: ${row.log_count} logs`);
            });

            // Show sample logs for the first user
            if (users.rows.length > 0) {
                const firstUser = users.rows[0];
                const logs = await client.query(
                    'SELECT * FROM user_activity_logs WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 5',
                    [firstUser.id]
                );
                console.log(`\nSample logs for ${firstUser.name} (ID: ${firstUser.id}):`);
                console.log(logs.rows);
            }

        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

checkUserLogs();
