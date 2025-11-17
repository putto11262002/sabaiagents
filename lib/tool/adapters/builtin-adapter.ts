/**
 * Built-in tool adapter
 *
 * Adapts Claude Code built-in tools for use in the unified tool system
 */

import type { Tool } from '../types.js';
import type { Claude } from '../../../src/claude/types.js';
import { ClaudeCode } from '../../../src/core/claude-code/index.js';

/**
 * Validate a built-in tool definition
 */
export function validate(tool: Tool.BuiltInTool): Tool.ValidationResult {
  const errors: string[] = [];

  // Check if tool name is valid
  if (!tool.claudeName) {
    errors.push('claudeName is required for built-in tools');
  } else if (!ClaudeCode.BuiltInTools.isValid(tool.claudeName)) {
    errors.push(`Invalid Claude Code tool name: ${tool.claudeName}`);
  }

  // Check required fields
  if (!tool.id) errors.push('id is required');
  if (!tool.name) errors.push('name is required');
  if (!tool.description) errors.push('description is required');
  if (tool.requiresPermission === undefined) {
    errors.push('requiresPermission is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Adapt a built-in tool for execution
 */
export function adapt(tool: Tool.BuiltInTool): Tool.AdaptedTool {
  const validation = validate(tool);
  if (!validation.valid) {
    throw new Error(
      `Invalid built-in tool: ${validation.errors.join(', ')}`
    );
  }

  return {
    async execute(input: any): Promise<any> {
      // Built-in tools are executed by Claude Code itself
      // This is more of a placeholder as execution happens through Claude CLI
      throw new Error(
        'Built-in tools cannot be executed directly. Use them through ClaudeCode.query()'
      );
    },

    getClaudeConfig(): Partial<Claude.QueryOptions> {
      // Return configuration to enable this tool in Claude Code
      return {
        allowedTools: [tool.claudeName],
      };
    },
  };
}

/**
 * Built-in tool adapter
 */
export const builtinAdapter: Tool.Adapter<Tool.BuiltInTool> = {
  validate,
  adapt,
};
