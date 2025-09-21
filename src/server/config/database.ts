import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database configuration
const dbConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'reqquli',
  password: process.env.DB_PASSWORD || 'reqquli_dev',
  database: process.env.DB_NAME || 'azure_quire',
  max: process.env.NODE_ENV === 'test' ? 5 : 20, // Fewer connections for tests
  idleTimeoutMillis: process.env.NODE_ENV === 'test' ? 5000 : 30000, // Shorter idle timeout for tests
  connectionTimeoutMillis: 2000, // How long to wait when connecting a new client
};

// Production configuration overrides
if (process.env.NODE_ENV === 'production') {
  // SSL configuration for production database
  if (process.env.DB_CA_CERT) {
    // Use provided CA certificate for proper SSL validation
    dbConfig.ssl = {
      rejectUnauthorized: true,
      ca: process.env.DB_CA_CERT
    };
  } else {
    // Require SSL but allow self-signed certificates only if explicitly configured
    dbConfig.ssl = {
      rejectUnauthorized: process.env.DB_ALLOW_SELF_SIGNED !== 'true'
    };
    if (process.env.DB_ALLOW_SELF_SIGNED === 'true') {
      console.warn('⚠️  WARNING: Database SSL certificate validation is disabled');
      console.warn('⚠️  This should only be used for Azure managed databases with internal certificates');
    }
  }
  dbConfig.max = 50; // Increase pool size for production
}

// Create the connection pool
export const pool = new Pool(dbConfig);

// Error handling for the pool
pool.on('error', (err) => {
  // Only log non-test environment errors, or test errors that aren't connection termination
  if (process.env.NODE_ENV !== 'test' || !err.message.includes('terminating connection due to administrator command')) {
    console.error('Unexpected error on idle database client', err);
  }
});

// Function to test database connection with retry logic
export async function testConnection(retries = 3, delay = 1000): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    let client;
    try {
      client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      console.log('✅ Database connected successfully at:', result.rows[0].now);
      return true;
    } catch (error) {
      console.error(`❌ Database connection attempt ${attempt}/${retries} failed:`, error);
      if (attempt < retries) {
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } finally {
      if (client) {
        client.release();
      }
    }
  }
  return false;
}

// Function to get the pool instance
export function getPool(): Pool {
  return pool;
}

// Function to close the pool
export async function closePool(): Promise<void> {
  try {
    await pool.end();
    if (process.env.NODE_ENV !== 'test') {
      console.log('Database pool closed');
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Error closing database pool:', error);
    }
  }
}