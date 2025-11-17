/**
 * Database schema for session storage
 * Using Drizzle ORM with SQLite
 */

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

/**
 * Sessions table - stores session metadata
 */
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    lastActive: integer('last_active', { mode: 'timestamp_ms' }).notNull(),
    turns: integer('turns').notNull().default(0),
    totalCostUsd: real('total_cost_usd').notNull().default(0),
    metadata: text('metadata'), // JSON stringified metadata
  },
  (table) => ({
    lastActiveIdx: index('idx_sessions_last_active').on(table.lastActive),
  })
);

/**
 * Conversation history table - stores conversation turns
 */
export const conversationHistory = sqliteTable(
  'conversation_history',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['user', 'assistant'] }).notNull(),
    content: text('content').notNull(), // Can be string or JSON stringified ContentBlock[]
    timestamp: integer('timestamp', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => ({
    sessionIdx: index('idx_conversation_session').on(table.sessionId),
  })
);

/**
 * Stream messages table - stores detailed stream message logging
 */
export const streamMessages = sqliteTable(
  'stream_messages',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    messageType: text('message_type').notNull(),
    messageData: text('message_data').notNull(), // JSON stringified message
    timestamp: integer('timestamp', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => ({
    sessionIdx: index('idx_stream_session').on(table.sessionId),
  })
);

// Export types inferred from schema
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type ConversationTurn = typeof conversationHistory.$inferSelect;
export type NewConversationTurn = typeof conversationHistory.$inferInsert;

export type StreamMessage = typeof streamMessages.$inferSelect;
export type NewStreamMessage = typeof streamMessages.$inferInsert;
