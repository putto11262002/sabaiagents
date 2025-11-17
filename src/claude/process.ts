/**
 * Process management for Claude CLI
 */

import type { Claude } from './types.ts';
import { ClaudeProcessError, ClaudeTimeoutError } from './error.ts';

/**
 * Build command-line arguments from options
 */
export function buildArgs(
  prompt: string | null,
  options: Claude.QueryOptions | Claude.StreamOptions | Claude.SessionOptions = {}
): string[] {
  const args: string[] = [];

  // Always use print mode for non-interactive execution
  args.push('--print');

  // Output format
  if ('outputFormat' in options && options.outputFormat) {
    args.push(`--output-format=${options.outputFormat}`);
  }

  // Input format (for streaming)
  if ('inputFormat' in options && options.inputFormat) {
    args.push(`--input-format=${options.inputFormat}`);
  }

  // Session management
  if ('sessionId' in options && options.sessionId) {
    args.push('--resume', options.sessionId);
  } else if ('continue' in options && options.continue) {
    args.push('--continue');
  }

  // Tool configuration
  if (options.allowedTools && options.allowedTools.length > 0) {
    args.push(`--allowedTools=${options.allowedTools.join(',')}`);
  }
  if (options.disallowedTools && options.disallowedTools.length > 0) {
    args.push(`--disallowedTools=${options.disallowedTools.join(',')}`);
  }

  // MCP configuration
  if (options.mcpConfig) {
    args.push(`--mcp-config=${options.mcpConfig}`);
  }

  // Permission settings
  if (options.permissionPromptTool) {
    args.push(`--permission-prompt-tool=${options.permissionPromptTool}`);
  }
  if (options.permissionMode) {
    args.push(`--permission-mode=${options.permissionMode}`);
  }

  // System prompt
  if (options.appendSystemPrompt) {
    args.push(`--append-system-prompt=${options.appendSystemPrompt}`);
  }

  // Other flags
  if (options.verbose) {
    args.push('--verbose');
  }
  if (options.noInteractive) {
    args.push('--no-interactive');
  }

  // Add prompt if provided (not used when resuming sessions or using stdin)
  if (prompt !== null) {
    args.push(prompt);
  }

  return args;
}

/**
 * Execute Claude CLI and return the result
 */
export async function executeCommand(
  args: string[],
  options: {
    stdin?: string;
    timeout?: number;
    cwd?: string;
  } = {}
): Promise<Claude.ProcessResult> {
  const { stdin, timeout = 120000, cwd } = options;

  try {
    // Create the command
    const cmd = ['claude', ...args];

    // Execute with timeout
    const result = await Promise.race([
      executeWithBun(cmd, stdin, cwd),
      createTimeout(timeout),
    ]);

    return result;
  } catch (error) {
    if (error instanceof ClaudeTimeoutError) {
      throw error;
    }

    throw new ClaudeProcessError(
      `Failed to execute claude command: ${error instanceof Error ? error.message : String(error)}`,
      {
        code: 'EXECUTION_FAILED',
      }
    );
  }
}

/**
 * Execute command using Bun shell
 */
async function executeWithBun(
  cmd: string[],
  stdin?: string,
  cwd?: string
): Promise<Claude.ProcessResult> {
  try {
    // Build the shell command
    const shellCmd = cmd.map(arg => {
      // Escape arguments that contain spaces or special characters
      if (arg.includes(' ') || arg.includes('"') || arg.includes("'") || arg.includes('$')) {
        return `'${arg.replace(/'/g, "'\\''")}'`;
      }
      return arg;
    }).join(' ');

    // Execute using Bun.$
    const proc = Bun.spawn(cmd, {
      stdin: stdin ? 'pipe' : 'inherit',
      stdout: 'pipe',
      stderr: 'pipe',
      cwd: cwd,
    });

    // Write stdin if provided
    if (stdin && proc.stdin) {
      const writer = proc.stdin.getWriter();
      await writer.write(new TextEncoder().encode(stdin));
      await writer.close();
    }

    // Read stdout and stderr
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    // Wait for process to exit
    const exitCode = await proc.exited;

    return {
      stdout,
      stderr,
      exitCode,
    };
  } catch (error) {
    throw new ClaudeProcessError(
      `Process execution failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        code: 'SPAWN_FAILED',
      }
    );
  }
}

/**
 * Create a timeout promise
 */
function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new ClaudeTimeoutError(`Command timed out after ${ms}ms`, ms));
    }, ms);
  });
}

/**
 * Execute Claude CLI with streaming output
 */
export async function* executeStreaming(
  args: string[],
  options: {
    stdin?: string;
    timeout?: number;
    cwd?: string;
  } = {}
): AsyncIterableIterator<string> {
  const { stdin, timeout = 120000, cwd } = options;

  try {
    const cmd = ['claude', ...args];

    // Execute process
    const proc = Bun.spawn(cmd, {
      stdin: stdin ? 'pipe' : 'inherit',
      stdout: 'pipe',
      stderr: 'pipe',
      cwd: cwd,
    });

    // Write stdin if provided
    if (stdin && proc.stdin) {
      const writer = proc.stdin.getWriter();
      await writer.write(new TextEncoder().encode(stdin));
      await writer.close();
    }

    // Read stdout line by line
    const reader = proc.stdout.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await Promise.race([
          reader.read(),
          createTimeout(timeout).then(() => ({ done: true, value: undefined })),
        ]);

        if (done) {
          // Yield any remaining buffer
          if (buffer.length > 0) {
            yield buffer;
          }
          break;
        }

        if (value) {
          buffer += decoder.decode(value, { stream: true });

          // Split by newlines and yield complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

          for (const line of lines) {
            if (line.trim()) {
              yield line;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Wait for process to complete and check exit code
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new ClaudeProcessError(
        `Command failed with exit code ${exitCode}`,
        {
          exitCode,
          stderr,
        }
      );
    }
  } catch (error) {
    if (error instanceof ClaudeTimeoutError || error instanceof ClaudeProcessError) {
      throw error;
    }

    throw new ClaudeProcessError(
      `Streaming execution failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        code: 'STREAM_FAILED',
      }
    );
  }
}

/**
 * Check if the claude CLI is available
 */
export async function checkClaudeAvailable(): Promise<boolean> {
  try {
    const proc = Bun.spawn(['which', 'claude'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const exitCode = await proc.exited;
    return exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Get Claude CLI version
 */
export async function getClaudeVersion(): Promise<string | null> {
  try {
    const proc = Bun.spawn(['claude', '--version'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    if (exitCode === 0) {
      return stdout.trim();
    }

    return null;
  } catch {
    return null;
  }
}
