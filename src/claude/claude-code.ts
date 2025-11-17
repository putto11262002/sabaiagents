/**
 * ClaudeCode namespace and instance creation
 *
 * This module provides the core ClaudeCode functionality for interacting
 * with Claude Code in headless mode.
 *
 * @see https://code.claude.com/docs/en/headless - Official headless mode documentation
 * @see https://code.claude.com/docs/en/cli-reference - CLI reference
 */

import type { Claude } from './types.ts';
import { ClaudeAPIError, ClaudeProcessError } from './error.ts';
import { executeCommand, executeStreaming, buildArgs, checkClaudeAvailable, getClaudeVersion } from './process.ts';
import { parseStream } from './stream-parser.ts';
import type { SessionStore } from './session-store.ts';

/**
 * ClaudeCode namespace containing all core functionality
 */
export namespace ClaudeCode {
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
   * Configuration for ClaudeCode instance
   */
  export interface Config {
    /** Default options to apply to all queries */
    defaultOptions?: Partial<Claude.QueryOptions>;
    /** Session store for persistence (optional) */
    sessionStore?: SessionStore;
    /** Working directory */
    cwd?: string;
  }
}

/**
 * ClaudeCode instance implementation
 */
class ClaudeCodeInstance implements ClaudeCode.Instance {
  private config: ClaudeCode.Config;

  constructor(config: ClaudeCode.Config = {}) {
    this.config = config;
  }

  /**
   * Check if Claude CLI is available
   *
   * @see https://code.claude.com/docs/en/installation
   */
  async isAvailable(): Promise<boolean> {
    return checkClaudeAvailable();
  }

  /**
   * Get Claude CLI version
   */
  async getVersion(): Promise<string | null> {
    return getClaudeVersion();
  }

  /**
   * Execute a single query and get the response
   *
   * @param prompt - The prompt to send to Claude
   * @param options - Query options (output format, tools, etc.)
   * @returns Response in the requested format
   *
   * @see https://code.claude.com/docs/en/headless#output-formats
   *
   * @example
   * ```typescript
   * const claude = createClaudeCode();
   *
   * // Text output (default)
   * const response = await claude.query('What is 2 + 2?');
   * console.log(response.text);
   *
   * // JSON output with metadata
   * const jsonResponse = await claude.query('Explain TypeScript', {
   *   outputFormat: 'json'
   * });
   * console.log(jsonResponse.result, jsonResponse.total_cost_usd);
   * ```
   */
  async query(prompt: string, options: Claude.QueryOptions = {}): Promise<Claude.Response> {
    // Merge default options
    const mergedOptions = {
      ...this.config.defaultOptions,
      ...options,
      cwd: options.cwd || this.config.cwd,
    };

    const outputFormat = mergedOptions.outputFormat || 'text';

    // Build command arguments
    const args = buildArgs(prompt, { ...mergedOptions, outputFormat });

    // Execute command
    const result = await executeCommand(args, {
      timeout: mergedOptions.timeout,
      cwd: mergedOptions.cwd,
    });

    // Check for errors
    if (result.exitCode !== 0 && outputFormat !== 'json') {
      throw new ClaudeProcessError('Command failed', {
        exitCode: result.exitCode,
        stderr: result.stderr,
      });
    }

    // Parse response based on format
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
        if (error instanceof ClaudeAPIError) {
          throw error;
        }

        throw new ClaudeProcessError(
          `Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`,
          {
            code: 'PARSE_ERROR',
            stderr: result.stderr,
          }
        );
      }
    } else if (outputFormat === 'stream-json') {
      // Parse stream-JSON output
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

      if (!finalResult) {
        throw new ClaudeProcessError('No result message found in stream', {
          code: 'MISSING_RESULT',
        });
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
      // Text format
      return {
        format: 'text',
        text: result.stdout,
        exitCode: result.exitCode,
      } as Claude.TextResponse;
    }
  }

  /**
   * Execute a query and stream the response
   *
   * @param prompt - The prompt to send to Claude
   * @param options - Stream options
   * @returns Async iterator of stream messages
   *
   * @see https://code.claude.com/docs/en/headless#streaming-json-output
   *
   * @example
   * ```typescript
   * const claude = createClaudeCode();
   *
   * for await (const message of claude.stream('Explain recursion')) {
   *   if (message.type === 'assistant') {
   *     console.log(message.message.content);
   *   }
   * }
   * ```
   */
  async *stream(prompt: string, options: Claude.StreamOptions = { outputFormat: 'stream-json' }): AsyncIterableIterator<Claude.StreamMessage> {
    // Merge default options
    const mergedOptions = {
      ...this.config.defaultOptions,
      ...options,
      outputFormat: 'stream-json' as const,
      cwd: options.cwd || this.config.cwd,
    };

    // Build command arguments
    const args = buildArgs(prompt, mergedOptions);

    // Execute streaming command
    const lines = executeStreaming(args, {
      timeout: mergedOptions.timeout,
      cwd: mergedOptions.cwd,
    });

    // Parse and yield messages
    for await (const message of parseStream(lines)) {
      yield message;

      // Check for errors
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

  /**
   * Process input from stdin
   *
   * @param stdin - Input string to process
   * @param options - Query options
   * @returns Response in the requested format
   *
   * @example
   * ```typescript
   * const claude = createClaudeCode();
   * const input = 'What is this code doing?\\n\\nfunction add(a, b) { return a + b; }';
   * const response = await claude.processStdin(input);
   * ```
   */
  async processStdin(stdin: string, options: Claude.QueryOptions = {}): Promise<Claude.Response> {
    // Merge default options
    const mergedOptions = {
      ...this.config.defaultOptions,
      ...options,
      cwd: options.cwd || this.config.cwd,
    };

    const outputFormat = mergedOptions.outputFormat || 'text';

    // Build command arguments without prompt
    const args = buildArgs(null, { ...mergedOptions, outputFormat });

    // Execute command with stdin
    const result = await executeCommand(args, {
      stdin,
      timeout: mergedOptions.timeout,
      cwd: mergedOptions.cwd,
    });

    // Check for errors
    if (result.exitCode !== 0 && outputFormat !== 'json') {
      throw new ClaudeProcessError('Command failed', {
        exitCode: result.exitCode,
        stderr: result.stderr,
      });
    }

    // Parse response (same as query method)
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
        if (error instanceof ClaudeAPIError) {
          throw error;
        }

        throw new ClaudeProcessError(
          `Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`,
          {
            code: 'PARSE_ERROR',
            stderr: result.stderr,
          }
        );
      }
    } else if (outputFormat === 'stream-json') {
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

      if (!finalResult) {
        throw new ClaudeProcessError('No result message found in stream', {
          code: 'MISSING_RESULT',
        });
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
 * const claude = createClaudeCode();
 *
 * // With default options
 * const claude = createClaudeCode({
 *   defaultOptions: {
 *     allowedTools: ['Read', 'Grep', 'Bash'],
 *     outputFormat: 'json',
 *   }
 * });
 *
 * // With session storage
 * const store = createSessionStore('./sessions.db');
 * const claude = createClaudeCode({
 *   sessionStore: store,
 *   cwd: '/path/to/project'
 * });
 * ```
 */
export function createClaudeCode(config?: ClaudeCode.Config): ClaudeCode.Instance {
  return new ClaudeCodeInstance(config);
}
