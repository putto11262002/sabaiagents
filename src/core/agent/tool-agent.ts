/**
 * Tool-enhanced agent
 *
 * Agent with full support for the unified tool system
 */

import type { Claude } from '../../claude/types.js';
import { ClaudeCode } from '../claude-code/index.js';
import { executeCommand, executeStreaming, buildArgs } from '../../claude/process.js';
import { parseStream } from '../../claude/stream-parser.js';
import type { EnhancedConfig } from './enhanced-config.js';
import { toClaudeConfig } from './enhanced-config.js';
import { createToolResolver, type ToolResolver } from './tool-resolver.js';

/**
 * Run options for tool agent
 */
export interface ToolAgentRunOptions {
  /** Session ID to continue (optional - creates new if not provided) */
  sessionId?: string;
  /** Override default options */
  overrideOptions?: Partial<Claude.QueryOptions>;
  /** Whether to save messages to session store (default: true) */
  saveToStore?: boolean;
  /** Override allowed tools for this run */
  tools?: string[];
}

/**
 * Tool agent instance interface
 */
export interface ToolAgentInstance {
  /** Get agent name */
  getName(): string;
  /** Get agent working directory */
  getCwd(): string;
  /** Get agent configuration */
  getConfig(): EnhancedConfig;
  /** Get tool resolver */
  getToolResolver(): ToolResolver | null;
  /** Run the agent with a prompt */
  run(prompt: string, options?: ToolAgentRunOptions): Promise<Claude.Response>;
  /** Run the agent with streaming */
  runStream(prompt: string, options?: ToolAgentRunOptions): AsyncIterableIterator<Claude.StreamMessage>;
}

/**
 * Tool agent implementation
 */
class ToolAgentImpl implements ToolAgentInstance {
  private config: EnhancedConfig;
  private claude: ClaudeCode.Instance;
  private toolResolver: ToolResolver | null = null;

  constructor(config: EnhancedConfig) {
    this.config = config;

    // Create tool resolver if tools are configured
    if (config.tools?.registry) {
      this.toolResolver = createToolResolver({
        registry: config.tools.registry,
        mcpManager: config.tools.mcpManager,
        cwd: config.cwd,
      });
    }

    // Convert config to Claude config
    const claudeConfig = toClaudeConfig(config);

    this.claude = ClaudeCode.create({
      defaultOptions: claudeConfig,
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

  getConfig(): EnhancedConfig {
    return { ...this.config };
  }

  getToolResolver(): ToolResolver | null {
    return this.toolResolver;
  }

  async run(prompt: string, options: ToolAgentRunOptions = {}): Promise<Claude.Response> {
    const {
      sessionId,
      overrideOptions = {},
      saveToStore = true,
      tools,
    } = options;

    // Build query options
    let queryOptions: Claude.QueryOptions = {
      ...toClaudeConfig(this.config),
      ...overrideOptions,
      cwd: this.config.cwd,
    };

    // If tools override is provided, resolve them
    if (tools && this.toolResolver) {
      const toolConfig = this.toolResolver.resolve(tools);
      queryOptions = { ...queryOptions, ...toolConfig };

      // Generate MCP config if needed
      const mcpTools = this.toolResolver.getMcpTools(tools);
      if (mcpTools.length > 0) {
        const mcpConfigPath = await this.toolResolver.generateMcpConfig(tools);
        queryOptions.mcpConfig = mcpConfigPath;
      }
    }

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

  async *runStream(prompt: string, options: ToolAgentRunOptions = {}): AsyncIterableIterator<Claude.StreamMessage> {
    const {
      sessionId,
      overrideOptions = {},
      saveToStore = true,
      tools,
    } = options;

    // Build stream options
    let streamOptions: Claude.StreamOptions = {
      ...toClaudeConfig(this.config),
      ...overrideOptions,
      outputFormat: 'stream-json',
      cwd: this.config.cwd,
    };

    // If tools override is provided, resolve them
    if (tools && this.toolResolver) {
      const toolConfig = this.toolResolver.resolve(tools);
      streamOptions = {
        ...streamOptions,
        ...toolConfig,
        outputFormat: 'stream-json', // Ensure outputFormat stays as stream-json
      };

      // Generate MCP config if needed
      const mcpTools = this.toolResolver.getMcpTools(tools);
      if (mcpTools.length > 0) {
        const mcpConfigPath = await this.toolResolver.generateMcpConfig(tools);
        streamOptions.mcpConfig = mcpConfigPath;
      }
    }

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
 * Create a tool-enhanced agent
 *
 * @param config - Enhanced agent configuration
 * @returns Tool agent instance
 *
 * @example
 * ```typescript
 * const agent = createToolAgent({
 *   name: 'code-assistant',
 *   cwd: '/project',
 *   sessionStore: store,
 *   tools: {
 *     registry,
 *     allowed: ['read', 'write', 'github-issues'],
 *   },
 * });
 *
 * const result = await agent.run('Read README and create issue');
 * ```
 */
export function createToolAgent(config: EnhancedConfig): ToolAgentInstance {
  return new ToolAgentImpl(config);
}
