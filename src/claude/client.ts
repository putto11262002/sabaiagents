/**
 * Main ClaudeClient class for interacting with Claude Code headless mode
 */

import type { Claude } from './types.js';
import { ClaudeAPIError, ClaudeProcessError } from './error.js';
import { executeCommand, executeStreaming, buildArgs, checkClaudeAvailable, getClaudeVersion } from './process.js';
import { parseStream, collectStream } from './stream-parser.js';
import { Session, SessionManager } from './session-manager.js';

/**
 * Main client for Claude Code headless mode
 */
export class ClaudeClient {
  private sessionManager: SessionManager;

  constructor() {
    this.sessionManager = new SessionManager();
  }

  /**
   * Check if Claude CLI is available
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
   */
  async query(prompt: string, options: Claude.QueryOptions = {}): Promise<Claude.Response> {
    const outputFormat = options.outputFormat || 'text';

    // Build command arguments
    const args = buildArgs(prompt, { ...options, outputFormat });

    // Execute command
    const result = await executeCommand(args, {
      timeout: options.timeout,
      cwd: options.cwd,
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
   */
  async *stream(prompt: string, options: Claude.StreamOptions = { outputFormat: 'stream-json' }): AsyncIterableIterator<Claude.StreamMessage> {
    const mergedOptions: Claude.StreamOptions = {
      ...options,
      outputFormat: 'stream-json',
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
   */
  async processStdin(stdin: string, options: Claude.QueryOptions = {}): Promise<Claude.Response> {
    const outputFormat = options.outputFormat || 'text';

    // Build command arguments without prompt
    const args = buildArgs(null, { ...options, outputFormat });

    // Execute command with stdin
    const result = await executeCommand(args, {
      stdin,
      timeout: options.timeout,
      cwd: options.cwd,
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

  /**
   * Create a new session
   */
  createSession(initialPrompt?: string, options: Claude.SessionOptions = {}): Session {
    return this.sessionManager.create(options);
  }

  /**
   * Resume a session by ID
   */
  resumeSession(sessionId: string, options: Claude.SessionOptions = {}): Session {
    return this.sessionManager.resume(sessionId, options);
  }

  /**
   * Continue the last session
   */
  continueLastSession(options: Claude.SessionOptions = {}): Session {
    return this.sessionManager.continue(options);
  }

  /**
   * Get the session manager
   */
  getSessionManager(): SessionManager {
    return this.sessionManager;
  }
}

/**
 * Create a default client instance
 */
export function createClient(): ClaudeClient {
  return new ClaudeClient();
}
