import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';

/**
 * Database initialization module
 * Checks for existing schema and initializes if needed
 * Works in both Docker and cloud environments
 */

interface TableCheckResult {
  exists: boolean;
  table_name: string;
}

/**
 * Check if database schema exists by looking for core tables
 */
async function checkDatabaseSchema(pool: Pool): Promise<boolean> {
  try {
    const result = await pool.query<TableCheckResult>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
      ) as exists
    `);

    return result.rows[0]?.exists || false;
  } catch (error) {
    console.error('Error checking database schema:', error);
    return false;
  }
}

/**
 * Execute SQL file against the database
 */
async function executeSQLFile(pool: Pool, filePath: string): Promise<void> {
  try {
    const sql = await fs.readFile(filePath, 'utf-8');

    console.log(`Executing SQL from ${path.basename(filePath)}...`);

    // For complex SQL with functions, triggers, etc., it's safer to execute the entire file at once
    // PostgreSQL can handle multiple statements in a single query when separated by semicolons
    const client = await pool.connect();
    try {
      // Execute the entire SQL file as a single command
      // PostgreSQL will handle parsing and executing multiple statements
      await client.query(sql);
      console.log(`✅ Successfully executed ${path.basename(filePath)}`);
    } catch (error) {
      console.error(`Error details:`, error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`❌ Error executing ${filePath}:`, error);
    throw error;
  }
}

/**
 * Initialize database schema and seed data if needed
 */
export async function initializeDatabase(pool: Pool): Promise<void> {
  console.log('🔍 Checking database initialization status...');

  try {
    // Check if schema exists
    const schemaExists = await checkDatabaseSchema(pool);

    if (schemaExists) {
      console.log('✅ Database schema already exists, skipping initialization');
      return;
    }

    console.log('📦 Database schema not found, initializing...');

    // Get the scripts directory path
    // In production, scripts are deployed alongside the built server
    const scriptsDir = path.join(__dirname, '..', '..', '..', 'scripts');

    // Execute database setup
    const setupPath = path.join(scriptsDir, 'database-setup.sql');
    console.log('📝 Creating database schema...');
    await executeSQLFile(pool, setupPath);

    // Execute seed data (always for dev/demo)
    const seedPath = path.join(scriptsDir, 'seed-data.sql');
    console.log('🌱 Loading seed data...');
    await executeSQLFile(pool, seedPath);

    console.log('🎉 Database initialization completed successfully!');

    // Verify initialization worked
    const verified = await checkDatabaseSchema(pool);
    if (!verified) {
      throw new Error('Database initialization verification failed');
    }

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.log('⚠️  The application will continue but database operations may not work.');
    console.log('💡 For manual initialization, run:');
    console.log('   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f scripts/database-setup.sql');
    console.log('   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f scripts/seed-data.sql');
  }
}

/**
 * Simple check to see if we can connect to the database
 */
export async function canConnectToDatabase(pool: Pool): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    return false;
  }
}