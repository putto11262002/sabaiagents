/**
 * Claude Code Headless Mode Client for Bun
 *
 * A comprehensive TypeScript library for interacting with Claude Code in headless mode.
 *
 * ## New Architecture
 *
 * This library uses a namespace-based design:
 * - **ClaudeCode**: Core functionality (use `createClaudeCode()`)
 * - **Agent**: Pre-configured templates (use `createAgent()`)
 * - **SessionStore**: SQLite-based session persistence (use `createSessionStore()`)
 *
 * @see https://code.claude.com/docs/en/headless - Official Documentation
 *
 * @example
 * ```typescript
 * import { createClaudeCode, createAgent, createSessionStore } from './claude';
 *
 * // Basic ClaudeCode instance
 * const claude = createClaudeCode();
 * const response = await claude.query('Hello, Claude!');
 *
 * // Agent with session storage
 * const store = createSessionStore('./sessions.db');
 * const agent = createAgent({
 *   name: 'code-reviewer',
 *   cwd: '/path/to/project',
 *   sessionStore: store,
 *   claudeConfig: {
 *     allowedTools: ['Read', 'Grep', 'Glob'],
 *   }
 * });
 *
 * const result = await agent.run('Review this code');
 * ```
 */

// Internal imports for convenience functions
import type { Claude } from './types.js';
import { createClaudeCode as _createClaudeCode } from './claude-code.js';

// ============= Core Exports =============

// ClaudeCode namespace and creation
export { createClaudeCode, type ClaudeCode } from './claude-code.js';

// Agent namespace and creation
export { createAgent, type Agent } from './agent.js';

// Session storage
export { SessionStore, createSessionStore } from './session-store.js';

// Built-in tools catalog
export { type ClaudeCode as BuiltInTools } from './built-in-tools.js';

// ============= Types =============

export type { Claude } from './types.js';

// ============= Errors =============

export {
  ClaudeError,
  ClaudeProcessError,
  ClaudeTimeoutError,
  ClaudeParseError,
  ClaudeAPIError,
  ClaudeSessionError,
  ClaudeConfigError,
} from './error.js';

// ============= Utilities =============

// Stream parser utilities
export {
  parseLine,
  parseStream,
  collectStream,
  filterMessages,
  getResult,
  getUserMessages,
  getAssistantMessages,
  getErrorMessages,
  extractText,
  extractThinking,
  extractToolUses,
  extractToolResults,
  createUserInput,
  createStreamInput,
  validateMessage,
} from './stream-parser.js';

// Process utilities (for advanced use)
export {
  buildArgs,
  executeCommand,
  executeStreaming,
  checkClaudeAvailable,
  getClaudeVersion,
} from './process.js';

// ============= Convenience Functions =============

/**
 * Quick query without creating an instance
 *
 * @example
 * ```typescript
 * import { query } from './claude';
 * const response = await query('What is 2 + 2?');
 * ```
 */
export async function query(prompt: string, options?: Claude.QueryOptions): Promise<Claude.Response> {
  const claude = _createClaudeCode();
  return claude.query(prompt, options);
}

/**
 * Quick streaming query without creating an instance
 *
 * @example
 * ```typescript
 * import { stream } from './claude';
 * for await (const message of stream('Explain recursion')) {
 *   console.log(message);
 * }
 * ```
 */
export async function* stream(prompt: string, options?: Claude.StreamOptions): AsyncIterableIterator<Claude.StreamMessage> {
  const claude = _createClaudeCode();
  for await (const message of claude.stream(prompt, options)) {
    yield message;
  }
}

// ============= Legacy Exports (Deprecated) =============
// These are kept for backward compatibility but will be removed in a future version

/**
 * @deprecated Use `createClaudeCode()` instead
 */
export { ClaudeClient } from './client.js';

/**
 * @deprecated Use `Agent` with `createAgent()` instead
 */
export { Session, SessionManager } from './session-manager.js';

/**
 * @deprecated Use `createClaudeCode()` instead
 */
export function createClient() {
  const { ClaudeClient } = require('./client.ts');
  return new ClaudeClient();
}
