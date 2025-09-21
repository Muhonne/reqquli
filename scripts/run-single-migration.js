const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://reqquli:reqquli_dev@localhost:5432/reqquli'
});

async function runMigration() {
  const filename = process.argv[2];
  if (!filename) {
    console.error('Usage: node run-single-migration.js <filename>');
    process.exit(1);
  }

  const sql = fs.readFileSync(path.join(__dirname, filename), 'utf8');
  try {
    await pool.query(sql);
    console.log(`✓ Migration ${filename} completed successfully`);
  } catch (error) {
    console.error(`✗ Migration ${filename} failed:`, error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
