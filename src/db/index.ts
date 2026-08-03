import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.ts';
import * as dotenv from "dotenv";

dotenv.config();

const host = process.env.DB_HOST || process.env.MYSQL_HOST || 'mysql-db01.remote';
const user = process.env.DB_USERNAME || process.env.MYSQL_USER || 'eradashb_';
const password = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '';
const database = process.env.DB_DATABASE || process.env.MYSQL_DB_NAME || 'eradashboard.com.et';
const port = parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || '31636', 10);

export let pool = mysql.createPool({
  host,
  user,
  password,
  database,
  port,
  connectionLimit: 10,
  connectTimeout: 2000,
});

let currentDb = drizzle(pool, { schema, mode: 'default' });

export const db = new Proxy({} as any, {
  get(target, prop) {
    const value = Reflect.get(currentDb, prop);
    if (typeof value === 'function') {
      return value.bind(currentDb);
    }
    return value;
  }
});

export async function withRetry<T = any>(queryFn: () => T | Promise<T> | any, retries = 2): Promise<T> {
  try {
    return await queryFn();
  } catch (error: any) {
    let errStr = '';
    try {
      errStr = String(error) + " " + JSON.stringify(error, Object.getOwnPropertyNames(error));
    } catch (e) {}
    
    const isConnError = errStr.includes('Connection') || 
                        errStr.includes('connection') || 
                        errStr.includes('timeout') ||
                        errStr.includes('ETIMEDOUT') ||
                        errStr.includes('ECONNREFUSED') ||
                        errStr.includes('ENOTFOUND') ||
                        errStr.includes('EHOSTUNREACH') ||
                        errStr.includes('PROTOCOL_CONNECTION_LOST');
    if (isConnError && retries > 0) {
      /* DB connection failed, retrying quietly... */
      await new Promise(resolve => setTimeout(resolve, 1000));
      return await withRetry(queryFn, retries - 1);
    }
    throw error;
  }
}
