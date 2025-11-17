/**
 * Tool registry implementation
 *
 * Provides a central registry for managing tool definitions
 */

import type { Tool } from './types.js';

/**
 * Registry implementation
 */
class RegistryImpl implements Tool.Registry {
  private tools: Map<string, Tool.AnyTool> = new Map();

  register(tool: Tool.AnyTool): void {
    if (this.tools.has(tool.id)) {
      throw new Error(`Tool with id "${tool.id}" already registered`);
    }
    this.tools.set(tool.id, tool);
  }

  unregister(id: string): boolean {
    return this.tools.delete(id);
  }

  get(id: string): Tool.AnyTool | null {
    return this.tools.get(id) || null;
  }

  list(filter?: Tool.ToolFilter): Tool.AnyTool[] {
    let tools = Array.from(this.tools.values());

    if (!filter) {
      return tools;
    }

    // Filter by type
    if (filter.type) {
      tools = tools.filter((tool) => tool.type === filter.type);
    }

    // Filter by category
    if (filter.category) {
      tools = tools.filter((tool) => tool.category === filter.category);
    }

    // Filter by tags (match any)
    if (filter.tags && filter.tags.length > 0) {
      tools = tools.filter((tool) =>
        tool.tags?.some((tag) => filter.tags!.includes(tag))
      );
    }

    // Filter by name pattern
    if (filter.namePattern) {
      tools = tools.filter((tool) => filter.namePattern!.test(tool.name));
    }

    return tools;
  }

  getByType(type: 'builtin' | 'mcp' | 'command'): Tool.AnyTool[] {
    return this.list({ type });
  }

  has(id: string): boolean {
    return this.tools.has(id);
  }

  clear(): void {
    this.tools.clear();
  }
}

/**
 * Create a new tool registry
 *
 * @returns Tool registry instance
 *
 * @example
 * ```typescript
 * const registry = createRegistry();
 *
 * registry.register({
 *   id: 'read',
 *   name: 'Read',
 *   description: 'Read files',
 *   type: 'builtin',
 *   claudeName: 'Read',
 *   requiresPermission: false,
 * });
 *
 * const tool = registry.get('read');
 * ```
 */
export function createRegistry(): Tool.Registry {
  return new RegistryImpl();
}
