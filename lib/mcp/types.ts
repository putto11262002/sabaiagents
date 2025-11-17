/**
 * MCP manager and gateway type definitions
 */

import type { Claude } from '../../src/claude/types.js';
import type { Tool } from '../tool/types.js';

export namespace Mcp {
  // ============= Manager Types =============

  /**
   * MCP manager options
   */
  export interface ManagerOptions {
    /** Base directory for MCP config files */
    configDir?: string;
  }

  /**
   * MCP server metadata
   */
  export interface ServerMetadata {
    name: string;
    config: Claude.McpServerConfig;
    tools?: string[];
    /** When the server was added */
    addedAt: number;
  }

  /**
   * MCP manager interface
   */
  export interface Manager {
    /** Add an MCP server */
    addServer(name: string, config: Claude.McpServerConfig): void;
    /** Remove an MCP server */
    removeServer(name: string): boolean;
    /** Get MCP server config */
    getServer(name: string): Claude.McpServerConfig | null;
    /** List all MCP servers */
    listServers(): Record<string, Claude.McpServerConfig>;
    /** Get server metadata */
    getServerMetadata(name: string): ServerMetadata | null;
    /** Create a gateway */
    createGateway(config: GatewayConfig): Gateway;
    /** List all gateways */
    listGateways(): Gateway[];
    /** Get gateway by ID */
    getGateway(id: string): Gateway | null;
    /** Remove gateway */
    removeGateway(id: string): boolean;
  }

  // ============= Gateway Types =============

  /**
   * Gateway configuration
   */
  export interface GatewayConfig {
    /** Gateway name */
    name: string;
    /** Tool IDs to expose through this gateway */
    tools: string[];
    /** Optional gateway ID (auto-generated if not provided) */
    id?: string;
    /** Optional description */
    description?: string;
  }

  /**
   * Gateway status
   */
  export type GatewayStatus = 'stopped' | 'starting' | 'running' | 'error';

  /**
   * Gateway interface
   */
  export interface Gateway {
    /** Gateway ID */
    readonly id: string;
    /** Gateway name */
    readonly name: string;
    /** Gateway description */
    readonly description?: string;
    /** Tool IDs exposed by this gateway */
    readonly tools: readonly string[];

    /** Get MCP configuration for this gateway */
    getMcpConfig(): Claude.McpServerConfig;

    /** Add a tool to the gateway */
    addTool(toolId: string): void;

    /** Remove a tool from the gateway */
    removeTool(toolId: string): void;

    /** List all tools in this gateway */
    listTools(): Tool.McpTool[];

    /** Get gateway status */
    getStatus(): GatewayStatus;

    /** Get gateway metadata */
    getMetadata(): GatewayMetadata;
  }

  /**
   * Gateway metadata
   */
  export interface GatewayMetadata {
    id: string;
    name: string;
    description?: string;
    tools: string[];
    createdAt: number;
    status: GatewayStatus;
  }

  // ============= Router Types =============

  /**
   * Tool route - maps tool ID to MCP server
   */
  export interface ToolRoute {
    toolId: string;
    serverName: string;
    toolName: string;
  }

  /**
   * Tool group - collection of tools from multiple sources
   */
  export interface ToolGroup {
    name: string;
    description?: string;
    tools: Tool.McpTool[];
    gateway: Gateway;
  }

  /**
   * Router interface
   */
  export interface Router {
    /** Route a tool call to the appropriate MCP server */
    route(toolName: string): Claude.McpServerConfig | null;

    /** Create a tool group */
    createToolGroup(
      name: string,
      toolIds: string[],
      description?: string
    ): ToolGroup;

    /** Generate unified MCP config from tool IDs */
    generateConfig(toolIds: string[]): Record<string, Claude.McpServerConfig>;
  }
}
