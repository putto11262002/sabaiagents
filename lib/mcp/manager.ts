/**
 * MCP manager implementation
 *
 * Manages MCP servers and gateways
 */

import type { Claude } from '../../src/claude/types.js';
import type { Mcp } from './types.js';
import { createGateway } from './gateway.js';

/**
 * MCP manager implementation
 */
class ManagerImpl implements Mcp.Manager {
  private servers: Map<string, Mcp.ServerMetadata> = new Map();
  private gateways: Map<string, Mcp.Gateway> = new Map();
  private options: Mcp.ManagerOptions;

  constructor(options: Mcp.ManagerOptions = {}) {
    this.options = options;
  }

  addServer(name: string, config: Claude.McpServerConfig): void {
    if (this.servers.has(name)) {
      throw new Error(`MCP server "${name}" already exists`);
    }

    if (!config.command) {
      throw new Error('MCP server config must have a command');
    }

    this.servers.set(name, {
      name,
      config,
      addedAt: Date.now(),
    });
  }

  removeServer(name: string): boolean {
    return this.servers.delete(name);
  }

  getServer(name: string): Claude.McpServerConfig | null {
    const metadata = this.servers.get(name);
    return metadata ? metadata.config : null;
  }

  listServers(): Record<string, Claude.McpServerConfig> {
    const servers: Record<string, Claude.McpServerConfig> = {};
    for (const [name, metadata] of this.servers.entries()) {
      servers[name] = metadata.config;
    }
    return servers;
  }

  getServerMetadata(name: string): Mcp.ServerMetadata | null {
    return this.servers.get(name) || null;
  }

  createGateway(config: Mcp.GatewayConfig): Mcp.Gateway {
    const gateway = createGateway(this, config);

    if (this.gateways.has(gateway.id)) {
      throw new Error(`Gateway with ID "${gateway.id}" already exists`);
    }

    this.gateways.set(gateway.id, gateway);
    return gateway;
  }

  listGateways(): Mcp.Gateway[] {
    return Array.from(this.gateways.values());
  }

  getGateway(id: string): Mcp.Gateway | null {
    return this.gateways.get(id) || null;
  }

  removeGateway(id: string): boolean {
    return this.gateways.delete(id);
  }
}

/**
 * Create a new MCP manager
 *
 * @param options - Manager options
 * @returns MCP manager instance
 *
 * @example
 * ```typescript
 * const manager = createManager();
 *
 * // Add MCP servers
 * manager.addServer('github', {
 *   command: 'npx',
 *   args: ['-y', '@anthropic-ai/mcp-server-github'],
 *   env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN },
 * });
 *
 * // Create gateway
 * const gateway = manager.createGateway({
 *   name: 'devops-tools',
 *   tools: ['github-issues', 'github-pr'],
 * });
 * ```
 */
export function createManager(
  options?: Mcp.ManagerOptions
): Mcp.Manager {
  return new ManagerImpl(options);
}
