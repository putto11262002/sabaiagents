/**
 * ClaudeCode namespace - Core Claude Code headless mode functionality
 *
 * @see https://code.claude.com/docs/en/headless - Official Documentation
 * @see https://code.claude.com/docs/en/cli-reference - CLI Reference
 */

import type { Claude } from '../../claude/types.js';
import { ClaudeAPIError, ClaudeProcessError } from '../../claude/error.js';
import { executeCommand, executeStreaming, buildArgs, checkClaudeAvailable, getClaudeVersion } from '../../claude/process.js';
import { parseStream } from '../../claude/stream-parser.js';
import type { Session } from '../session/index.js';

/**
 * ClaudeCode namespace containing all core functionality
 */
export namespace ClaudeCode {
  /**
   * Configuration for ClaudeCode instance
   */
  export interface Config {
    /** Default options to apply to all queries */
    defaultOptions?: Partial<Claude.QueryOptions>;
    /** Session store for persistence (optional) */
    sessionStore?: Session.Store;
    /** Working directory */
    cwd?: string;
  }

  /**
   * ClaudeCode instance interface
   */
  export interface Instance {
    /** Check if Claude CLI is available */
    isAvailable(): Promise<boolean>;
    /** Get Claude CLI version */
    getVersion(): Promise<string | null>;
    /** Execute a single query */
    query(prompt: string, options?: Claude.QueryOptions): Promise<Claude.Response>;
    /** Stream a query with real-time responses */
    stream(prompt: string, options?: Claude.StreamOptions): AsyncIterableIterator<Claude.StreamMessage>;
    /** Process input from stdin */
    processStdin(stdin: string, options?: Claude.QueryOptions): Promise<Claude.Response>;
  }

  /**
   * Built-in tools available in Claude Code
   *
   * @see https://code.claude.com/docs/en/tools
   */
  export namespace BuiltInTools {
    export interface Definition {
      name: string;
      description: string;
      category: 'core' | 'file' | 'notebook' | 'web' | 'task' | 'agent';
      requiresPermission: boolean;
      docsUrl?: string;
    }

    export const TOOLS: Readonly<Record<string, Definition>> = {
      Task: {
        name: 'Task',
        description: 'Launch specialized agents for complex, multi-step tasks',
        category: 'agent',
        requiresPermission: false,
        docsUrl: 'https://code.claude.com/docs/en/tools',
      },
      Bash: {
        name: 'Bash',
        description: 'Execute bash commands in persistent shell session',
        category: 'core',
        requiresPermission: true,
        docsUrl: 'https://code.claude.com/docs/en/tools',
      },
      Glob: {
        name: 'Glob',
        description: 'Fast file pattern matching (e.g., "**/*.ts")',
        category: 'core',
        requiresPermission: false,
        docsUrl: 'https://code.claude.com/docs/en/tools',
      },
      Grep: {
        name: 'Grep',
        description: 'Powerful search built on ripgrep with regex support',
        category: 'core',
        requiresPermission: false,
        docsUrl: 'https://code.claude.com/docs/en/tools',
      },
      Read: {
        name: 'Read',
        description: 'Read files from filesystem (supports images, PDFs, notebooks)',
        category: 'file',
        requiresPermission: false,
        docsUrl: 'https://code.claude.com/docs/en/tools',
      },
      Edit: {
        name: 'Edit',
        description: 'Perform exact string replacements in files',
        category: 'file',
        requiresPermission: true,
        docsUrl: 'https://code.claude.com/docs/en/tools',
      },
      Write: {
        name: 'Write',
        description: 'Write files to filesystem (overwrites existing)',
        category: 'file',
        requiresPermission: true,
        docsUrl: 'https://code.claude.com/docs/en/tools',
      },
      NotebookEdit: {
        name: 'NotebookEdit',
        description: 'Edit Jupyter notebook cells',
        category: 'notebook',
        requiresPermission: true,
        docsUrl: 'https://code.claude.com/docs/en/tools',
      },
      WebFetch: {
        name: 'WebFetch',
        description: 'Fetch and process web content',
        category: 'web',
        requiresPermission: false,
        docsUrl: 'https://code.claude.com/docs/en/tools',
      },
      WebSearch: {
        name: 'WebSearch',
        description: 'Search the web with domain filtering',
        category: 'web',
        requiresPermission: false,
        docsUrl: 'https://code.claude.com/docs/en/tools',
      },
      TodoWrite: {
        name: 'TodoWrite',
        description: 'Create and manage task lists',
        category: 'task',
        requiresPermission: false,
        docsUrl: 'https://code.claude.com/docs/en/tools',
      },
      BashOutput: {
        name: 'BashOutput',
        description: 'Retrieve output from background bash shells',
        category: 'core',
        requiresPermission: false,
        docsUrl: 'https://code.claude.com/docs/en/tools',
      },
      KillShell: {
        name: 'KillShell',
        description: 'Kill running background bash shell',
        category: 'core',
        requiresPermission: true,
        docsUrl: 'https://code.claude.com/docs/en/tools',
      },
      Skill: {
        name: 'Skill',
        description: 'Execute specialized skills',
        category: 'agent',
        requiresPermission: false,
        docsUrl: 'https://code.claude.com/docs/en/skills',
      },
      SlashCommand: {
        name: 'SlashCommand',
        description: 'Execute custom slash commands',
        category: 'agent',
        requiresPermission: false,
        docsUrl: 'https://code.claude.com/docs/en/slash-commands',
      },
      ExitPlanMode: {
        name: 'ExitPlanMode',
        description: 'Exit plan mode after presenting plan',
        category: 'agent',
        requiresPermission: false,
        docsUrl: 'https://code.claude.com/docs/en/tools',
      },
    };

