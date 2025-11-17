/**
 * MCP configuration file writer
 *
 * Writes MCP configuration to JSON files for Claude Code
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Claude } from '../../src/claude/types.js';

/**
 * Write MCP configuration to a JSON file
 *
 * @param filePath - Path to write the config file
 * @param config - MCP configuration
 *
 * @example
 * ```typescript
 * await writeMcpConfig('./mcp-config.json', {
 *   github: {
 *     command: 'npx',
 *     args: ['-y', '@anthropic-ai/mcp-server-github'],
 *   },
 * });
 * ```
 */
export async function writeMcpConfig(
  filePath: string,
  config: Record<string, Claude.McpServerConfig>
): Promise<void> {
  // Ensure directory exists
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });

  // Create MCP config structure
  const mcpConfig: Claude.McpConfig = {
    mcpServers: config,
  };

  // Write to file
  await writeFile(filePath, JSON.stringify(mcpConfig, null, 2), 'utf-8');
}

/**
 * Generate MCP config content as string
 *
 * @param config - MCP configuration
 * @returns JSON string
 *
 * @example
 * ```typescript
 * const content = generateMcpConfigContent({
 *   github: {
 *     command: 'npx',
 *     args: ['-y', '@anthropic-ai/mcp-server-github'],
 *   },
 * });
 * ```
 */
export function generateMcpConfigContent(
  config: Record<string, Claude.McpServerConfig>
): string {
  const mcpConfig: Claude.McpConfig = {
    mcpServers: config,
  };

  return JSON.stringify(mcpConfig, null, 2);
}
