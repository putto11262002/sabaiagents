/**
 * Built-in tools available in Claude Code
 *
 * Reference: https://code.claude.com/docs/en/tools
 * System Prompt: https://gist.github.com/wong2/e0f34aac66caf890a332f7b6f9e2ba8f
 */

export namespace ClaudeCode {
  /**
   * Tool definition interface
   */
  export interface ToolDefinition {
    /** Tool name */
    name: string;
    /** Tool description */
    description: string;
    /** Tool category */
    category: 'core' | 'file' | 'notebook' | 'web' | 'task' | 'agent';
    /** Whether this tool requires user permission */
    requiresPermission: boolean;
    /** Documentation link */
    docsUrl?: string;
  }

  /**
   * Complete catalog of built-in tools available in Claude Code
   *
   * @see https://code.claude.com/docs/en/tools
   * @see https://code.claude.com/docs/en/cli-reference
   */
  export const BUILT_IN_TOOLS: Readonly<Record<string, ToolDefinition>> = {
    // ============= Core Tools =============
    Task: {
      name: 'Task',
      description: 'Launch specialized agents for complex, multi-step tasks autonomously. Available agent types: general-purpose, statusline-setup, Explore, Plan.',
      category: 'agent',
      requiresPermission: false,
      docsUrl: 'https://code.claude.com/docs/en/tools',
    },

    Bash: {
      name: 'Bash',
      description: 'Execute bash commands in a persistent shell session for terminal operations (git, npm, docker, pytest, etc.). NOT for file operations - use Read/Write/Edit instead.',
      category: 'core',
      requiresPermission: true,
      docsUrl: 'https://code.claude.com/docs/en/tools',
    },

    Glob: {
      name: 'Glob',
      description: 'Fast file pattern matching tool that works with any codebase size. Supports patterns like "**/*.js" or "src/**/*.ts". Returns matching file paths sorted by modification time.',
      category: 'core',
      requiresPermission: false,
      docsUrl: 'https://code.claude.com/docs/en/tools',
    },

    Grep: {
      name: 'Grep',
      description: 'Powerful search tool built on ripgrep. Supports full regex syntax, file filtering with glob/type parameters, and output modes (content/files/count). ALWAYS use Grep for search, NEVER invoke grep/rg as Bash command.',
      category: 'core',
      requiresPermission: false,
      docsUrl: 'https://code.claude.com/docs/en/tools',
    },

    // ============= File Management Tools =============
    Read: {
      name: 'Read',
      description: 'Read files from the local filesystem. Supports all file types including images, PDFs, and Jupyter notebooks. Can read up to 2000 lines by default with optional offset/limit parameters.',
      category: 'file',
      requiresPermission: false,
      docsUrl: 'https://code.claude.com/docs/en/tools',
    },

    Edit: {
      name: 'Edit',
      description: 'Perform exact string replacements in files. Must preserve exact indentation from Read tool output. Use replace_all for renaming variables. ALWAYS prefer editing existing files over creating new ones.',
      category: 'file',
      requiresPermission: true,
      docsUrl: 'https://code.claude.com/docs/en/tools',
    },

    Write: {
      name: 'Write',
      description: 'Write files to the local filesystem. Overwrites existing files. ALWAYS prefer editing existing files. NEVER proactively create documentation files unless explicitly requested.',
      category: 'file',
      requiresPermission: true,
      docsUrl: 'https://code.claude.com/docs/en/tools',
    },

    // ============= Notebook Tools =============
    NotebookEdit: {
      name: 'NotebookEdit',
      description: 'Edit Jupyter notebook (.ipynb) cells with replace, insert, or delete modes. Can specify cell by ID or index.',
      category: 'notebook',
      requiresPermission: true,
      docsUrl: 'https://code.claude.com/docs/en/tools',
    },

    // ============= Web & Search Tools =============
    WebFetch: {
      name: 'WebFetch',
      description: 'Fetch content from URLs and process with AI model. Converts HTML to markdown. Includes 15-minute cache. Prefer MCP web fetch tools if available.',
      category: 'web',
      requiresPermission: false,
      docsUrl: 'https://code.claude.com/docs/en/tools',
    },

    WebSearch: {
      name: 'WebSearch',
      description: 'Search the web with optional domain filtering (allowed/blocked domains). Only available in US. Results formatted as search result blocks.',
      category: 'web',
      requiresPermission: false,
      docsUrl: 'https://code.claude.com/docs/en/tools',
    },

    // ============= Task Management Tools =============
    TodoWrite: {
      name: 'TodoWrite',
      description: 'Create and manage structured task lists for tracking progress. Use for complex multi-step tasks (3+ steps). Tasks have states: pending, in_progress, completed.',
      category: 'task',
      requiresPermission: false,
      docsUrl: 'https://code.claude.com/docs/en/tools',
    },

    // ============= Background Process Tools =============
    BashOutput: {
      name: 'BashOutput',
      description: 'Retrieve output from running or completed background bash shells. Returns only new output since last check. Supports regex filtering.',
      category: 'core',
      requiresPermission: false,
      docsUrl: 'https://code.claude.com/docs/en/tools',
    },

    KillShell: {
      name: 'KillShell',
      description: 'Kill a running background bash shell by its ID. Shell IDs can be found using /bashes command.',
      category: 'core',
      requiresPermission: true,
      docsUrl: 'https://code.claude.com/docs/en/tools',
    },

    // ============= Skill & Commands =============
    Skill: {
      name: 'Skill',
      description: 'Execute specialized skills within the main conversation. Skills provide domain-specific capabilities like PDF processing, Excel handling, etc.',
      category: 'agent',
      requiresPermission: false,
      docsUrl: 'https://code.claude.com/docs/en/skills',
    },

    SlashCommand: {
      name: 'SlashCommand',
      description: 'Execute custom slash commands defined in .claude/commands/. Commands expand to their defined prompts.',
      category: 'agent',
      requiresPermission: false,
      docsUrl: 'https://code.claude.com/docs/en/slash-commands',
    },

    // ============= Planning Tools =============
    ExitPlanMode: {
      name: 'ExitPlanMode',
      description: 'Exit plan mode after presenting implementation plan. Only use when planning implementation steps of a coding task, NOT for research tasks.',
      category: 'agent',
      requiresPermission: false,
      docsUrl: 'https://code.claude.com/docs/en/tools',
    },
  };

