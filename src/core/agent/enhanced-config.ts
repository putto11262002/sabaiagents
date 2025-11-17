/**
 * Enhanced agent configuration with tool system support
 *
 * Extends the basic Agent config to support the unified tool system
 */

import type { Claude } from '../../claude/types.js';
import type { Session } from '../session/index.js';
import type { Tool } from '../../../lib/tool/types.js';
import type { Mcp } from '../../../lib/mcp/types.js';

/**
 * Tool configuration for agents
 */
export interface ToolConfig {
  /** Tool registry */
  registry?: Tool.Registry;
  /** Allowed tool IDs */
  allowed?: string[];
  /** Disallowed tool IDs */
  disallowed?: string[];
  /** MCP gateway */
  mcpGateway?: Mcp.Gateway;
  /** MCP manager */
  mcpManager?: Mcp.Manager;
}

/**
 * Enhanced agent configuration
 */
export interface EnhancedConfig {
  /** Agent name (for logging/debugging) */
  name: string;
  /** Working directory for this agent */
  cwd: string;
  /** Session store for persistence */
  sessionStore: Session.Store;
  /** Default session ID to use (optional) */
  defaultSessionId?: string;

  // Tool configuration (new)
  /** Tool configuration */
  tools?: ToolConfig;

  // Legacy support
  /** Claude Code configuration (legacy - prefer tools) */
  claudeConfig?: Partial<Claude.QueryOptions>;
}

/**
 * Check if config uses the enhanced tool system
 */
export function isEnhancedConfig(config: any): config is EnhancedConfig {
  return 'tools' in config && config.tools !== undefined;
}

/**
 * Convert enhanced config to Claude config
 */
export function toClaudeConfig(
  config: EnhancedConfig
): Partial<Claude.QueryOptions> {
  // If tools are provided, they take precedence
  if (config.tools?.registry && config.tools?.allowed) {
    const { registry, allowed, disallowed } = config.tools;

    // Get built-in tools
    const allowedTools: string[] = [];
    for (const id of allowed) {
      const tool = registry.get(id);
      if (tool && tool.type === 'builtin') {
        const builtinTool = tool as Tool.BuiltInTool;
        allowedTools.push(builtinTool.claudeName);
      }
    }

    // Filter out disallowed tools
    const filteredTools = disallowed
      ? allowedTools.filter((name) => {
          for (const id of disallowed) {
            const tool = registry.get(id);
            if (tool && tool.type === 'builtin') {
              const builtinTool = tool as Tool.BuiltInTool;
              if (builtinTool.claudeName === name) {
                return false;
              }
            }
          }
          return true;
        })
      : allowedTools;

    return {
      allowedTools: filteredTools,
    };
  }

  // Fall back to legacy claudeConfig
  return config.claudeConfig || {};
}