    /** Tool presets for common use cases */
    export const PRESETS = {
      readonly: ['Read', 'Glob', 'Grep', 'WebFetch', 'WebSearch'] as const,
      codeEditor: ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash'] as const,
      webResearch: ['WebSearch', 'WebFetch', 'Read', 'Grep'] as const,
      dataAnalysis: ['Read', 'Bash', 'NotebookEdit', 'Glob'] as const,
    };

    export function getAllNames(): readonly string[] {
      return Object.keys(TOOLS);
    }

    export function getByCategory(category: Definition['category']): readonly Definition[] {
      return Object.values(TOOLS).filter(tool => tool.category === category);
    }

    export function get(name: string): Definition | undefined {
      return TOOLS[name];
    }

    export function isValid(name: string): boolean {
      return name in TOOLS;
    }

    export function getSafeTools(): readonly string[] {
      return Object.values(TOOLS)
        .filter(tool => !tool.requiresPermission)
        .map(tool => tool.name);
    }
  }

  /**
   * ClaudeCode instance implementation
   */
  class InstanceImpl implements Instance {
    private config: Config;

    constructor(config: Config = {}) {
      this.config = config;
    }

    async isAvailable(): Promise<boolean> {
      return checkClaudeAvailable();
    }

    async getVersion(): Promise<string | null> {
      return getClaudeVersion();
    }

    async query(prompt: string, options: Claude.QueryOptions = {}): Promise<Claude.Response> {
      const mergedOptions = {
        ...this.config.defaultOptions,
        ...options,
        cwd: options.cwd || this.config.cwd,
      };

      const outputFormat = mergedOptions.outputFormat || 'text';
      const args = buildArgs(prompt, { ...mergedOptions, outputFormat });
      const result = await executeCommand(args, {
        timeout: mergedOptions.timeout,
        cwd: mergedOptions.cwd,
      });

      if (result.exitCode !== 0 && outputFormat !== 'json') {
        throw new ClaudeProcessError('Command failed', {
          exitCode: result.exitCode,
          stderr: result.stderr,
        });
      }

      if (outputFormat === 'json') {
        try {
          const data = JSON.parse(result.stdout);
          if (data.is_error) {
            throw new ClaudeAPIError(data.result, {
              code: 'API_ERROR',
              exitCode: result.exitCode,
              response: data,
            });
          }
          return {
            format: 'json',
            ...data,
            exitCode: result.exitCode,
          } as Claude.JsonResponse;
        } catch (error) {
          if (error instanceof ClaudeAPIError) throw error;
          throw new ClaudeProcessError(
            `Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`,
            { code: 'PARSE_ERROR', stderr: result.stderr }
          );
        }
      } else if (outputFormat === 'stream-json') {
        const lines = result.stdout.split('\n').filter(line => line.trim());
        const messages: Claude.StreamMessage[] = [];

        for (const line of lines) {
          try {
            messages.push(JSON.parse(line));
          } catch {
            // Skip invalid lines
          }
        }

        const finalResult = messages.find(m => m.type === 'result') as Claude.ResultMessage | undefined;
        if (!finalResult) {
          throw new ClaudeProcessError('No result message found in stream', { code: 'MISSING_RESULT' });
        }
        if (finalResult.is_error) {
          throw new ClaudeAPIError(finalResult.result, {
            code: 'API_ERROR',
            exitCode: result.exitCode,
            response: finalResult,
          });
        }

        return {
          format: 'stream-json',
          messages,
          final: finalResult,
          exitCode: result.exitCode,
        } as Claude.StreamJsonResponse;
      } else {
        return {
          format: 'text',
          text: result.stdout,
          exitCode: result.exitCode,
        } as Claude.TextResponse;
      }
    }

