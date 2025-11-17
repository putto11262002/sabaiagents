/**
 * Stream-JSON parser for Claude CLI output
 */

import type { Claude } from './types.js';
import { ClaudeParseError } from './error.js';

/**
 * Parse a single line of stream-JSON output
 */
export function parseLine(line: string): Claude.StreamMessage | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);

    // Validate that it has a type field
    if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
      throw new ClaudeParseError('Invalid message format: missing type field', trimmed);
    }

    return parsed as Claude.StreamMessage;
  } catch (error) {
    if (error instanceof ClaudeParseError) {
      throw error;
    }

    throw new ClaudeParseError(
      `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
      trimmed
    );
  }
}

/**
 * Parse stream-JSON output and yield messages
 */
export async function* parseStream(
  lines: AsyncIterableIterator<string>
): AsyncIterableIterator<Claude.StreamMessage> {
  for await (const line of lines) {
    const message = parseLine(line);
    if (message) {
      yield message;
    }
  }
}

/**
 * Collect all messages from a stream
 */
export async function collectStream(
  lines: AsyncIterableIterator<string>
): Promise<{ messages: Claude.StreamMessage[]; final: Claude.ResultMessage | null }> {
  const messages: Claude.StreamMessage[] = [];
  let final: Claude.ResultMessage | null = null;

  for await (const message of parseStream(lines)) {
    messages.push(message);

    // Check if this is the final result message
    if (message.type === 'result') {
      final = message as Claude.ResultMessage;
    }
  }

  return { messages, final };
}

/**
 * Filter messages by type
 */
export function filterMessages<T extends Claude.StreamMessage['type']>(
  messages: Claude.StreamMessage[],
  type: T
): Extract<Claude.StreamMessage, { type: T }>[] {
  return messages.filter((msg): msg is Extract<Claude.StreamMessage, { type: T }> => msg.type === type);
}

/**
 * Get the final result from a stream
 */
export function getResult(messages: Claude.StreamMessage[]): Claude.ResultMessage | null {
  const results = filterMessages(messages, 'result');
  const lastResult = results[results.length - 1];
  return lastResult !== undefined ? lastResult : null;
}

/**
 * Get all user messages from a stream
 */
export function getUserMessages(messages: Claude.StreamMessage[]): Claude.UserMessage[] {
  return filterMessages(messages, 'user');
}

/**
 * Get all assistant messages from a stream
 */
export function getAssistantMessages(messages: Claude.StreamMessage[]): Claude.AssistantMessage[] {
  return filterMessages(messages, 'assistant');
}

/**
 * Get all error messages from a stream
 */
export function getErrorMessages(messages: Claude.StreamMessage[]): Claude.ErrorMessage[] {
  return filterMessages(messages, 'error');
}

/**
 * Extract text content from content blocks
 */
export function extractText(content: Claude.ContentBlock[] | string): string {
  if (typeof content === 'string') {
    return content;
  }

  return content
    .filter((block): block is Claude.TextContent => block.type === 'text')
    .map(block => block.text)
    .join('\n');
}

/**
 * Extract thinking blocks from content
 */
export function extractThinking(content: Claude.ContentBlock[]): string[] {
  return content
    .filter((block): block is Claude.ThinkingContent => block.type === 'thinking')
    .map(block => block.thinking);
}

/**
 * Extract tool uses from content
 */
export function extractToolUses(content: Claude.ContentBlock[]): Claude.ToolUseContent[] {
  return content.filter((block): block is Claude.ToolUseContent => block.type === 'tool_use');
}

/**
 * Extract tool results from content
 */
export function extractToolResults(content: Claude.ContentBlock[]): Claude.ToolResultContent[] {
  return content.filter((block): block is Claude.ToolResultContent => block.type === 'tool_result');
}

/**
 * Create a stream-JSON input line for a user message
 */
export function createUserInput(content: string | Claude.ContentBlock[]): string {
  const message: Claude.UserMessage = {
    type: 'user',
    message: {
      role: 'user',
      content: typeof content === 'string' ? content : content,
    },
  };

  return JSON.stringify(message);
}

/**
 * Create multiple stream-JSON input lines
 */
export function createStreamInput(messages: Array<{ role: 'user' | 'assistant'; content: string | Claude.ContentBlock[] }>): string {
  return messages
    .map(msg => {
      if (msg.role === 'user') {
        return createUserInput(msg.content);
      }
      // Assistant messages are typically not sent as input, but we support it for completeness
      const message: Claude.AssistantMessage = {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: typeof msg.content === 'string' ? [{ type: 'text', text: msg.content }] : msg.content,
        },
      };
      return JSON.stringify(message);
    })
    .join('\n');
}

/**
 * Validate a stream message
 */
export function validateMessage(message: unknown): message is Claude.StreamMessage {
  if (!message || typeof message !== 'object') {
    return false;
  }

  const msg = message as Record<string, unknown>;

  // Check for type field
  if (!('type' in msg) || typeof msg.type !== 'string') {
    return false;
  }

  // Validate based on type
  switch (msg.type) {
    case 'init':
      return msg.subtype === 'start';

    case 'user':
    case 'assistant':
      return 'message' in msg && typeof msg.message === 'object';

    case 'result':
      return (
        'subtype' in msg &&
        'total_cost_usd' in msg &&
        'is_error' in msg &&
        'duration_ms' in msg &&
        'num_turns' in msg &&
        'result' in msg &&
        'session_id' in msg
      );

    case 'error':
      return 'error' in msg && typeof msg.error === 'string';

    default:
      return false;
  }
}
