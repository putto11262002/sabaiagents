/**
 * Session namespace - SQLite-based session storage for Claude Code using Drizzle ORM
 *
 * @see https://orm.drizzle.team/docs/get-started-sqlite
 * @see https://code.claude.com/docs/en/headless#sessions
 */

import Database from 'better-sqlite3';
import { eq, desc, sql } from 'drizzle-orm';
import { statSync } from 'node:fs';
import { createDbFromClient } from '../../db/index.js';
import { sessions, conversationHistory, streamMessages } from '../../db/schema.js';
import type { Claude } from '../../claude/types.js';
import { ClaudeSessionError } from '../../claude/error.js';

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
   * SQLite-based session store implementation using Drizzle ORM
   */
  class SQLiteStore implements Store {
    private sqlite: Database.Database;
    private db: ReturnType<typeof createDbFromClient>;

    constructor(dbPath: string = ':memory:') {
      this.sqlite = new Database(dbPath);
      this.db = createDbFromClient(this.sqlite);
      this.initTables();
    }

    private initTables(): void {
      // Create tables using raw SQL (can be replaced with migrations)
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

    upsertSession(metadata: Metadata): void {
      this.db
        .insert(sessions)
        .values({
          id: metadata.id,
          createdAt: new Date(metadata.created_at),
          lastActive: new Date(metadata.last_active),
          turns: metadata.turns,
          totalCostUsd: metadata.total_cost_usd,
          metadata: JSON.stringify(metadata),
        })
        .onConflictDoUpdate({
          target: sessions.id,
          set: {
            lastActive: new Date(metadata.last_active),
            turns: metadata.turns,
            totalCostUsd: metadata.total_cost_usd,
            metadata: JSON.stringify(metadata),
          },
        })
        .run();
    }

    getSession(sessionId: string): Metadata | null {
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

    addConversationTurn(sessionId: string, turn: Turn): void {
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

    getConversationHistory(sessionId: string): Turn[] {
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

    deleteSession(sessionId: string): boolean {
      const result = this.db
        .delete(sessions)
        .where(eq(sessions.id, sessionId))
        .run();

      return result.changes > 0;
    }

    listSessions(): string[] {
      const results = this.db
        .select({ id: sessions.id })
        .from(sessions)
        .orderBy(desc(sessions.lastActive))
        .all();

      return results.map((row) => row.id);
    }

    getLastSession(): Metadata | null {
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

    getSessionData(sessionId: string): Data | null {
      const metadata = this.getSession(sessionId);
      if (!metadata) return null;

      const history = this.getConversationHistory(sessionId);
      return { metadata, history };
    }

    importSessionData(data: Data): void {
      this.db.transaction((tx) => {
        this.upsertSession(data.metadata);
        for (const turn of data.history) {
          this.addConversationTurn(data.metadata.id, turn);
        }
      });
    }

    clearAll(): void {
      this.db.delete(sessions).run();
      this.db.delete(conversationHistory).run();
      this.db.delete(streamMessages).run();
    }

    getStats(): StoreStats {
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

    close(): void {
      this.sqlite.close();
    }

    checkpoint(): void {
      this.sqlite.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    }

    optimize(): void {
      this.sqlite.exec('VACUUM');
      this.sqlite.exec('ANALYZE');
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
