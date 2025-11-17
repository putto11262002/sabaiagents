/**
 * Agent namespace for creating pre-configured ClaudeCode agents
 *
 * Agents are templates with predefined configurations and working directories.
 * They automatically integrate with session storage and provide a higher-level
 * abstraction for common use cases.
 *
 * @see https://code.claude.com/docs/en/headless
 */

import type { Claude } from './types.ts';
import { createClaudeCode, type ClaudeCode } from './claude-code.ts';
import type { SessionStore } from './session-store.ts';
import { executeCommand, executeStreaming, buildArgs } from './process.ts';
import { parseStream } from './stream-parser.ts';

/**
 * Agent namespace
 */
export namespace Agent {
  /**
   * Agent configuration
   */
  export interface Config {
    /** Agent name (for logging/debugging) */
    name: string;

    /** Working directory for this agent */
    cwd: string;

    /** Claude Code configuration */
    claudeConfig?: Partial<Claude.QueryOptions>;

    /** Session store for persistence */
    sessionStore: SessionStore;

    /** Default session ID to use (optional) */
    defaultSessionId?: string;
  }

  /**
   * Agent instance interface
   */
  export interface Instance {
    /** Get agent name */
    getName(): string;

    /** Get agent working directory */
    getCwd(): string;

    /** Get agent configuration */
    getConfig(): Config;

    /** Run the agent with a prompt */
    run(prompt: string, options?: RunOptions): Promise<Claude.Response>;

    /** Run the agent with streaming */
    runStream(prompt: string, options?: RunOptions): AsyncIterableIterator<Claude.StreamMessage>;
  }

  /**
   * Run options for agents
   */
  export interface RunOptions {
    /** Session ID to continue (optional - creates new if not provided) */
    sessionId?: string;

    /** Override default options */
    overrideOptions?: Partial<Claude.QueryOptions>;

    /** Whether to save messages to session store (default: true) */
    saveToStore?: boolean;
  }
}

/**
 * Agent implementation
 */
class AgentInstance implements Agent.Instance {
  private config: Agent.Config;
  private claude: ClaudeCode.Instance;

  constructor(config: Agent.Config) {
    this.config = config;

    // Create ClaudeCode instance with agent configuration
    this.claude = createClaudeCode({
      defaultOptions: config.claudeConfig,
      sessionStore: config.sessionStore,
      cwd: config.cwd,
    });
  }

  getName(): string {
    return this.config.name;
  }

  getCwd(): string {
    return this.config.cwd;
  }

  getConfig(): Agent.Config {
    return { ...this.config };
  }

  /**
   * Run the agent with a prompt
   *
   * This method:
   * 1. Executes the query using the agent's configuration
   * 2. Automatically saves all messages to the session store
   * 3. Updates session metadata
   *
   * @param prompt - The prompt to run
   * @param options - Run options (session ID, overrides, etc.)
   * @returns Response from Claude
   *
   * @example
   * ```typescript
   * const agent = createAgent({
   *   name: 'code-reviewer',
   *   cwd: '/path/to/project',
   *   sessionStore: store,
   *   claudeConfig: {
   *     allowedTools: ['Read', 'Grep', 'Glob'],
   *     outputFormat: 'json',
   *   }
   * });
   *
   * // Run in new session
   * const response = await agent.run('Review this code for bugs');
   *
   * // Continue in same session
   * const response2 = await agent.run('Fix the issues', {
   *   sessionId: response.session_id
   * });
   * ```
   */
  async run(prompt: string, options: Agent.RunOptions = {}): Promise<Claude.Response> {
    const {
      sessionId,
      overrideOptions = {},
      saveToStore = true,
    } = options;

    // Merge configuration
    const queryOptions: Claude.QueryOptions = {
      ...this.config.claudeConfig,
      ...overrideOptions,
      cwd: this.config.cwd,
    };

    // If sessionId provided, use resume mode
    if (sessionId) {
      const sessionOptions: Claude.SessionOptions = {
        ...queryOptions,
        sessionId,
      };

      // Build and execute command
      const args = buildArgs(prompt, sessionOptions);
      const result = await executeCommand(args, {
        timeout: queryOptions.timeout,
        cwd: this.config.cwd,
      });

      // Parse response
      const outputFormat = queryOptions.outputFormat || 'json';
      let response: Claude.Response;

      if (outputFormat === 'json') {
        const data = JSON.parse(result.stdout);
        response = {
          format: 'json',
          ...data,
          exitCode: result.exitCode,
        } as Claude.JsonResponse;

        // Save to store
        if (saveToStore && response.format === 'json') {
          this.saveToStore(sessionId, prompt, response);
        }
      } else if (outputFormat === 'stream-json') {
        const lines = result.stdout.split('\n').filter(line => line.trim());
        const messages: Claude.StreamMessage[] = [];

        for (const line of lines) {
          try {
            const msg = JSON.parse(line);
            messages.push(msg);

            // Save each message to store
            if (saveToStore) {
              this.config.sessionStore.addStreamMessage(sessionId, msg);
            }
          } catch {
            // Skip invalid lines
          }
        }

        const finalResult = messages.find(m => m.type === 'result') as Claude.ResultMessage | undefined;

        response = {
          format: 'stream-json',
          messages,
          final: finalResult!,
          exitCode: result.exitCode,
        } as Claude.StreamJsonResponse;

        // Save conversation turn
        if (saveToStore && finalResult) {
          this.config.sessionStore.addConversationTurn(sessionId, {
            role: 'user',
            content: prompt,
            timestamp: Date.now(),
          });

          this.config.sessionStore.addConversationTurn(sessionId, {
            role: 'assistant',
            content: finalResult.result,
            timestamp: Date.now(),
          });
        }
      } else {
        response = {
          format: 'text',
          text: result.stdout,
          exitCode: result.exitCode,
        } as Claude.TextResponse;
      }

      return response;
    } else {
      // No session ID - execute as new query
      const response = await this.claude.query(prompt, queryOptions);

      // If JSON response, create session entry
      if (saveToStore && response.format === 'json') {
        this.saveToStore(response.session_id, prompt, response);
      }

      return response;
    }
  }

