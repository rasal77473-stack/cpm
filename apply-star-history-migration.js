const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: "postgresql://postgres.gnnfaijjvqikohblyjlz:rasal786%40%40%40@aws-1-eu-central-2.pooler.supabase.com:6543/postgres",
});

async function applyMigration() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Check if star_history table exists
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'star_history'
      );
    `);

    if (checkTable.rows[0].exists) {
      console.log('star_history table already exists. Skipping migration.');
      await client.end();
      return;
    }

    // Create the star_history table
    await client.query(`
      CREATE TABLE "star_history" (
        "id" serial PRIMARY KEY NOT NULL,
        "student_id" integer NOT NULL,
        "action" text NOT NULL,
        "stars" integer NOT NULL,
        "awarded_by" integer NOT NULL,
        "awarded_by_name" text NOT NULL,
        "reason" text,
        "current_stars" integer DEFAULT 0,
        "timestamp" timestamp DEFAULT now(),
        CONSTRAINT "star_history_student_id_students_id_fk" 
        FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") 
        ON DELETE no action ON UPDATE no action
      );
    `);
    console.log('✅ Created star_history table');

    // Create index on student_id for faster queries
    await client.query(`
      CREATE INDEX "star_history_student_id_idx" ON "star_history"("student_id");
    `);
    console.log('✅ Created index on student_id');

    // Create index on timestamp for sorting
    await client.query(`
      CREATE INDEX "star_history_timestamp_idx" ON "star_history"("timestamp");
    `);
    console.log('✅ Created index on timestamp');

    console.log('✅ Migration applied successfully!');
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
