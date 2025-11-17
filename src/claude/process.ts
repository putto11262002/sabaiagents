/**
 * Process management for Claude CLI
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { Claude } from './types.js';
import { ClaudeProcessError, ClaudeTimeoutError } from './error.js';

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
      executeWithNode(cmd, stdin, cwd),
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
 * Execute command using Node.js child_process
 */
async function executeWithNode(
  cmd: string[],
  stdin?: string,
  cwd?: string
): Promise<Claude.ProcessResult> {
  return new Promise((resolve, reject) => {
    const [command = '', ...args] = cmd;
    if (!command) {
      reject(new ClaudeProcessError('No command specified', { code: 'NO_COMMAND' }));
      return;
    }
    const proc: ChildProcessWithoutNullStreams = spawn(command, args, {
      cwd: cwd || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('error', (error: Error) => {
      reject(new ClaudeProcessError(
        `Process execution failed: ${error.message}`,
        {
          code: 'SPAWN_FAILED',
        }
      ));
    });

    proc.on('close', (exitCode: number | null) => {
      resolve({
        stdout,
        stderr,
        exitCode: exitCode ?? 1,
      });
    });

    // Write stdin if provided
    if (stdin) {
      proc.stdin.write(stdin);
      proc.stdin.end();
    } else {
      proc.stdin.end();
    }
  });
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

  const cmd = ['claude', ...args];
  const [command = '', ...cmdArgs] = cmd;

  const proc: ChildProcessWithoutNullStreams = spawn(command, cmdArgs, {
    cwd: cwd || process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let stderr = '';

  // Write stdin if provided
  if (stdin) {
    proc.stdin.write(stdin);
    proc.stdin.end();
  } else {
    proc.stdin.end();
  }

  // Capture stderr
  proc.stderr.on('data', (data: Buffer) => {
    stderr += data.toString();
  });

  let buffer = '';
  let timeoutId: NodeJS.Timeout | null = null;

  try {
    yield* (async function* () {
      for await (const chunk of proc.stdout) {
        // Reset timeout on each chunk
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          proc.kill();
        }, timeout);

        buffer += chunk.toString();

        // Split by newlines and yield complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            yield line;
          }
        }
      }

      // Yield any remaining buffer
      if (buffer.trim()) {
        yield buffer;
      }
    })();
  } catch (error) {
    throw new ClaudeProcessError(
      `Streaming execution failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        code: 'STREAM_FAILED',
      }
    );
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  // Wait for process to complete and check exit code
  await new Promise<void>((resolve, reject) => {
    proc.on('close', (exitCode: number | null) => {
      if (exitCode !== 0) {
        reject(new ClaudeProcessError(
          `Command failed with exit code ${exitCode}`,
          {
            exitCode: exitCode ?? 1,
            stderr,
          }
        ));
      } else {
        resolve();
      }
    });

    proc.on('error', (error: Error) => {
      reject(new ClaudeProcessError(
        `Process error: ${error.message}`,
        {
          code: 'PROCESS_ERROR',
        }
      ));
    });
  });
}

/**
 * Check if the claude CLI is available
 */
export async function checkClaudeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('which', ['claude'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    proc.on('close', (exitCode: number | null) => {
      resolve(exitCode === 0);
    });

    proc.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Get Claude CLI version
 */
export async function getClaudeVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    const proc = spawn('claude', ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.on('close', (exitCode: number | null) => {
      if (exitCode === 0) {
        resolve(stdout.trim());
      } else {
        resolve(null);
      }
    });

    proc.on('error', () => {
      resolve(null);
    });
  });
}
