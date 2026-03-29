
const fs = require('fs');
const path = require('path');

try {
    const envPath = path.resolve(__dirname, '.env');
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, ...values] = line.split('=');
        if (key && values.length) {
            process.env[key.trim()] = values.join('=').trim();
        }
    });
} catch (e) {
    console.warn("Could not read .env file, assuming env vars are set");
}

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function addColumn() {
    const client = await pool.connect();
    try {
        console.log('Adding special_pass column to users table...');
        await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS special_pass text DEFAULT 'NO';
    `);
        console.log('Successfully added special_pass column.');
    } catch (err) {
        console.error('Error adding column:', err);
    } finally {
        client.release();
        pool.end();
    }
}

addColumn();
