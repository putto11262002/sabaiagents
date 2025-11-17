/**
 * Main library exports
 *
 * Provides unified tool system and MCP management
 */

// Export Tool namespace and utilities
export type { Tool } from './tool/types.js';
export { createRegistry } from './tool/registry.js';
export { builtinAdapter, mcpAdapter, commandAdapter } from './tool/index.js';
export * as ToolBuilders from './tool/builders/index.js';
export * as ToolPresets from './tool/presets/index.js';

// Export MCP namespace and utilities
export type { Mcp } from './mcp/types.js';
export { createManager, createGateway, createRouter, writeMcpConfig, generateMcpConfigContent } from './mcp/index.js';
