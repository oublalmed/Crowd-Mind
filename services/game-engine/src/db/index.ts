import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import config from '../config';

class Database {
  private static pool: Pool | null = null;

  /**
   * Get or create the shared PostgreSQL connection pool.
   */
  static getPool(): Pool {
    if (!Database.pool) {
      const poolConfig: PoolConfig = {
        host: config.postgres.host,
        port: config.postgres.port,
        database: config.postgres.database,
        user: config.postgres.user,
        password: config.postgres.password,
        max: config.postgres.maxConnections,
        idleTimeoutMillis: config.postgres.idleTimeoutMs,
        connectionTimeoutMillis: config.postgres.connectionTimeoutMs,
      };

      Database.pool = new Pool(poolConfig);

      Database.pool.on('connect', () => {
        console.log('[DB] New client connected to PostgreSQL');
      });

      Database.pool.on('error', (err: Error) => {
        console.error('[DB] Unexpected pool error:', err.message);
      });

      Database.pool.on('remove', () => {
        console.log('[DB] Client removed from pool');
      });
    }

    return Database.pool;
  }

  /**
   * Execute a parameterized SQL query.
   */
  static async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    const pool = Database.getPool();
    const start = Date.now();

    try {
      const result = await pool.query<T>(text, params);
      const duration = Date.now() - start;

      if (duration > 1000) {
        console.warn(`[DB] Slow query (${duration}ms):`, text.substring(0, 120));
      }

      return result;
    } catch (error) {
      console.error('[DB] Query error:', (error as Error).message);
      console.error('[DB] Failed query:', text.substring(0, 200));
      throw error;
    }
  }

  /**
   * Execute multiple queries inside a transaction.
   */
  static async transaction<T>(
    callback: (query: (text: string, params?: unknown[]) => Promise<QueryResult>) => Promise<T>
  ): Promise<T> {
    const pool = Database.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const boundQuery = (text: string, params?: unknown[]) => client.query(text, params);
      const result = await callback(boundQuery);

      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[DB] Transaction rolled back:', (error as Error).message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check database connectivity.
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const result = await Database.query('SELECT 1 AS ok');
      return result.rows.length > 0 && result.rows[0].ok === 1;
    } catch {
      return false;
    }
  }

  /**
   * Gracefully close the connection pool.
   */
  static async disconnect(): Promise<void> {
    if (Database.pool) {
      await Database.pool.end();
      Database.pool = null;
      console.log('[DB] PostgreSQL pool closed');
    }
  }
}

export default Database;
