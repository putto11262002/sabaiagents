/**
 * Builder for creating built-in tool definitions
 *
 * Provides helper functions to create built-in tool definitions
 * from Claude Code's built-in tools
 */

import type { Tool } from '../types.js';
import { ClaudeCode } from '../../../src/core/claude-code/index.js';

/**
 * Create a built-in tool definition from a Claude Code tool name
 *
 * @param claudeName - Claude Code tool name (e.g., 'Read', 'Write')
 * @param options - Optional overrides for tool definition
 * @returns Built-in tool definition
 *
 * @example
 * ```typescript
 * const readTool = fromClaudeTool('Read');
 * const writeTool = fromClaudeTool('Write', { category: 'custom' });
 * ```
 */
export function fromClaudeTool(
  claudeName: string,
  options?: Partial<Omit<Tool.BuiltInTool, 'type' | 'claudeName'>>
): Tool.BuiltInTool {
  const claudeTool = ClaudeCode.BuiltInTools.get(claudeName);
  if (!claudeTool) {
    throw new Error(`Unknown Claude Code tool: ${claudeName}`);
  }

  return {
    id: options?.id || claudeName.toLowerCase(),
    name: options?.name || claudeTool.name,
    description: options?.description || claudeTool.description,
    type: 'builtin',
    claudeName,
    requiresPermission: claudeTool.requiresPermission,
    category: options?.category || claudeTool.category,
    tags: options?.tags,
    schema: options?.schema,
  };
}

/**
 * Create multiple built-in tool definitions from Claude Code tool names
 *
 * @param claudeNames - Array of Claude Code tool names
 * @returns Array of built-in tool definitions
 *
 * @example
 * ```typescript
 * const tools = fromClaudeTools(['Read', 'Write', 'Bash']);
 * ```
 */
export function fromClaudeTools(
  claudeNames: readonly string[]
): Tool.BuiltInTool[] {
  return claudeNames.map((name) => fromClaudeTool(name));
}

/**
 * Create built-in tool definitions from a Claude Code preset
 *
 * @param preset - Preset name ('readonly', 'codeEditor', etc.)
 * @returns Array of built-in tool definitions
 *
 * @example
 * ```typescript
 * const readonlyTools = fromPreset('readonly');
 * const editorTools = fromPreset('codeEditor');
 * ```
 */
export function fromPreset(
  preset: keyof typeof ClaudeCode.BuiltInTools.PRESETS
): Tool.BuiltInTool[] {
  const toolNames = ClaudeCode.BuiltInTools.PRESETS[preset];
  return fromClaudeTools(toolNames);
}

/**
 * Create all built-in tool definitions
 *
 * @returns Array of all built-in tool definitions
 *
 * @example
 * ```typescript
 * const allTools = allBuiltInTools();
 * ```
 */
export function allBuiltInTools(): Tool.BuiltInTool[] {
  const toolNames = ClaudeCode.BuiltInTools.getAllNames();
  return fromClaudeTools(toolNames);
}
