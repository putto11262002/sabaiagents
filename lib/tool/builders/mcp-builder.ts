/**
 * Builder for creating MCP tool definitions
 *
 * Provides helper functions to create MCP tool definitions
 */

import type { Tool } from '../types.js';
import type { Claude } from '../../../src/claude/types.js';

/**
 * Options for creating an MCP tool
 */
export interface McpToolOptions {
  /** Unique tool identifier */
  id: string;
  /** Human-readable tool name */
  name: string;
  /** Tool description */
  description: string;
  /** MCP server identifier */
  serverName: string;
  /** Tool name within the MCP server */
  toolName: string;
  /** MCP server configuration */
  mcpConfig: Claude.McpServerConfig;
  /** Optional category */
  category?: string;
  /** Optional tags */
  tags?: string[];
  /** Optional schema */
  schema?: Tool.ToolSchema;
}

/**
 * Create an MCP tool definition
 *
 * @param options - MCP tool options
 * @returns MCP tool definition
 *
 * @example
 * ```typescript
 * const githubTool = createMcpTool({
 *   id: 'github-issues',
 *   name: 'GitHub Issues',
 *   description: 'Query GitHub issues',
 *   serverName: 'github',
 *   toolName: 'list_issues',
 *   mcpConfig: {
 *     command: 'npx',
 *     args: ['-y', '@anthropic-ai/mcp-server-github'],
 *     env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN },
 *   },
 * });
 * ```
 */
export function createMcpTool(options: McpToolOptions): Tool.McpTool {
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    type: 'mcp',
    serverName: options.serverName,
    toolName: options.toolName,
    category: options.category,
    tags: options.tags,
    schema: options.schema,
    getMcpConfig: () => options.mcpConfig,
  };
}

/**
 * Create multiple MCP tools from the same server
 *
 * @param serverName - MCP server name
 * @param mcpConfig - MCP server configuration
 * @param tools - Array of tool definitions
 * @returns Array of MCP tool definitions
 *
 * @example
 * ```typescript
 * const githubTools = createMcpTools('github', {
 *   command: 'npx',
 *   args: ['-y', '@anthropic-ai/mcp-server-github'],
 *   env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN },
 * }, [
 *   { id: 'github-issues', name: 'GitHub Issues', toolName: 'list_issues' },
 *   { id: 'github-pr', name: 'GitHub PRs', toolName: 'list_prs' },
 * ]);
 * ```
 */
export function createMcpTools(
  serverName: string,
  mcpConfig: Claude.McpServerConfig,
  tools: Array<{
    id: string;
    name: string;
    description?: string;
    toolName: string;
    category?: string;
    tags?: string[];
  }>
): Tool.McpTool[] {
  return tools.map((tool) =>
    createMcpTool({
      id: tool.id,
      name: tool.name,
      description: tool.description || tool.name,
      serverName,
      toolName: tool.toolName,
      mcpConfig,
      category: tool.category,
      tags: tool.tags,
    })
  );
}
