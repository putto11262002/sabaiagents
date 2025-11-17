/**
 * Claude Code Headless Mode Client for Bun
 *
 * A comprehensive TypeScript library for interacting with Claude Code in headless mode.
 *
 * @example
 * ```typescript
 * import { ClaudeClient } from './claude';
 *
 * const client = new ClaudeClient();
 *
 * // Simple query
 * const response = await client.query('Hello, Claude!');
 * console.log(response.text);
 *
 * // Streaming query
 * for await (const message of client.stream('Explain TypeScript generics')) {
 *   if (message.type === 'assistant') {
 *     console.log(message);
 *   }
 * }
 *
 * // Session-based conversation
 * const session = client.createSession();
 * await session.send('What is 2 + 2?');
 * await session.send('What about 3 + 3?');
 * ```
 */

// Export main client
export { ClaudeClient, createClient } from './client.ts';

// Export session management
export { Session, SessionManager } from './session-manager.ts';

// Export types
export type { Claude } from './types.ts';

// Export errors
export {
  ClaudeError,
  ClaudeProcessError,
  ClaudeTimeoutError,
  ClaudeParseError,
  ClaudeAPIError,
  ClaudeSessionError,
  ClaudeConfigError,
} from './error.ts';

// Export stream parser utilities
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
} from './stream-parser.ts';

// Export process utilities
export {
  buildArgs,
  executeCommand,
  executeStreaming,
  checkClaudeAvailable,
  getClaudeVersion,
} from './process.ts';

/**
 * Convenience function to create a client and execute a query
 */
export async function query(prompt: string, options?: Claude.QueryOptions): Promise<Claude.Response> {
  const client = createClient();
  return client.query(prompt, options);
}

/**
 * Convenience function to create a client and stream a query
 */
export async function* stream(prompt: string, options?: Claude.StreamOptions): AsyncIterableIterator<Claude.StreamMessage> {
  const client = createClient();
  for await (const message of client.stream(prompt, options)) {
    yield message;
  }
}
