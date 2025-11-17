/**
 * Main entry point - exports Claude Code client library
 *
 * ## Architecture
 *
 * This library uses TypeScript namespaces organized in core/:
 * - **ClaudeCode** namespace (core/claude-code) - Core functionality
 * - **Agent** namespace (core/agent) - Pre-configured templates
 * - **Session** namespace (core/session) - SQLite session storage
 *
 * @see https://code.claude.com/docs/en/headless
 */

// Export core namespaces
export { ClaudeCode } from './core/claude-code/index.ts';
export { Agent } from './core/agent/index.ts';
export { Session } from './core/session/index.ts';

// Export types
export type { Claude } from './claude/types.ts';

// Export errors
export {
  ClaudeError,
  ClaudeProcessError,
  ClaudeTimeoutError,
  ClaudeParseError,
  ClaudeAPIError,
  ClaudeSessionError,
  ClaudeConfigError,
} from './claude/error.ts';

// Export utilities
export {
  extractText,
  extractThinking,
  extractToolUses,
  extractToolResults,
} from './claude/stream-parser.ts';