  /**
   * Run the agent with streaming output
   *
   * All messages are automatically saved to the session store as they arrive.
   *
   * @param prompt - The prompt to run
   * @param options - Run options
   * @returns Async iterator of stream messages
   *
   * @example
   * ```typescript
   * const agent = createAgent({
   *   name: 'assistant',
   *   cwd: '/path/to/project',
   *   sessionStore: store,
   * });
   *
   * for await (const message of agent.runStream('Explain this code')) {
   *   if (message.type === 'assistant') {
   *     console.log(message.message.content);
   *   }
   *
   *   // Final result contains session ID
   *   if (message.type === 'result') {
   *     console.log('Session:', message.session_id);
   *   }
   * }
   * ```
   */
  async *runStream(prompt: string, options: Agent.RunOptions = {}): AsyncIterableIterator<Claude.StreamMessage> {
    const {
      sessionId,
      overrideOptions = {},
      saveToStore = true,
    } = options;

    // Merge configuration
    const streamOptions: Claude.StreamOptions = {
      ...this.config.claudeConfig,
      ...overrideOptions,
      outputFormat: 'stream-json',
      cwd: this.config.cwd,
    };

    // Add session ID if provided
    const finalOptions: any = sessionId
      ? { ...streamOptions, sessionId }
      : streamOptions;

    // Build arguments
    const args = buildArgs(prompt, finalOptions);

    // Execute streaming
    const lines = executeStreaming(args, {
      timeout: streamOptions.timeout,
      cwd: this.config.cwd,
    });

    let currentSessionId = sessionId || '';
    let assistantContent = '';

    // Parse and yield messages
    for await (const message of parseStream(lines)) {
      yield message;

      // Track session ID
      if (message.type === 'init') {
        const initMsg = message as Claude.InitMessage;
        if (initMsg.session_id) {
          currentSessionId = initMsg.session_id;
        }
      }

      // Save message to store
      if (saveToStore && currentSessionId) {
        this.config.sessionStore.addStreamMessage(currentSessionId, message);
      }

      // Accumulate assistant content
      if (message.type === 'assistant') {
        const assistantMsg = message as Claude.AssistantMessage;
        const textContent = assistantMsg.message.content
          .filter(block => block.type === 'text')
          .map(block => (block as Claude.TextContent).text)
          .join('');
        assistantContent += textContent;
      }

      // Save final turn and update metadata
      if (message.type === 'result') {
        const result = message as Claude.ResultMessage;
        currentSessionId = result.session_id;

        if (saveToStore) {
          // Add conversation turns
          this.config.sessionStore.addConversationTurn(currentSessionId, {
            role: 'user',
            content: prompt,
            timestamp: Date.now(),
          });

          this.config.sessionStore.addConversationTurn(currentSessionId, {
            role: 'assistant',
            content: assistantContent || result.result,
            timestamp: Date.now(),
          });

          // Update session metadata
          this.config.sessionStore.upsertSession({
            id: currentSessionId,
            created_at: Date.now(),
            last_active: Date.now(),
            turns: result.num_turns,
            total_cost_usd: result.total_cost_usd,
          });
        }
      }
    }
  }

  /**
   * Save query and response to session store
   */
  private saveToStore(sessionId: string, prompt: string, response: Claude.JsonResponse): void {
    // Add conversation turns
    this.config.sessionStore.addConversationTurn(sessionId, {
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    });

    this.config.sessionStore.addConversationTurn(sessionId, {
      role: 'assistant',
      content: response.result,
      timestamp: Date.now(),
    });

    // Update session metadata
    this.config.sessionStore.upsertSession({
      id: sessionId,
      created_at: Date.now(),
      last_active: Date.now(),
      turns: response.num_turns,
      total_cost_usd: response.total_cost_usd,
    });
  }
}

/**
 * Create a new agent instance
 *
 * Agents are pre-configured ClaudeCode instances with:
 * - Specific working directory
 * - Predefined tool configuration
 * - Automatic session storage
 * - Simplified run() API
 *
 * @param config - Agent configuration
 * @returns Agent instance
 *
 * @see https://code.claude.com/docs/en/headless
 *
 * @example
 * ```typescript
 * import { createAgent, createSessionStore } from './claude';
 *
 * const store = createSessionStore('./sessions.db');
 *
 * // Create a code review agent
 * const reviewer = createAgent({
 *   name: 'code-reviewer',
 *   cwd: '/path/to/project',
 *   sessionStore: store,
 *   claudeConfig: {
 *     allowedTools: ['Read', 'Grep', 'Glob'],
 *     outputFormat: 'json',
 *   }
 * });
 *
 * // Run the agent
 * const result = await reviewer.run('Review this code for security issues');
 * console.log(result.result);
 *
 * // Continue in same session
 * const followUp = await reviewer.run('Fix the issues you found', {
 *   sessionId: result.session_id
 * });
 * ```
 */
export function createAgent(config: Agent.Config): Agent.Instance {
  return new AgentInstance(config);
}
