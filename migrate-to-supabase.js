const { Pool } = require("pg");

async function verifySupabaseConnection() {
  const supabasePool = new Pool({
    connectionString:
      "postgresql://postgres.gnnfaijjvqikohblyjlz:rasal786%40%40%40@aws-1-eu-central-2.pooler.supabase.com:6543/postgres",
    ssl: {
      rejectUnauthorized: false,
    },
  });

  let supabaseClient;

  try {
    console.log("🔄 Connecting to Supabase...");
    supabaseClient = await supabasePool.connect();
    console.log("✅ Supabase connected successfully!\n");

    const result = await supabaseClient.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    console.log("📊 Tables in Supabase:");
    result.rows.forEach((row) => {
      console.log(`   - ${row.table_name}`);
    });

    console.log("\n✨ Supabase is ready to use!");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    if (supabaseClient) {
      supabaseClient.release();
    }
    supabasePool.end();
  }
}

verifySupabaseConnection();
