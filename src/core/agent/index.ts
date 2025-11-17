/**
 * Agent namespace - Pre-configured ClaudeCode templates with automatic session management
 *
 * @see https://code.claude.com/docs/en/headless
 */

import type { Claude } from '../../claude/types.js';
import { ClaudeCode } from '../claude-code/index.js';
import { Session } from '../session/index.js';
import { executeCommand, executeStreaming, buildArgs } from '../../claude/process.js';
import { parseStream } from '../../claude/stream-parser.js';

// Export enhanced config and tool agent
export type { EnhancedConfig, ToolConfig } from './enhanced-config.js';
export { isEnhancedConfig, toClaudeConfig } from './enhanced-config.js';
export type { ToolAgentInstance, ToolAgentRunOptions } from './tool-agent.js';
export { createToolAgent } from './tool-agent.js';
export type { ToolResolver, ToolResolverOptions } from './tool-resolver.js';
export { createToolResolver } from './tool-resolver.js';

/**
 * Agent namespace containing all agent-related functionality
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
    sessionStore: Session.Store;
    /** Default session ID to use (optional) */
    defaultSessionId?: string;
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
   * Agent implementation
   */
  class InstanceImpl implements Instance {
    private config: Config;
    private claude: ClaudeCode.Instance;

    constructor(config: Config) {
      this.config = config;
      this.claude = ClaudeCode.create({
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

    getConfig(): Config {
      return { ...this.config };
    }

    async run(prompt: string, options: RunOptions = {}): Promise<Claude.Response> {
      const {
        sessionId,
        overrideOptions = {},
        saveToStore = true,
      } = options;

      const queryOptions: Claude.QueryOptions = {
        ...this.config.claudeConfig,
        ...overrideOptions,
        cwd: this.config.cwd,
      };

      if (sessionId) {
        const sessionOptions: Claude.SessionOptions = {
          ...queryOptions,
          sessionId,
        };

        const args = buildArgs(prompt, sessionOptions);
        const result = await executeCommand(args, {
          timeout: queryOptions.timeout,
          cwd: this.config.cwd,
        });

        const outputFormat = queryOptions.outputFormat || 'json';
        let response: Claude.Response;

        if (outputFormat === 'json') {
          const data = JSON.parse(result.stdout);
          response = {
            format: 'json',
            ...data,
            exitCode: result.exitCode,
          } as Claude.JsonResponse;

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
        const response = await this.claude.query(prompt, queryOptions);

        if (saveToStore && response.format === 'json') {
          this.saveToStore(response.session_id, prompt, response);
        }

        return response;
      }
    }

    async *runStream(prompt: string, options: RunOptions = {}): AsyncIterableIterator<Claude.StreamMessage> {
      const {
        sessionId,
        overrideOptions = {},
        saveToStore = true,
      } = options;

      const streamOptions: Claude.StreamOptions = {
        ...this.config.claudeConfig,
        ...overrideOptions,
        outputFormat: 'stream-json',
        cwd: this.config.cwd,
      };

      const finalOptions: any = sessionId
        ? { ...streamOptions, sessionId }
        : streamOptions;

      const args = buildArgs(prompt, finalOptions);
      const lines = executeStreaming(args, {
        timeout: streamOptions.timeout,
        cwd: this.config.cwd,
      });

      let currentSessionId = sessionId || '';
      let assistantContent = '';

      for await (const message of parseStream(lines)) {
        yield message;

        if (message.type === 'init') {
          const initMsg = message as Claude.InitMessage;
          if (initMsg.session_id) {
            currentSessionId = initMsg.session_id;
          }
        }

        if (saveToStore && currentSessionId) {
          this.config.sessionStore.addStreamMessage(currentSessionId, message);
        }

        if (message.type === 'assistant') {
          const assistantMsg = message as Claude.AssistantMessage;
          const textContent = assistantMsg.message.content
            .filter(block => block.type === 'text')
            .map(block => (block as Claude.TextContent).text)
            .join('');
          assistantContent += textContent;
        }

        if (message.type === 'result') {
          const result = message as Claude.ResultMessage;
          currentSessionId = result.session_id;

          if (saveToStore) {
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

    private saveToStore(sessionId: string, prompt: string, response: Claude.JsonResponse): void {
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
   * const store = Session.createStore('./sessions.db');
   *
   * const reviewer = Agent.create({
   *   name: 'code-reviewer',
   *   cwd: '/path/to/project',
   *   sessionStore: store,
   *   claudeConfig: {
   *     allowedTools: ClaudeCode.BuiltInTools.PRESETS.readonly,
   *   }
   * });
   *
   * const result = await reviewer.run('Review this code');
   * ```
   */
  export function create(config: Config): Instance {
    return new InstanceImpl(config);
  }
}