    async *stream(prompt: string, options: Claude.StreamOptions = { outputFormat: 'stream-json' }): AsyncIterableIterator<Claude.StreamMessage> {
      const mergedOptions = {
        ...this.config.defaultOptions,
        ...options,
        outputFormat: 'stream-json' as const,
        cwd: options.cwd || this.config.cwd,
      };

      const args = buildArgs(prompt, mergedOptions);
      const lines = executeStreaming(args, {
        timeout: mergedOptions.timeout,
        cwd: mergedOptions.cwd,
      });

      for await (const message of parseStream(lines)) {
        yield message;

        if (message.type === 'error') {
          const errorMsg = message as Claude.ErrorMessage;
          throw new ClaudeAPIError(errorMsg.error, {
            code: errorMsg.error_code,
            response: errorMsg,
          });
        }

        if (message.type === 'result') {
          const result = message as Claude.ResultMessage;
          if (result.is_error) {
            throw new ClaudeAPIError(result.result, {
              code: 'API_ERROR',
              response: result,
            });
          }
        }
      }
    }

    async processStdin(stdin: string, options: Claude.QueryOptions = {}): Promise<Claude.Response> {
      const mergedOptions = {
        ...this.config.defaultOptions,
        ...options,
        cwd: options.cwd || this.config.cwd,
      };

      const outputFormat = mergedOptions.outputFormat || 'text';
      const args = buildArgs(null, { ...mergedOptions, outputFormat });
      const result = await executeCommand(args, {
        stdin,
        timeout: mergedOptions.timeout,
        cwd: mergedOptions.cwd,
      });

      if (result.exitCode !== 0 && outputFormat !== 'json') {
        throw new ClaudeProcessError('Command failed', {
          exitCode: result.exitCode,
          stderr: result.stderr,
        });
      }

      // Same parsing logic as query()
      if (outputFormat === 'json') {
        try {
          const data = JSON.parse(result.stdout);
          if (data.is_error) {
            throw new ClaudeAPIError(data.result, {
              code: 'API_ERROR',
              exitCode: result.exitCode,
              response: data,
            });
          }
          return {
            format: 'json',
            ...data,
            exitCode: result.exitCode,
          } as Claude.JsonResponse;
        } catch (error) {
          if (error instanceof ClaudeAPIError) throw error;
          throw new ClaudeProcessError(
            `Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`,
            { code: 'PARSE_ERROR', stderr: result.stderr }
          );
        }
      } else if (outputFormat === 'stream-json') {
        const lines = result.stdout.split('\n').filter(line => line.trim());
        const messages: Claude.StreamMessage[] = [];

        for (const line of lines) {
          try {
            messages.push(JSON.parse(line));
          } catch {
            // Skip invalid lines
          }
        }

        const finalResult = messages.find(m => m.type === 'result') as Claude.ResultMessage | undefined;
        if (!finalResult) {
          throw new ClaudeProcessError('No result message found in stream', { code: 'MISSING_RESULT' });
        }
        if (finalResult.is_error) {
          throw new ClaudeAPIError(finalResult.result, {
            code: 'API_ERROR',
            exitCode: result.exitCode,
            response: finalResult,
          });
        }

        return {
          format: 'stream-json',
          messages,
          final: finalResult,
          exitCode: result.exitCode,
        } as Claude.StreamJsonResponse;
      } else {
        return {
          format: 'text',
          text: result.stdout,
          exitCode: result.exitCode,
        } as Claude.TextResponse;
      }
    }
  }

  /**
   * Create a new ClaudeCode instance
   *
   * @param config - Configuration options
   * @returns ClaudeCode instance
   *
   * @see https://code.claude.com/docs/en/headless
   *
   * @example
   * ```typescript
   * // Basic usage
   * const claude = ClaudeCode.create();
   *
   * // With configuration
   * const claude = ClaudeCode.create({
   *   defaultOptions: {
   *     allowedTools: ClaudeCode.BuiltInTools.PRESETS.readonly,
   *     outputFormat: 'json',
   *   }
   * });
   * ```
   */
  export function create(config?: Config): Instance {
    return new InstanceImpl(config);
  }
}
