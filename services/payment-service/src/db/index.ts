import { Pool } from 'pg';
import { config } from '../config';

const pool = new Pool({
  host: config.postgres.host,
  port: config.postgres.port,
  database: config.postgres.database,
  user: config.postgres.user,
  password: config.postgres.password,
  max: config.postgres.max,
  idleTimeoutMillis: config.postgres.idleTimeoutMillis,
  connectionTimeoutMillis: config.postgres.connectionTimeoutMillis,
});

pool.on('error', (err) => {
  console.error('[Payment DB] Unexpected error on idle client:', err);
});

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('[Payment DB] PostgreSQL connection verified');
    return true;
  } catch (err) {
    console.error('[Payment DB] Connection failed:', err);
    return false;
  }
}

export default pool;
