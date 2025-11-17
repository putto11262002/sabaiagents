/**
 * MCP tool adapter
 *
 * Adapts MCP tools for use in the unified tool system
 */

import type { Tool } from '../types.js';
import type { Claude } from '../../../src/claude/types.js';

/**
 * Validate an MCP tool definition
 */
export function validate(tool: Tool.McpTool): Tool.ValidationResult {
  const errors: string[] = [];

  // Check required fields
  if (!tool.id) errors.push('id is required');
  if (!tool.name) errors.push('name is required');
  if (!tool.description) errors.push('description is required');
  if (!tool.serverName) errors.push('serverName is required');
  if (!tool.toolName) errors.push('toolName is required');
  if (!tool.getMcpConfig) {
    errors.push('getMcpConfig function is required');
  } else {
    // Validate MCP config
    try {
      const config = tool.getMcpConfig();
      if (!config.command) {
        errors.push('MCP config must have a command');
      }
    } catch (error) {
      errors.push(
        `getMcpConfig() threw error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Adapt an MCP tool for execution
 */
export function adapt(tool: Tool.McpTool): Tool.AdaptedTool {
  const validation = validate(tool);
  if (!validation.valid) {
    throw new Error(`Invalid MCP tool: ${validation.errors.join(', ')}`);
  }

  return {
    async execute(input: any): Promise<any> {
      // MCP tools are executed through the MCP server
      // This is handled by Claude Code when MCP config is provided
      throw new Error(
        'MCP tools cannot be executed directly. Use them through ClaudeCode.query() with mcpConfig'
      );
    },

    getClaudeConfig(): Partial<Claude.QueryOptions> {
      // MCP tools need to be configured through MCP config files
      // This returns empty config as MCP tools are handled differently
      return {};
    },
  };
}

/**
 * MCP tool adapter
 */
export const mcpAdapter: Tool.Adapter<Tool.McpTool> = {
  validate,
  adapt,
};
