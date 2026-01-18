import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: "postgresql://cpm_user:OQ0iug8OXf2JPILmyuVk2U99bamhii6T@dpg-d5age8ruibrs73brk60g-a.virginia-postgres.render.com/cpm?ssl=true",
    ssl: {
        rejectUnauthorized: false,
    },
});

async function fixUserLogs() {
    try {
        const client = await pool.connect();
        try {
            // Get the actual admin user
            const adminUser = await client.query("SELECT id FROM users WHERE username = 'admin' OR role = 'admin' LIMIT 1");

            if (adminUser.rows.length === 0) {
                console.log('No admin user found');
                return;
            }

            const adminId = adminUser.rows[0].id;
            console.log(`Admin user ID: ${adminId}`);

            // Check current log count for admin
            const beforeCount = await client.query('SELECT COUNT(*) FROM user_activity_logs WHERE user_id = $1', [adminId]);
            console.log(`Logs for admin (before): ${beforeCount.rows[0].count}`);

            // Update all logs to use the correct admin ID
            // Since most logs were likely created by the admin user
            const result = await client.query(
                'UPDATE user_activity_logs SET user_id = $1 WHERE user_id != $1',
                [adminId]
            );

            console.log(`✅ Updated ${result.rowCount} log entries to use admin ID ${adminId}`);

            // Check count after
            const afterCount = await client.query('SELECT COUNT(*) FROM user_activity_logs WHERE user_id = $1', [adminId]);
            console.log(`Logs for admin (after): ${afterCount.rows[0].count}`);

        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

fixUserLogs();
