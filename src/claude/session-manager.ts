/**
 * Session management for multi-turn conversations
 */

import type { Claude } from './types.js';
import { ClaudeSessionError } from './error.js';
import { executeCommand, executeStreaming, buildArgs } from './process.js';
import { parseStream, collectStream, createUserInput, createStreamInput } from './stream-parser.js';

/**
 * Session class for managing multi-turn conversations
 */
export class Session {
  private sessionId: string | null = null;
  private metadata: Claude.SessionMetadata | null = null;
  private history: Claude.ConversationTurn[] = [];
  private baseOptions: Claude.SessionOptions;

  constructor(options: Claude.SessionOptions = {}) {
    this.baseOptions = options;
    this.sessionId = options.sessionId || null;
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get session metadata
   */
  getMetadata(): Claude.SessionMetadata | null {
    return this.metadata;
  }

  /**
   * Get conversation history
   */
  getHistory(): Claude.ConversationTurn[] {
    return [...this.history];
  }

  /**
   * Send a message in this session and get a response
   */
  async send(
    prompt: string,
    options: Omit<Claude.QueryOptions, 'sessionId' | 'continue'> = {}
  ): Promise<Claude.Response> {
    const mergedOptions: Claude.SessionOptions = {
      ...this.baseOptions,
      ...options,
      sessionId: this.sessionId || undefined,
      continue: !this.sessionId && this.baseOptions.continue,
    };

    // Execute the command
    const args = buildArgs(prompt, mergedOptions);
    const result = await executeCommand(args, {
      timeout: options.timeout,
      cwd: options.cwd,
    });

    // Add to history
    this.history.push({
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    });

    // Parse response based on format
    const outputFormat = options.outputFormat || 'text';

    if (outputFormat === 'json') {
      const data = JSON.parse(result.stdout);
      this.sessionId = data.session_id;
      this.updateMetadata(data);

      this.history.push({
        role: 'assistant',
        content: data.result,
        timestamp: Date.now(),
      });

      return {
        format: 'json',
        ...data,
        exitCode: result.exitCode,
      } as Claude.JsonResponse;
    } else if (outputFormat === 'stream-json') {
      // For stream-json, we need to parse the messages
      const lines = result.stdout.split('\n').filter(line => line.trim());
      const messages: Claude.StreamMessage[] = [];

      for (const line of lines) {
        try {
          const msg = JSON.parse(line);
          messages.push(msg);
        } catch {
          // Skip invalid lines
        }
      }

      const finalResult = messages.find(m => m.type === 'result') as Claude.ResultMessage | undefined;
      if (finalResult) {
        this.sessionId = finalResult.session_id;
        this.updateMetadataFromResult(finalResult);

        this.history.push({
          role: 'assistant',
          content: finalResult.result,
          timestamp: Date.now(),
        });
      }

      return {
        format: 'stream-json',
        messages,
        final: finalResult!,
        exitCode: result.exitCode,
      } as Claude.StreamJsonResponse;
    } else {
      // Text format
      this.history.push({
        role: 'assistant',
        content: result.stdout,
        timestamp: Date.now(),
      });

      return {
        format: 'text',
        text: result.stdout,
        exitCode: result.exitCode,
      } as Claude.TextResponse;
    }
  }

  /**
   * Send a message and stream the response
   */
  async *stream(
    prompt: string,
    options: Omit<Claude.StreamOptions, 'sessionId' | 'continue' | 'outputFormat'> = {}
  ): AsyncIterableIterator<Claude.StreamMessage> {
    const mergedOptions: Claude.StreamOptions = {
      ...this.baseOptions,
      ...options,
      outputFormat: 'stream-json',
      sessionId: this.sessionId || undefined,
      continue: !this.sessionId && this.baseOptions.continue,
    };

    // Add to history
    this.history.push({
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    });

    // Execute streaming command
    const args = buildArgs(prompt, mergedOptions);
    const lines = executeStreaming(args, {
      timeout: options.timeout,
      cwd: options.cwd,
    });

    // Parse and yield messages
    let assistantContent = '';
    for await (const message of parseStream(lines)) {
      yield message;

      // Track session ID and metadata
      if (message.type === 'result') {
        const result = message as Claude.ResultMessage;
        this.sessionId = result.session_id;
        this.updateMetadataFromResult(result);
        assistantContent = result.result;
      } else if (message.type === 'assistant') {
        const assistantMsg = message as Claude.AssistantMessage;
        // Accumulate assistant content
        const textContent = assistantMsg.message.content
          .filter(block => block.type === 'text')
          .map(block => (block as Claude.TextContent).text)
          .join('');
        assistantContent += textContent;
      }
    }

    // Add final assistant message to history
    if (assistantContent) {
      this.history.push({
        role: 'assistant',
        content: assistantContent,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Send multiple messages using stream-JSON input
   */
  async *sendMultiple(
    messages: Array<{ role: 'user' | 'assistant'; content: string | Claude.ContentBlock[] }>,
    options: Omit<Claude.StreamOptions, 'sessionId' | 'continue' | 'outputFormat' | 'inputFormat'> = {}
  ): AsyncIterableIterator<Claude.StreamMessage> {
    const mergedOptions: Claude.StreamOptions = {
      ...this.baseOptions,
      ...options,
      outputFormat: 'stream-json',
      inputFormat: 'stream-json',
      sessionId: this.sessionId || undefined,
      continue: !this.sessionId && this.baseOptions.continue,
    };

    // Create stream-JSON input
    const stdin = createStreamInput(messages);

    // Add messages to history
    for (const msg of messages) {
      this.history.push({
        role: msg.role,
        content: msg.content,
        timestamp: Date.now(),
      });
    }

    // Execute streaming command
    const args = buildArgs(null, mergedOptions);
    const lines = executeStreaming(args, {
      stdin,
      timeout: options.timeout,
      cwd: options.cwd,
    });

    // Parse and yield messages
    return parseStream(lines);
  }

  /**
   * Clear the session and start fresh
   */
  clear(): void {
    this.sessionId = null;
    this.metadata = null;
    this.history = [];
  }

  /**
   * Export session data
   */
  export(): Claude.SessionData {
    if (!this.metadata) {
      throw new ClaudeSessionError('Cannot export session without metadata');
    }

    return {
      metadata: this.metadata,
      history: this.history,
    };
  }

  /**
   * Import session data
   */
  import(data: Claude.SessionData): void {
    this.metadata = data.metadata;
    this.sessionId = data.metadata.id;
    this.history = data.history;
  }

  /**
   * Update metadata from JSON response
   */
  private updateMetadata(data: Claude.JsonResponse): void {
    this.metadata = {
      id: data.session_id,
      created_at: this.metadata?.created_at || Date.now(),
      last_active: Date.now(),
      turns: data.num_turns,
      total_cost_usd: data.total_cost_usd,
    };
  }

  /**
   * Update metadata from result message
   */
  private updateMetadataFromResult(result: Claude.ResultMessage): void {
    this.metadata = {
      id: result.session_id,
      created_at: this.metadata?.created_at || Date.now(),
      last_active: Date.now(),
      turns: result.num_turns,
      total_cost_usd: result.total_cost_usd,
    };
  }
}

/**
 * Session manager for managing multiple sessions
 */
export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private lastSessionId: string | null = null;

  /**
   * Create a new session
   */
  create(options: Claude.SessionOptions = {}): Session {
    const session = new Session(options);
    return session;
  }

  /**
   * Resume a session by ID
   */
  resume(sessionId: string, options: Claude.SessionOptions = {}): Session {
    const session = new Session({
      ...options,
      sessionId,
    });

    this.sessions.set(sessionId, session);
    this.lastSessionId = sessionId;

    return session;
  }

  /**
   * Continue the last session
   */
  continue(options: Claude.SessionOptions = {}): Session {
    const session = new Session({
      ...options,
      continue: true,
    });

    return session;
  }

  /**
   * Get a session by ID
   */
  get(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get the last session
   */
  getLast(): Session | undefined {
    if (!this.lastSessionId) {
      return undefined;
    }
    return this.sessions.get(this.lastSessionId);
  }

  /**
   * Delete a session
   */
  delete(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (this.lastSessionId === sessionId) {
      this.lastSessionId = null;
    }
    return deleted;
  }

  /**
   * Clear all sessions
   */
  clear(): void {
    this.sessions.clear();
    this.lastSessionId = null;
  }

  /**
   * Get all session IDs
   */
  list(): string[] {
    return Array.from(this.sessions.keys());
  }
}
