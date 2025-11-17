/**
 * Builder for creating command tool definitions
 *
 * Provides helper functions to create command-line tool definitions
 */

import type { Tool } from '../types.js';

/**
 * Options for creating a command tool
 */
export interface CommandToolOptions {
  /** Unique tool identifier */
  id: string;
  /** Human-readable tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Command to execute */
  command: string;
  /** Command arguments */
  args?: string[];
  /** Environment variables */
  env?: Record<string, string>;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Working directory */
  cwd?: string;
  /** Output parser function */
  parseOutput?: (output: string) => any;
  /** Optional category */
  category?: string;
  /** Optional tags */
  tags?: string[];
  /** Optional schema */
  schema?: Tool.ToolSchema;
}

/**
 * Create a command tool definition
 *
 * @param options - Command tool options
 * @returns Command tool definition
 *
 * @example
 * ```typescript
 * const gitStatus = createCommandTool({
 *   id: 'git-status',
 *   name: 'Git Status',
 *   description: 'Get git repository status',
 *   command: 'git',
 *   args: ['status', '--short'],
 *   category: 'vcs',
 * });
 * ```
 */
export function createCommandTool(
  options: CommandToolOptions
): Tool.CommandTool {
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    type: 'command',
    command: options.command,
    args: options.args,
    env: options.env,
    timeout: options.timeout,
    cwd: options.cwd,
    parseOutput: options.parseOutput,
    category: options.category,
    tags: options.tags,
    schema: options.schema,
  };
}

/**
 * Create a git command tool
 *
 * @param id - Tool identifier
 * @param name - Tool name
 * @param description - Tool description
 * @param gitArgs - Git command arguments
 * @returns Command tool definition
 *
 * @example
 * ```typescript
 * const gitStatus = createGitTool(
 *   'git-status',
 *   'Git Status',
 *   'Get repository status',
 *   ['status', '--short']
 * );
 * ```
 */
export function createGitTool(
  id: string,
  name: string,
  description: string,
  gitArgs: string[]
): Tool.CommandTool {
  return createCommandTool({
    id,
    name,
    description,
    command: 'git',
    args: gitArgs,
    category: 'vcs',
    tags: ['git'],
  });
}

/**
 * Create an npm command tool
 *
 * @param id - Tool identifier
 * @param name - Tool name
 * @param description - Tool description
 * @param npmArgs - npm command arguments
 * @returns Command tool definition
 *
 * @example
 * ```typescript
 * const npmTest = createNpmTool(
 *   'npm-test',
 *   'npm test',
 *   'Run npm tests',
 *   ['test']
 * );
 * ```
 */
export function createNpmTool(
  id: string,
  name: string,
  description: string,
  npmArgs: string[]
): Tool.CommandTool {
  return createCommandTool({
    id,
    name,
    description,
    command: 'npm',
    args: npmArgs,
    category: 'package-manager',
    tags: ['npm'],
  });
}
