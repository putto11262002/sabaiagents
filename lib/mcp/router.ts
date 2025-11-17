/**
 * MCP router implementation
 *
 * Routes tool calls to appropriate MCP servers
 */

import type { Claude } from '../../src/claude/types.js';
import type { Tool } from '../tool/types.js';
import type { Mcp } from './types.js';

/**
 * Router implementation
 */
class RouterImpl implements Mcp.Router {
  private manager: Mcp.Manager;
  private registry: Tool.Registry;
  private routes: Map<string, Mcp.ToolRoute> = new Map();

  constructor(manager: Mcp.Manager, registry: Tool.Registry) {
    this.manager = manager;
    this.registry = registry;
    this.buildRoutes();
  }

  /**
   * Build routing table from registered MCP tools
   */
  private buildRoutes(): void {
    const mcpTools = this.registry.getByType('mcp') as Tool.McpTool[];

    for (const tool of mcpTools) {
      this.routes.set(tool.toolName, {
        toolId: tool.id,
        serverName: tool.serverName,
        toolName: tool.toolName,
      });
    }
  }

  route(toolName: string): Claude.McpServerConfig | null {
    const route = this.routes.get(toolName);
    if (!route) {
      return null;
    }

    return this.manager.getServer(route.serverName);
  }

  createToolGroup(
    name: string,
    toolIds: string[],
    description?: string
  ): Mcp.ToolGroup {
    // Get all MCP tools
    const tools: Tool.McpTool[] = [];
    for (const id of toolIds) {
      const tool = this.registry.get(id);
      if (tool && tool.type === 'mcp') {
        tools.push(tool as Tool.McpTool);
      }
    }

    // Create gateway for this group
    const gateway = this.manager.createGateway({
      name,
      tools: toolIds,
      description,
    });

    return {
      name,
      description,
      tools,
      gateway,
    };
  }

  generateConfig(toolIds: string[]): Record<string, Claude.McpServerConfig> {
    const config: Record<string, Claude.McpServerConfig> = {};
    const serverNames = new Set<string>();

    // Collect unique server names
    for (const id of toolIds) {
      const tool = this.registry.get(id);
      if (tool && tool.type === 'mcp') {
        const mcpTool = tool as Tool.McpTool;
        serverNames.add(mcpTool.serverName);
      }
    }

    // Build config for each server
    for (const serverName of serverNames) {
      const serverConfig = this.manager.getServer(serverName);
      if (serverConfig) {
        config[serverName] = serverConfig;
      }
    }

    return config;
  }
}

/**
 * Create a new router
 *
 * @param manager - MCP manager instance
 * @param registry - Tool registry
 * @returns Router instance
 *
 * @example
 * ```typescript
 * const router = createRouter(manager, registry);
 *
 * // Route a tool call
 * const config = router.route('list_issues');
 *
 * // Create a tool group
 * const group = router.createToolGroup('devops', ['github-issues', 'datadog-metrics']);
 * ```
 */
export function createRouter(
  manager: Mcp.Manager,
  registry: Tool.Registry
): Mcp.Router {
  return new RouterImpl(manager, registry);
}
