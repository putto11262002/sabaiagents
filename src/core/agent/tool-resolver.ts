/**
 * Tool resolver for Agent
 *
 * Resolves tool definitions to Claude Code configuration
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { Claude } from '../../claude/types.js';
import type { Tool } from '../../../lib/tool/types.js';
import type { Mcp } from '../../../lib/mcp/types.js';
import { generateMcpConfigContent } from '../../../lib/mcp/config-writer.js';

/**
 * Tool resolver options
 */
export interface ToolResolverOptions {
  /** Tool registry */
  registry: Tool.Registry;
  /** MCP manager (optional) */
  mcpManager?: Mcp.Manager;
  /** Working directory for MCP config files */
  cwd?: string;
}

/**
 * Tool resolver interface
 */
export interface ToolResolver {
  /**
   * Resolve tool IDs to Claude Code configuration
   *
   * @param toolIds - Array of tool IDs to resolve
   * @returns Partial Claude Code configuration
   */
  resolve(toolIds: string[]): Partial<Claude.QueryOptions>;

  /**
   * Generate MCP config file path for given tools
   *
   * @param toolIds - Array of tool IDs
   * @returns Promise resolving to config file path
   */
  generateMcpConfig(toolIds: string[]): Promise<string>;

  /**
   * Get allowed tools list for Claude Code
   *
   * @param toolIds - Array of tool IDs
   * @returns Array of Claude Code tool names
   */
  getAllowedTools(toolIds: string[]): string[];

  /**
   * Get MCP tools from tool IDs
   *
   * @param toolIds - Array of tool IDs
   * @returns Array of MCP tools
   */
  getMcpTools(toolIds: string[]): Tool.McpTool[];
}

/**
 * Tool resolver implementation
 */
class ToolResolverImpl implements ToolResolver {
  private registry: Tool.Registry;
  private mcpManager?: Mcp.Manager;
  private cwd: string;

  constructor(options: ToolResolverOptions) {
    this.registry = options.registry;
    this.mcpManager = options.mcpManager;
    this.cwd = options.cwd || process.cwd();
  }

  resolve(toolIds: string[]): Partial<Claude.QueryOptions> {
    const allowedTools = this.getAllowedTools(toolIds);
    const config: Partial<Claude.QueryOptions> = {};

    if (allowedTools.length > 0) {
      config.allowedTools = allowedTools;
    }

    return config;
  }

  async generateMcpConfig(toolIds: string[]): Promise<string> {
    const mcpTools = this.getMcpTools(toolIds);

    if (mcpTools.length === 0) {
      throw new Error('No MCP tools found in provided tool IDs');
    }

    // Build MCP config from tools
    const mcpConfig: Record<string, Claude.McpServerConfig> = {};
    const seenServers = new Set<string>();

    for (const tool of mcpTools) {
      if (!seenServers.has(tool.serverName)) {
        mcpConfig[tool.serverName] = tool.getMcpConfig();
        seenServers.add(tool.serverName);
      }
    }

    // Generate config file path
    const configDir = join(this.cwd, '.agent-configs');
    await mkdir(configDir, { recursive: true });

    const timestamp = Date.now();
    const configPath = join(configDir, `mcp-config-${timestamp}.json`);

    // Write config file
    const content = generateMcpConfigContent(mcpConfig);
    await writeFile(configPath, content, 'utf-8');

    return configPath;
  }

  getAllowedTools(toolIds: string[]): string[] {
    const allowedTools: string[] = [];

    for (const id of toolIds) {
      const tool = this.registry.get(id);
      if (tool && tool.type === 'builtin') {
        const builtinTool = tool as Tool.BuiltInTool;
        allowedTools.push(builtinTool.claudeName);
      }
    }

    return allowedTools;
  }

  getMcpTools(toolIds: string[]): Tool.McpTool[] {
    const mcpTools: Tool.McpTool[] = [];

    for (const id of toolIds) {
      const tool = this.registry.get(id);
      if (tool && tool.type === 'mcp') {
        mcpTools.push(tool as Tool.McpTool);
      }
    }

    return mcpTools;
  }
}

/**
 * Create a tool resolver
 *
 * @param options - Tool resolver options
 * @returns Tool resolver instance
 *
 * @example
 * ```typescript
 * const resolver = createToolResolver({
 *   registry,
 *   mcpManager,
 *   cwd: '/project',
 * });
 *
 * const config = resolver.resolve(['read', 'write', 'github-issues']);
 * ```
 */
export function createToolResolver(
  options: ToolResolverOptions
): ToolResolver {
  return new ToolResolverImpl(options);
}
