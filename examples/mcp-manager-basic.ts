/**
 * Basic usage example for the MCP manager
 *
 * This example demonstrates:
 * 1. Creating an MCP manager
 * 2. Adding MCP servers
 * 3. Creating gateways to group tools
 * 4. Generating MCP configurations
 */

import { createManager, createRegistry, ToolBuilders } from '../lib/index.js';

// Create MCP manager
const manager = createManager();

// Add MCP servers
manager.addServer('github', {
  command: 'npx',
  args: ['-y', '@anthropic-ai/mcp-server-github'],
  env: {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  },
});

manager.addServer('datadog', {
  command: 'npx',
  args: ['-y', '@anthropic-ai/mcp-server-datadog'],
  env: {
    DATADOG_API_KEY: process.env.DATADOG_API_KEY || '',
    DATADOG_APP_KEY: process.env.DATADOG_APP_KEY || '',
  },
});

// List all servers
console.log('Registered MCP servers:');
const servers = manager.listServers();
for (const [name, config] of Object.entries(servers)) {
  console.log(`  - ${name}: ${config.command} ${config.args?.join(' ')}`);
}

// Create a tool registry with MCP tools
const registry = createRegistry();

const githubTools = ToolBuilders.createMcpTools('github', {
  command: 'npx',
  args: ['-y', '@anthropic-ai/mcp-server-github'],
  env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN || '' },
}, [
  {
    id: 'github-issues',
    name: 'GitHub Issues',
    description: 'List GitHub issues',
    toolName: 'list_issues',
  },
  {
    id: 'github-pr',
    name: 'GitHub PRs',
    description: 'List GitHub pull requests',
    toolName: 'list_prs',
  },
]);

githubTools.forEach(tool => registry.register(tool));

// Create a gateway grouping tools from multiple sources
const devopsGateway = manager.createGateway({
  name: 'devops-tools',
  description: 'DevOps tools for development workflow',
  tools: ['github-issues', 'github-pr'],
});

console.log('\nCreated gateway:', devopsGateway.name);
console.log('Gateway ID:', devopsGateway.id);
console.log('Tools in gateway:', devopsGateway.tools);

// Get MCP config for the gateway
const mcpConfig = devopsGateway.getMcpConfig();
console.log('\nGateway MCP config:', JSON.stringify(mcpConfig, null, 2));

// List all gateways
console.log('\nAll gateways:');
manager.listGateways().forEach(gw => {
  console.log(`  - ${gw.name} (${gw.id}): ${gw.tools.length} tools`);
});
