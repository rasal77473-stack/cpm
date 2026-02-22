const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: "postgresql://postgres.gnnfaijjvqikohblyjlz:rasal786%40%40%40@aws-1-eu-central-2.pooler.supabase.com:6543/postgres",
});

async function applyMigration() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Check if student_stars table exists
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'student_stars'
      );
    `);

    if (checkTable.rows[0].exists) {
      console.log('student_stars table already exists. Skipping migration.');
      return;
    }

    // Create the student_stars table
    await client.query(`
      CREATE TABLE "student_stars" (
        "id" serial PRIMARY KEY NOT NULL,
        "student_id" integer NOT NULL,
        "stars" integer DEFAULT 0,
        "awarded_by" integer NOT NULL,
        "awarded_by_name" text NOT NULL,
        "reason" text,
        "awarded_at" timestamp DEFAULT now(),
        CONSTRAINT "student_stars_student_id_unique" UNIQUE("student_id")
      );
    `);
    console.log('Created student_stars table');

    // Add foreign key
    await client.query(`
      ALTER TABLE "student_stars" 
      ADD CONSTRAINT "student_stars_student_id_students_id_fk" 
      FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") 
      ON DELETE no action ON UPDATE no action;
    `);
    console.log('Added foreign key constraint');

    console.log('Migration applied successfully!');
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
