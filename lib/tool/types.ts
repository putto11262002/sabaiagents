/**
 * Tool type definitions for the unified tool system
 *
 * Supports three types of tools:
 * 1. Built-in Claude Code tools
 * 2. MCP (Model Context Protocol) tools
 * 3. Command-line tools
 */

import type { Claude } from '../../src/claude/types.js';

export namespace Tool {
  // ============= Base Tool Types =============

  /**
   * JSON Schema definition for tool input/output validation
   */
  export interface ToolSchema {
    input?: Record<string, any>;
    output?: Record<string, any>;
  }

  /**
   * Base tool definition interface
   */
  export interface Definition {
    /** Unique tool identifier */
    id: string;
    /** Human-readable tool name */
    name: string;
    /** Tool description */
    description: string;
    /** Tool type */
    type: 'builtin' | 'mcp' | 'command';
    /** Optional category for organization */
    category?: string;
    /** Optional JSON schema for validation */
    schema?: ToolSchema;
    /** Optional tags for filtering */
    tags?: string[];
  }

  // ============= Built-in Claude Code Tool =============

  /**
   * Built-in Claude Code tool definition
   *
   * Maps to native Claude Code tools like Read, Write, Bash, etc.
   */
  export interface BuiltInTool extends Definition {
    type: 'builtin';
    /** Claude Code tool name (e.g., 'Read', 'Write', 'Bash') */
    claudeName: string;
    /** Whether this tool requires user permission */
    requiresPermission: boolean;
  }

  // ============= MCP Tool =============

  /**
   * MCP tool definition
   *
   * Wraps tools from MCP servers with configuration
   */
  export interface McpTool extends Definition {
    type: 'mcp';
    /** MCP server identifier */
    serverName: string;
    /** Tool name within the MCP server */
    toolName: string;
    /** Function to generate MCP server configuration */
    getMcpConfig(): Claude.McpServerConfig;
  }

  // ============= Command Tool =============

  /**
   * Command-line tool definition
   *
   * Executes system commands as tools
   */
  export interface CommandTool extends Definition {
    type: 'command';
    /** Command to execute */
    command: string;
    /** Command arguments */
    args?: string[];
    /** Environment variables */
    env?: Record<string, string>;
    /** Timeout in milliseconds */
    timeout?: number;
    /** Working directory for command execution */
    cwd?: string;
    /** Function to parse command output into structured data */
    parseOutput?: (output: string) => any;
  }

  // ============= Union Types =============

  /**
   * Union type for all tool definitions
   */
  export type AnyTool = BuiltInTool | McpTool | CommandTool;

  // ============= Registry Types =============

  /**
   * Filter criteria for querying tools
   */
  export interface ToolFilter {
    /** Filter by tool type */
    type?: 'builtin' | 'mcp' | 'command';
    /** Filter by category */
    category?: string;
    /** Filter by tags (match any) */
    tags?: string[];
    /** Filter by name pattern (regex) */
    namePattern?: RegExp;
  }

  /**
   * Tool registry interface
   */
  export interface Registry {
    /** Register a new tool */
    register(tool: AnyTool): void;
    /** Unregister a tool by ID */
    unregister(id: string): boolean;
    /** Get a tool by ID */
    get(id: string): AnyTool | null;
    /** List all registered tools */
    list(filter?: ToolFilter): AnyTool[];
    /** Get tools by type */
    getByType(type: 'builtin' | 'mcp' | 'command'): AnyTool[];
    /** Check if a tool exists */
    has(id: string): boolean;
    /** Clear all registered tools */
    clear(): void;
  }

  // ============= Adapter Types =============

  /**
   * Validation result for tool definitions
   */
  export interface ValidationResult {
    valid: boolean;
    errors: string[];
  }

  /**
   * Adapted tool with execution capabilities
   */
  export interface AdaptedTool {
    /** Execute the tool with input */
    execute(input: any): Promise<any>;
    /** Get Claude Code configuration for this tool */
    getClaudeConfig(): Partial<Claude.QueryOptions>;
  }

  /**
   * Tool adapter interface
   */
  export interface Adapter<T extends Definition> {
    /** Validate a tool definition */
    validate(tool: T): ValidationResult;
    /** Adapt a tool for execution */
    adapt(tool: T): AdaptedTool;
  }
}
