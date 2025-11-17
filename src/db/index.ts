/**
 * Database connection and utilities
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';

/**
 * Create a Drizzle database instance
 */
export function createDb(dbPath: string = ':memory:') {
  const sqlite = new Database(dbPath);
  // Enable foreign keys
  sqlite.pragma('foreign_keys = ON');

  return drizzle(sqlite, { schema });
}

/**
 * Create a Drizzle database instance from an existing better-sqlite3 instance
 */
export function createDbFromClient(sqlite: Database.Database) {
  // Enable foreign keys
  sqlite.pragma('foreign_keys = ON');

  return drizzle(sqlite, { schema });
}

export * from './schema.js';
