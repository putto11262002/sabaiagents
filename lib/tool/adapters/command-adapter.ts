/**
 * Command tool adapter
 *
 * Adapts command-line tools for use in the unified tool system
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Tool } from '../types.js';
import type { Claude } from '../../../src/claude/types.js';

const execFileAsync = promisify(execFile);

/**
 * Validate a command tool definition
 */
export function validate(tool: Tool.CommandTool): Tool.ValidationResult {
  const errors: string[] = [];

  // Check required fields
  if (!tool.id) errors.push('id is required');
  if (!tool.name) errors.push('name is required');
  if (!tool.description) errors.push('description is required');
  if (!tool.command) errors.push('command is required');

  // Validate timeout if provided
  if (tool.timeout !== undefined && tool.timeout <= 0) {
    errors.push('timeout must be positive');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Adapt a command tool for execution
 */
export function adapt(tool: Tool.CommandTool): Tool.AdaptedTool {
  const validation = validate(tool);
  if (!validation.valid) {
    throw new Error(
      `Invalid command tool: ${validation.errors.join(', ')}`
    );
  }

  return {
    async execute(input: any): Promise<any> {
      try {
        // Prepare command arguments
        const args = tool.args || [];

        // Execute command
        const { stdout, stderr } = await execFileAsync(
          tool.command,
          args,
          {
            env: { ...process.env, ...tool.env },
            timeout: tool.timeout,
            cwd: tool.cwd,
            maxBuffer: 1024 * 1024 * 10, // 10MB
          }
        );

        // Parse output if parser provided
        const output = tool.parseOutput ? tool.parseOutput(stdout) : stdout;

        return {
          success: true,
          output,
          stderr: stderr || undefined,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          exitCode: error.code,
          stderr: error.stderr,
        };
      }
    },

    getClaudeConfig(): Partial<Claude.QueryOptions> {
      // Command tools don't affect Claude Code configuration
      // They're executed independently
      return {};
    },
  };
}

/**
 * Command tool adapter
 */
export const commandAdapter: Tool.Adapter<Tool.CommandTool> = {
  validate,
  adapt,
};
