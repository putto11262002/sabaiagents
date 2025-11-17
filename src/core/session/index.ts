/**
 * Session namespace - SQLite-based session storage for Claude Code
 *
 * @see https://bun.sh/docs/api/sqlite
 * @see https://code.claude.com/docs/en/headless#sessions
 */

import { Database } from 'bun:sqlite';
import type { Claude } from '../../claude/types.ts';
import { ClaudeSessionError } from '../../claude/error.ts';

/**
 * Session namespace containing all session-related functionality
 */
export namespace Session {
  /**
   * Session metadata interface
   */
  export interface Metadata {
    id: string;
    created_at: number;
    last_active: number;
    turns: number;
    total_cost_usd: number;
  }

  /**
   * Conversation turn interface
   */
  export interface Turn {
    role: 'user' | 'assistant';
    content: Claude.ContentBlock[] | string;
    timestamp: number;
  }

  /**
   * Complete session data
   */
  export interface Data {
    metadata: Metadata;
    history: Turn[];
  }

  /**
   * Store interface for session persistence
   */
  export interface Store {
    upsertSession(metadata: Metadata): void;
    getSession(sessionId: string): Metadata | null;
    addConversationTurn(sessionId: string, turn: Turn): void;
    getConversationHistory(sessionId: string): Turn[];
    addStreamMessage(sessionId: string, message: Claude.StreamMessage): void;
    getStreamMessages(sessionId: string): Claude.StreamMessage[];
    deleteSession(sessionId: string): boolean;
    listSessions(): string[];
    getLastSession(): Metadata | null;
    getSessionData(sessionId: string): Data | null;
    importSessionData(data: Data): void;
    clearAll(): void;
    getStats(): StoreStats;
    close(): void;
    checkpoint(): void;
    optimize(): void;
  }

  /**
   * Store statistics interface
   */
  export interface StoreStats {
    totalSessions: number;
    totalMessages: number;
    totalStreamMessages: number;
    databaseSize: number;
  }

  /**
   * SQLite-based session store implementation
   */
  class SQLiteStore implements Store {
    private db: Database;

    constructor(dbPath: string = ':memory:') {
      this.db = new Database(dbPath);
      this.initTables();
    }

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

      // Stream messages table
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

      // Create indexes
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

    upsertSession(metadata: Metadata): void {
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
        metadata.id,
        metadata.created_at,
        metadata.last_active,
        metadata.turns,
        metadata.total_cost_usd,
        JSON.stringify(metadata)
      );
    }

    getSession(sessionId: string): Metadata | null {
      const stmt = this.db.prepare(`SELECT * FROM sessions WHERE id = ?`);
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

    addConversationTurn(sessionId: string, turn: Turn): void {
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

    getConversationHistory(sessionId: string): Turn[] {
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

    deleteSession(sessionId: string): boolean {
      const stmt = this.db.prepare(`DELETE FROM sessions WHERE id = ?`);
      const result = stmt.run(sessionId);
      return result.changes > 0;
    }

    listSessions(): string[] {
      const stmt = this.db.prepare(`
        SELECT id FROM sessions ORDER BY last_active DESC
      `);
      const rows = stmt.all() as any[];
      return rows.map(row => row.id);
    }

    getLastSession(): Metadata | null {
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

    getSessionData(sessionId: string): Data | null {
      const metadata = this.getSession(sessionId);
      if (!metadata) return null;

      const history = this.getConversationHistory(sessionId);
      return { metadata, history };
    }

    importSessionData(data: Data): void {
      const transaction = this.db.transaction(() => {
        this.upsertSession(data.metadata);
        for (const turn of data.history) {
          this.addConversationTurn(data.metadata.id, turn);
        }
      });
      transaction();
    }

    clearAll(): void {
      this.db.exec('DELETE FROM sessions');
      this.db.exec('DELETE FROM conversation_history');
      this.db.exec('DELETE FROM stream_messages');
    }

    getStats(): StoreStats {
      const totalSessions = (this.db.prepare('SELECT COUNT(*) as count FROM sessions').get() as any).count;
      const totalMessages = (this.db.prepare('SELECT COUNT(*) as count FROM conversation_history').get() as any).count;
      const totalStreamMessages = (this.db.prepare('SELECT COUNT(*) as count FROM stream_messages').get() as any).count;

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

    close(): void {
      this.db.close();
    }

    checkpoint(): void {
      this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    }

    optimize(): void {
      this.db.exec('VACUUM');
      this.db.exec('ANALYZE');
    }
  }

  /**
   * Create a new session store
   *
   * @param dbPath - Path to SQLite database file (default: ':memory:')
   * @returns Session store instance
   *
   * @example
   * ```typescript
   * // In-memory store
   * const store = Session.createStore();
   *
   * // Persistent store
   * const store = Session.createStore('./sessions.db');
   * ```
   */
  export function createStore(dbPath?: string): Store {
    return new SQLiteStore(dbPath);
  }
}
