/**
 * Basic usage example for tool-enhanced agents
 *
 * This example demonstrates:
 * 1. Creating agents with the unified tool system
 * 2. Using built-in tools, MCP tools, and command tools together
 * 3. Dynamic tool configuration per run
 */

import { Session } from '../src/core/session/index.js';
import { createToolAgent } from '../src/core/agent/index.js';
import { createRegistry, ToolBuilders, ToolPresets } from '../lib/index.js';

// Create session store
const sessionStore = Session.createStore('./examples/sessions.db');

// Create tool registry
const registry = createRegistry();

// Register various tools
// 1. Built-in tools for code editing
const codeEditorTools = ToolPresets.codeEditor();
codeEditorTools.forEach(tool => registry.register(tool));

// 2. MCP tool for GitHub
const githubTool = ToolBuilders.createMcpTool({
  id: 'github-issues',
  name: 'GitHub Issues',
  description: 'Query and manage GitHub issues',
  serverName: 'github',
  toolName: 'list_issues',
  mcpConfig: {
    command: 'npx',
    args: ['-y', '@anthropic-ai/mcp-server-github'],
    env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN || '' },
  },
});
registry.register(githubTool);

// 3. Command tool for git
const gitStatusTool = ToolBuilders.createGitTool(
  'git-status',
  'Git Status',
  'Get repository status',
  ['status', '--short']
);
registry.register(gitStatusTool);

// Create tool-enhanced agent
const codeAssistant = createToolAgent({
  name: 'code-assistant',
  cwd: process.cwd(),
  sessionStore,
  tools: {
    registry,
    allowed: [
      // Built-in tools
      'read',
      'write',
      'glob',
      'grep',
      // MCP tools
      'github-issues',
      // Command tools
      'git-status',
    ],
  },
});

console.log('Agent created:', codeAssistant.getName());
console.log('Working directory:', codeAssistant.getCwd());

// Example usage (commented out to avoid actual API calls)
/*
// Run with default tools
const result1 = await codeAssistant.run(
  'Read the README and summarize it'
);

// Run with specific tools override
const result2 = await codeAssistant.run(
  'Check git status and create a GitHub issue if there are uncommitted changes',
  {
    tools: ['git-status', 'github-issues'],
  }
);

// Stream responses
for await (const message of codeAssistant.runStream('Analyze this codebase')) {
  if (message.type === 'assistant') {
    // Process assistant message
  }
}
*/

console.log('\nAgent ready. Uncomment usage examples to test.');