  /**
   * Get all tool names
   */
  export function getAllToolNames(): readonly string[] {
    return Object.keys(BUILT_IN_TOOLS);
  }

  /**
   * Get tools by category
   */
  export function getToolsByCategory(category: ToolDefinition['category']): readonly ToolDefinition[] {
    return Object.values(BUILT_IN_TOOLS).filter(tool => tool.category === category);
  }

  /**
   * Get tool definition by name
   */
  export function getTool(name: string): ToolDefinition | undefined {
    return BUILT_IN_TOOLS[name];
  }

  /**
   * Check if a tool exists
   */
  export function isValidTool(name: string): boolean {
    return name in BUILT_IN_TOOLS;
  }

  /**
   * Get tools that require permissions
   */
  export function getPermissionRequiredTools(): readonly ToolDefinition[] {
    return Object.values(BUILT_IN_TOOLS).filter(tool => tool.requiresPermission);
  }

  /**
   * Get safe tools that don't modify the system
   */
  export function getSafeTools(): readonly string[] {
    return Object.values(BUILT_IN_TOOLS)
      .filter(tool => !tool.requiresPermission)
      .map(tool => tool.name);
  }

  /**
   * Common tool presets for different use cases
   */
  export const TOOL_PRESETS = {
    /** Read-only tools for analysis */
    readonly: ['Read', 'Glob', 'Grep', 'WebFetch', 'WebSearch'] as const,

    /** Code editing tools */
    codeEditor: ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash'] as const,

    /** Web research tools */
    webResearch: ['WebSearch', 'WebFetch', 'Read', 'Grep'] as const,

    /** Data analysis tools */
    dataAnalysis: ['Read', 'Bash', 'NotebookEdit', 'Glob'] as const,

    /** Full access (all tools) */
    full: getAllToolNames() as readonly string[],

    /** Safe tools only (no system modification) */
    safe: getSafeTools(),
  };
}
