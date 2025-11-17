/**
 * MCP manager and gateway system
 *
 * Provides dynamic MCP server management and tool grouping through gateways
 *
 * @example
 * ```typescript
 * import { Mcp } from './lib/mcp/index.js';
 *
 * // Create manager
 * const manager = Mcp.createManager();
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
 *
 * // Use with agent
 * const mcpConfig = gateway.getMcpConfig();
 * ```
 */

// Export types
export type { Mcp } from './types.js';

// Export manager
export { createManager } from './manager.js';

// Export gateway
export { createGateway } from './gateway.js';

// Export router
export { createRouter } from './router.js';

// Export config writer
export { writeMcpConfig, generateMcpConfigContent } from './config-writer.js';
