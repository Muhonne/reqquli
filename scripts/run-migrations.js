const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://reqquli:reqquli_dev@localhost:5432/reqquli",
});

async function runMigration(filename) {
  const sql = fs.readFileSync(path.join(__dirname, filename), "utf8");
  try {
    await pool.query(sql);
    console.log(`✓ Migration ${filename} completed successfully`);
  } catch (error) {
    console.error(`✗ Migration ${filename} failed:`, error.message);
    throw error;
  }
}

async function main() {
  try {
    await runMigration("003-add-test-case-tracking.sql");
    await runMigration("004-add-soft-delete-test-cases.sql");
    await runMigration("005-standardize-id-generation.sql");
    console.log("All migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
