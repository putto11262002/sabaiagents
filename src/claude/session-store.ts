/**
 * Session storage using Bun's built-in SQLite database
 *
 * @see https://bun.sh/docs/api/sqlite
 */

import { Database } from 'bun:sqlite';
import type { Claude } from './types.ts';
import { ClaudeSessionError } from './error.ts';

/**
 * Session store using SQLite for persistence
 */
export class SessionStore {
  private db: Database;

  constructor(dbPath: string = ':memory:') {
    // Initialize SQLite database
    this.db = new Database(dbPath);

    // Create tables
    this.initTables();
  }

  /**
   * Initialize database tables
   */
  private initTables(): void {
    // Sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        last_active INTEGER NOT NULL,
        turns INTEGER NOT NULL DEFAULT 0,
        total_cost_usd REAL NOT NULL DEFAULT 0,
        metadata TEXT
      )
    `);

    // Conversation history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversation_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    // Stream messages table (for detailed message logging)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS stream_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        message_type TEXT NOT NULL,
        message_data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better query performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_conversation_session
      ON conversation_history(session_id);
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_stream_session
      ON stream_messages(session_id);
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_last_active
      ON sessions(last_active DESC);
    `);
  }

  /**
   * Create or update a session
   */
  upsertSession(sessionData: Claude.SessionMetadata): void {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, created_at, last_active, turns, total_cost_usd, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        last_active = excluded.last_active,
        turns = excluded.turns,
        total_cost_usd = excluded.total_cost_usd,
        metadata = excluded.metadata
    `);

    stmt.run(
      sessionData.id,
      sessionData.created_at,
      sessionData.last_active,
      sessionData.turns,
      sessionData.total_cost_usd,
      JSON.stringify(sessionData)
    );
  }

  /**
   * Get session metadata by ID
   */
  getSession(sessionId: string): Claude.SessionMetadata | null {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions WHERE id = ?
    `);

    const row = stmt.get(sessionId) as any;
    if (!row) return null;

    return {
      id: row.id,
      created_at: row.created_at,
      last_active: row.last_active,
      turns: row.turns,
      total_cost_usd: row.total_cost_usd,
    };
  }

  /**
   * Add a conversation turn to history
   */
  addConversationTurn(sessionId: string, turn: Claude.ConversationTurn): void {
    const stmt = this.db.prepare(`
      INSERT INTO conversation_history (session_id, role, content, timestamp)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      sessionId,
      turn.role,
      typeof turn.content === 'string' ? turn.content : JSON.stringify(turn.content),
      turn.timestamp
    );
  }

  /**
   * Get conversation history for a session
   */
  getConversationHistory(sessionId: string): Claude.ConversationTurn[] {
    const stmt = this.db.prepare(`
      SELECT role, content, timestamp
      FROM conversation_history
      WHERE session_id = ?
      ORDER BY timestamp ASC
    `);

    const rows = stmt.all(sessionId) as any[];

    return rows.map(row => ({
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
    }));
  }

  /**
   * Add a stream message to the database
   */
  addStreamMessage(sessionId: string, message: Claude.StreamMessage): void {
    const stmt = this.db.prepare(`
      INSERT INTO stream_messages (session_id, message_type, message_data, timestamp)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      sessionId,
      message.type,
      JSON.stringify(message),
      Date.now()
    );
  }

  /**
   * Get stream messages for a session
   */
  getStreamMessages(sessionId: string): Claude.StreamMessage[] {
    const stmt = this.db.prepare(`
      SELECT message_data
      FROM stream_messages
      WHERE session_id = ?
      ORDER BY timestamp ASC
    `);

    const rows = stmt.all(sessionId) as any[];

    return rows.map(row => JSON.parse(row.message_data));
  }

  /**
   * Delete a session and all its data
   */
  deleteSession(sessionId: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM sessions WHERE id = ?
    `);

    const result = stmt.run(sessionId);
    return result.changes > 0;
  }

  /**
   * List all session IDs
   */
  listSessions(): string[] {
    const stmt = this.db.prepare(`
      SELECT id FROM sessions ORDER BY last_active DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map(row => row.id);
  }

  /**
   * Get the most recently active session
   */
  getLastSession(): Claude.SessionMetadata | null {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions ORDER BY last_active DESC LIMIT 1
    `);

    const row = stmt.get() as any;
    if (!row) return null;

    return {
      id: row.id,
      created_at: row.created_at,
      last_active: row.last_active,
      turns: row.turns,
      total_cost_usd: row.total_cost_usd,
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
    const transaction = this.db.transaction(() => {
      // Insert session metadata
      this.upsertSession(data.metadata);

      // Insert conversation history
      for (const turn of data.history) {
        this.addConversationTurn(data.metadata.id, turn);
      }
    });

    transaction();
  }

  /**
   * Clear all sessions
   */
  clearAll(): void {
    this.db.exec('DELETE FROM sessions');
    this.db.exec('DELETE FROM conversation_history');
    this.db.exec('DELETE FROM stream_messages');
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
    const totalSessions = (this.db.prepare('SELECT COUNT(*) as count FROM sessions').get() as any).count;
    const totalMessages = (this.db.prepare('SELECT COUNT(*) as count FROM conversation_history').get() as any).count;
    const totalStreamMessages = (this.db.prepare('SELECT COUNT(*) as count FROM stream_messages').get() as any).count;

    // Get database file size (if not in-memory)
    let databaseSize = 0;
    try {
      if (this.db.filename !== ':memory:') {
        const file = Bun.file(this.db.filename);
        databaseSize = file.size;
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
    this.db.close();
  }

  /**
   * Run a database checkpoint (for WAL mode)
   */
  checkpoint(): void {
    this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  }

  /**
   * Optimize database (vacuum and analyze)
   */
  optimize(): void {
    this.db.exec('VACUUM');
    this.db.exec('ANALYZE');
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
