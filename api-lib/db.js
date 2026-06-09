import pg from 'pg';
import config from './config.js';
import { ensureSchema } from './schema.js';
import MockPool from './mockDb.js';

const { Pool } = pg;

let pool;
let schemaPromise;
let databaseState = {
  mode: 'database',
  error: null,
};

const parseConnectionUrl = (value) => {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return {
      protocol: url.protocol,
      host: url.hostname,
      port: Number(url.port || 5432),
      user: decodeURIComponent(url.username || ''),
      password: decodeURIComponent(url.password || ''),
      database: decodeURIComponent(url.pathname.replace(/^\//, '') || ''),
    };
  } catch {
    return null;
  }
};

const convertPlaceholders = (sql) => {
  let index = 0;
  return String(sql).replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
};

class PostgresPoolAdapter {
  constructor(connectionPool) {
    this.pool = connectionPool;
  }

  async query(sql, params = []) {
    const trimmed = String(sql).trim();
    const isSelectLike = /^(select|with)\b/i.test(trimmed);
    const result = await this.pool.query({
      text: convertPlaceholders(sql),
      values: params,
    });

    if (isSelectLike) {
      return [result.rows, result];
    }

    return [{ affectedRows: result.rowCount, rowCount: result.rowCount, insertId: null }, result];
  }

  async execute(sql, params = []) {
    const trimmed = String(sql).trim();
    const isSelectLike = /^(select|with)\b/i.test(trimmed);
    const isInsert = /^insert\b/i.test(trimmed);
    const hasReturning = /\breturning\b/i.test(trimmed);
    const text = isInsert && !hasReturning ? `${convertPlaceholders(sql)} RETURNING id` : convertPlaceholders(sql);

    const result = await this.pool.query({
      text,
      values: params,
    });

    if (isSelectLike) {
      return [result.rows, result];
    }

    if (isInsert) {
      return [
        {
          insertId: result.rows[0]?.id ?? null,
          affectedRows: result.rowCount,
          rowCount: result.rowCount,
        },
        result,
      ];
    }

    return [
      {
        affectedRows: result.rowCount,
        rowCount: result.rowCount,
        insertId: null,
      },
      result,
    ];
  }

  async end() {
    await this.pool.end();
  }
}

const resolveConnectionConfig = () => {
  const fromUrl =
    parseConnectionUrl(config.database.url) ||
    parseConnectionUrl(process.env.DATABASE_URL) ||
    parseConnectionUrl(process.env.POSTGRES_URL) ||
    parseConnectionUrl(process.env.POSTGRES_PRISMA_URL) ||
    parseConnectionUrl(process.env.POSTGRES_URL_NON_POOLING);

  return {
    connectionString: config.database.url || process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined,
    host: fromUrl?.host || config.database.host || '127.0.0.1',
    port: Number(fromUrl?.port || config.database.port || 5432),
    user: fromUrl?.user || config.database.user || 'postgres',
    password: fromUrl?.password || config.database.password || '',
    database: fromUrl?.database || config.database.name || 'postgres',
    max: Number(process.env.DB_CONNECTION_LIMIT || 10),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS || 15000),
    ssl: config.database.ssl
      ? {
          rejectUnauthorized: config.database.sslRejectUnauthorized,
        }
      : undefined,
  };
};

export const getPool = () => {
  if (!pool) {
    pool = new PostgresPoolAdapter(new Pool(resolveConnectionConfig()));
  }

  return pool;
};

export const getDatabaseState = () => ({ ...databaseState });

export const initializeDatabase = async () => {
  const currentPool = getPool();

  if (!schemaPromise) {
    schemaPromise = ensureSchema(currentPool, config)
      .then(() => {
        databaseState = { mode: 'database', error: null };
        return currentPool;
      })
      .catch((error) => {
        console.warn('Database connection failed, attempting demo mode as fallback:', error.message);
        pool = new MockPool();
        databaseState = { mode: 'demo', error: error.message };
        return pool;
      });
  }

  await schemaPromise;
  return pool;
};
