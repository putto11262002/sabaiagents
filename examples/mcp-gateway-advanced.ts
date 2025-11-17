/**
 * Advanced MCP gateway example
 *
 * This example demonstrates:
 * 1. Creating multiple gateways for different purposes
 * 2. Generating MCP config files
 * 3. Using router for tool routing
 */

import { createManager, createRouter, createRegistry, ToolBuilders, writeMcpConfig } from '../lib/index.js';

// Setup
const manager = createManager();
const registry = createRegistry();

// Add multiple MCP servers
manager.addServer('github', {
  command: 'npx',
  args: ['-y', '@anthropic-ai/mcp-server-github'],
  env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN || '' },
});

manager.addServer('linear', {
  command: 'npx',
  args: ['-y', '@linear/mcp-server'],
  env: { LINEAR_API_KEY: process.env.LINEAR_API_KEY || '' },
});

manager.addServer('slack', {
  command: 'npx',
  args: ['-y', '@slack/mcp-server'],
  env: { SLACK_TOKEN: process.env.SLACK_TOKEN || '' },
});

// Register MCP tools
const githubTools = ToolBuilders.createMcpTools('github', manager.getServer('github')!, [
  { id: 'github-issues', name: 'GitHub Issues', toolName: 'list_issues' },
  { id: 'github-pr', name: 'GitHub PRs', toolName: 'list_prs' },
  { id: 'github-repo', name: 'GitHub Repos', toolName: 'get_repo' },
]);

const linearTools = ToolBuilders.createMcpTools('linear', manager.getServer('linear')!, [
  { id: 'linear-issues', name: 'Linear Issues', toolName: 'list_issues' },
  { id: 'linear-projects', name: 'Linear Projects', toolName: 'list_projects' },
]);

const slackTools = ToolBuilders.createMcpTools('slack', manager.getServer('slack')!, [
  { id: 'slack-channels', name: 'Slack Channels', toolName: 'list_channels' },
  { id: 'slack-messages', name: 'Slack Messages', toolName: 'send_message' },
]);

[...githubTools, ...linearTools, ...slackTools].forEach(tool => registry.register(tool));

// Create specialized gateways
const devGateway = manager.createGateway({
  name: 'development-gateway',
  description: 'Tools for development workflow',
  tools: ['github-issues', 'github-pr', 'github-repo'],
});

const pmGateway = manager.createGateway({
  name: 'project-management-gateway',
  description: 'Tools for project management',
  tools: ['linear-issues', 'linear-projects', 'github-issues'],
});

const communicationGateway = manager.createGateway({
  name: 'communication-gateway',
  description: 'Tools for team communication',
  tools: ['slack-channels', 'slack-messages'],
});

console.log('Created gateways:');
manager.listGateways().forEach(gw => {
  console.log(`  - ${gw.name}: ${gw.tools.join(', ')}`);
});

// Create router for tool routing
const router = createRouter(manager, registry);

// Generate unified MCP config for specific tools
const devConfig = router.generateConfig(['github-issues', 'github-pr']);
console.log('\nDev config servers:', Object.keys(devConfig));

// Write MCP config to file
async function generateConfigs() {
  await writeMcpConfig('./examples/dev-mcp-config.json', devConfig);
  console.log('Dev MCP config written to ./examples/dev-mcp-config.json');

  const pmConfig = router.generateConfig(['linear-issues', 'linear-projects', 'github-issues']);
  await writeMcpConfig('./examples/pm-mcp-config.json', pmConfig);
  console.log('PM MCP config written to ./examples/pm-mcp-config.json');
}

// Uncomment to generate config files
// generateConfigs().catch(console.error);

console.log('\nUncomment generateConfigs() to create MCP config files');
