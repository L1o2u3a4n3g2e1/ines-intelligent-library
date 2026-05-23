import mysql from 'mysql2/promise';
import config from './config.js';
import { ensureSchema } from './schema.js';
import MockPool from './mockDb.js';

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
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username || ''),
      password: decodeURIComponent(url.password || ''),
      database: decodeURIComponent(url.pathname.replace(/^\//, '') || ''),
    };
  } catch {
    return null;
  }
};

const resolveConnectionConfig = () => {
  const fromUrl =
    parseConnectionUrl(config.database.url) ||
    parseConnectionUrl(process.env.DATABASE_URL) ||
    parseConnectionUrl(process.env.MYSQL_URL) ||
    parseConnectionUrl(process.env.MYSQL_PUBLIC_URL);

  return {
    host: fromUrl?.host || config.database.host || '127.0.0.1',
    port: Number(fromUrl?.port || config.database.port || 3306),
    user: fromUrl?.user || config.database.user || 'root',
    password: fromUrl?.password || config.database.password || '',
    database: fromUrl?.database || config.database.name || 'multilingual_library',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    charset: 'utf8mb4',
    ssl: config.database.ssl ? { rejectUnauthorized: config.database.sslRejectUnauthorized } : undefined,
  };
};

export const getPool = () => {
  if (!pool) {
    pool = mysql.createPool(resolveConnectionConfig());
  }

  return pool;
};

export const getDatabaseState = () => ({ ...databaseState });

export const initializeDatabase = async () => {
  if ((config.isProduction || process.env.VERCEL) && !config.database.configured) {
    pool = new MockPool();
    databaseState = {
      mode: 'demo',
      error: 'Database environment variables are not configured',
    };
    schemaPromise = Promise.resolve(pool);
    return pool;
  }

  const currentPool = getPool();

  if (!schemaPromise) {
    schemaPromise = ensureSchema(currentPool, config)
      .then(() => {
        databaseState = { mode: 'database', error: null };
        return currentPool;
      })
      .catch((error) => {
        console.warn('Database connection failed, using demo mode:', error.message);
        pool = new MockPool();
        databaseState = { mode: 'demo', error: error.message };
        return pool;
      });
  }

  await schemaPromise;
  return pool;
};
