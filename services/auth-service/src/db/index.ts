import { Pool, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';

const pool = new Pool({
  host: config.postgres.host,
  port: config.postgres.port,
  database: config.postgres.database,
  user: config.postgres.user,
  password: config.postgres.password,
  ssl: config.postgres.ssl ? { rejectUnauthorized: false } : false,
  max: config.postgres.maxConnections,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  console.log('PostgreSQL: client connected');
});

pool.on('error', (err: Error) => {
  console.error('PostgreSQL: unexpected error on idle client', err.message);
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;

  if (duration > 1000) {
    console.warn(`PostgreSQL: slow query (${duration}ms)`, { text, duration });
  }

  return result;
}

export async function getClient() {
  return pool.connect();
}

export default pool;
