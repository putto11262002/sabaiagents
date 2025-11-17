/**
 * Session storage using Drizzle ORM with better-sqlite3
 *
 * @see https://orm.drizzle.team/docs/get-started-sqlite
 */

import Database from 'better-sqlite3';
import { eq, desc, sql } from 'drizzle-orm';
import { statSync } from 'node:fs';
import { createDbFromClient } from '../db/index.js';
import { sessions, conversationHistory, streamMessages } from '../db/schema.js';
import type { Claude } from './types.js';
import { ClaudeSessionError } from './error.js';

/**
 * Session store using Drizzle ORM for persistence
 */
export class SessionStore {
  private sqlite: Database.Database;
  private db: ReturnType<typeof createDbFromClient>;

  constructor(dbPath: string = ':memory:') {
    // Initialize SQLite database
    this.sqlite = new Database(dbPath);

    // Create Drizzle instance
    this.db = createDbFromClient(this.sqlite);

    // Create tables
    this.initTables();
  }

  /**
   * Initialize database tables using Drizzle Kit migrations or raw SQL
   */
  private initTables(): void {
    // Create tables using raw SQL for now (can be replaced with migrations)
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        last_active INTEGER NOT NULL,
        turns INTEGER NOT NULL DEFAULT 0,
        total_cost_usd REAL NOT NULL DEFAULT 0,
        metadata TEXT
      )
    `);

    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS conversation_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS stream_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        message_type TEXT NOT NULL,
        message_data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    this.sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_conversation_session
      ON conversation_history(session_id)
    `);

    this.sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_stream_session
      ON stream_messages(session_id)
    `);

    this.sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_last_active
      ON sessions(last_active DESC)
    `);
  }

  /**
   * Create or update a session
   */
  upsertSession(sessionData: Claude.SessionMetadata): void {
    this.db
      .insert(sessions)
      .values({
        id: sessionData.id,
        createdAt: new Date(sessionData.created_at),
        lastActive: new Date(sessionData.last_active),
        turns: sessionData.turns,
        totalCostUsd: sessionData.total_cost_usd,
        metadata: JSON.stringify(sessionData),
      })
      .onConflictDoUpdate({
        target: sessions.id,
        set: {
          lastActive: new Date(sessionData.last_active),
          turns: sessionData.turns,
          totalCostUsd: sessionData.total_cost_usd,
          metadata: JSON.stringify(sessionData),
        },
      })
      .run();
  }

  /**
   * Get session metadata by ID
   */
  getSession(sessionId: string): Claude.SessionMetadata | null {
    const result = this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!result) return null;

    return {
      id: result.id,
      created_at: result.createdAt.getTime(),
      last_active: result.lastActive.getTime(),
      turns: result.turns,
      total_cost_usd: result.totalCostUsd,
    };
  }

  /**
   * Add a conversation turn to history
   */
  addConversationTurn(sessionId: string, turn: Claude.ConversationTurn): void {
    this.db
      .insert(conversationHistory)
      .values({
        sessionId,
        role: turn.role,
        content: typeof turn.content === 'string' ? turn.content : JSON.stringify(turn.content),
        timestamp: new Date(turn.timestamp),
      })
      .run();
  }

  /**
   * Get conversation history for a session
   */
  getConversationHistory(sessionId: string): Claude.ConversationTurn[] {
    const results = this.db
      .select({
        role: conversationHistory.role,
        content: conversationHistory.content,
        timestamp: conversationHistory.timestamp,
      })
      .from(conversationHistory)
      .where(eq(conversationHistory.sessionId, sessionId))
      .orderBy(conversationHistory.timestamp)
      .all();

    return results.map((row) => ({
      role: row.role as 'user' | 'assistant',
      content: row.content,
      timestamp: row.timestamp.getTime(),
    }));
  }

  /**
   * Add a stream message to the database
   */
  addStreamMessage(sessionId: string, message: Claude.StreamMessage): void {
    this.db
      .insert(streamMessages)
      .values({
        sessionId,
        messageType: message.type,
        messageData: JSON.stringify(message),
        timestamp: new Date(),
      })
      .run();
  }

  /**
   * Get stream messages for a session
   */
  getStreamMessages(sessionId: string): Claude.StreamMessage[] {
    const results = this.db
      .select({
        messageData: streamMessages.messageData,
      })
      .from(streamMessages)
      .where(eq(streamMessages.sessionId, sessionId))
      .orderBy(streamMessages.timestamp)
      .all();

    return results.map((row) => JSON.parse(row.messageData));
  }

  /**
   * Delete a session and all its data
   */
  deleteSession(sessionId: string): boolean {
    const result = this.db
      .delete(sessions)
      .where(eq(sessions.id, sessionId))
      .run();

    return result.changes > 0;
  }

  /**
   * List all session IDs
   */
  listSessions(): string[] {
    const results = this.db
      .select({ id: sessions.id })
      .from(sessions)
      .orderBy(desc(sessions.lastActive))
      .all();

    return results.map((row) => row.id);
  }

  /**
   * Get the most recently active session
   */
  getLastSession(): Claude.SessionMetadata | null {
    const result = this.db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.lastActive))
      .limit(1)
      .get();

    if (!result) return null;

    return {
      id: result.id,
      created_at: result.createdAt.getTime(),
      last_active: result.lastActive.getTime(),
      turns: result.turns,
      total_cost_usd: result.totalCostUsd,
    };
  }

  /**
   * Get complete session data (metadata + history)
   */
  getSessionData(sessionId: string): Claude.SessionData | null {
    const metadata = this.getSession(sessionId);
    if (!metadata) return null;

    const history = this.getConversationHistory(sessionId);

    return {
      metadata,
      history,
    };
  }

  /**
   * Import complete session data
   */
  importSessionData(data: Claude.SessionData): void {
    // Use transaction for atomicity
    this.db.transaction((tx) => {
      // Insert session metadata
      this.upsertSession(data.metadata);

      // Insert conversation history
      for (const turn of data.history) {
        this.addConversationTurn(data.metadata.id, turn);
      }
    });
  }

  /**
   * Clear all sessions
   */
  clearAll(): void {
    this.db.delete(sessions).run();
    this.db.delete(conversationHistory).run();
    this.db.delete(streamMessages).run();
  }

  /**
   * Get database statistics
   */
  getStats(): {
    totalSessions: number;
    totalMessages: number;
    totalStreamMessages: number;
    databaseSize: number;
  } {
    const totalSessions =
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(sessions)
        .get()?.count ?? 0;

    const totalMessages =
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(conversationHistory)
        .get()?.count ?? 0;

    const totalStreamMessages =
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(streamMessages)
        .get()?.count ?? 0;

    // Get database file size (if not in-memory)
    let databaseSize = 0;
    try {
      if (this.sqlite.name !== ':memory:') {
        const stats = statSync(this.sqlite.name);
        databaseSize = stats.size;
      }
    } catch {
      // Ignore errors for in-memory databases
    }

    return {
      totalSessions,
      totalMessages,
      totalStreamMessages,
      databaseSize,
    };
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.sqlite.close();
  }

  /**
   * Run a database checkpoint (for WAL mode)
   */
  checkpoint(): void {
    this.sqlite.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  }

  /**
   * Optimize database (vacuum and analyze)
   */
  optimize(): void {
    this.sqlite.exec('VACUUM');
    this.sqlite.exec('ANALYZE');
  }
}

/**
 * Create a new session store
 *
 * @param dbPath - Path to SQLite database file (default: ':memory:' for in-memory)
 * @returns SessionStore instance
 *
 * @example
 * ```typescript
 * // In-memory store (for testing)
 * const store = createSessionStore();
 *
 * // Persistent store
 * const store = createSessionStore('./sessions.db');
 * ```
 */
export function createSessionStore(dbPath?: string): SessionStore {
  return new SessionStore(dbPath);
}
