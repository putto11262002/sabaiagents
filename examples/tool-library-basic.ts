/**
 * Basic usage example for the tool library system
 *
 * This example demonstrates:
 * 1. Creating a tool registry
 * 2. Registering different types of tools
 * 3. Querying the registry
 */

import { createRegistry, ToolBuilders, ToolPresets } from '../lib/index.js';

// Create a tool registry
const registry = createRegistry();

// Register built-in tools from Claude Code
const readTool = ToolBuilders.fromClaudeTool('Read');
const writeTool = ToolBuilders.fromClaudeTool('Write');
const bashTool = ToolBuilders.fromClaudeTool('Bash');

registry.register(readTool);
registry.register(writeTool);
registry.register(bashTool);

// Register MCP tools
const githubIssuesTool = ToolBuilders.createMcpTool({
  id: 'github-issues',
  name: 'GitHub Issues',
  description: 'Query and manage GitHub issues',
  serverName: 'github',
  toolName: 'list_issues',
  mcpConfig: {
    command: 'npx',
    args: ['-y', '@anthropic-ai/mcp-server-github'],
    env: {
      GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
    },
  },
  category: 'github',
  tags: ['vcs', 'github'],
});

registry.register(githubIssuesTool);

// Register command-line tools
const gitStatusTool = ToolBuilders.createGitTool(
  'git-status',
  'Git Status',
  'Get git repository status',
  ['status', '--short']
);

registry.register(gitStatusTool);

// Query the registry
console.log('All tools:', registry.list().map(t => t.name));
console.log('\nBuilt-in tools:', registry.getByType('builtin').map(t => t.name));
console.log('MCP tools:', registry.getByType('mcp').map(t => t.name));
console.log('Command tools:', registry.getByType('command').map(t => t.name));

// Filter tools
console.log('\nTools in github category:', registry.list({ category: 'github' }).map(t => t.name));
console.log('Tools with vcs tag:', registry.list({ tags: ['vcs'] }).map(t => t.name));

// Register preset tools
const readonlyTools = ToolPresets.readonly();
readonlyTools.forEach(tool => {
  if (!registry.has(tool.id)) {
    registry.register(tool);
  }
});

console.log('\nTotal tools after adding presets:', registry.list().length);
