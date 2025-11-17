/**
 * Tool library - Unified tool system supporting built-in, MCP, and command tools
 *
 * @example
 * ```typescript
 * import { Tool } from './lib/tool/index.js';
 *
 * // Create registry
 * const registry = Tool.createRegistry();
 *
 * // Register tools
 * registry.register(Tool.Builders.fromClaudeTool('Read'));
 * registry.register(Tool.Builders.createMcpTool({
 *   id: 'github-issues',
 *   name: 'GitHub Issues',
 *   description: 'Query GitHub issues',
 *   serverName: 'github',
 *   toolName: 'list_issues',
 *   mcpConfig: { command: 'npx', args: ['-y', '@anthropic-ai/mcp-server-github'] },
 * }));
 *
 * // Query tools
 * const allTools = registry.list();
 * const mcpTools = registry.getByType('mcp');
 * ```
 */

// Export types
export type {
  Tool,
} from './types.js';

// Export registry
export { createRegistry } from './registry.js';

// Export adapters
export { builtinAdapter } from './adapters/builtin-adapter.js';
export { mcpAdapter } from './adapters/mcp-adapter.js';
export { commandAdapter } from './adapters/command-adapter.js';

// Export builders
export * as Builders from './builders/index.js';

// Export presets
export * as Presets from './presets/index.js';
