/**
 * Example: MCP server integration
 *
 * Demonstrates using Model Context Protocol (MCP) servers
 */

import { ClaudeClient } from '../src/claude/index.ts';
import type { Claude } from '../src/claude/index.ts';

async function main() {
  const client = new ClaudeClient();

  // Example MCP configuration file (create this separately)
  const mcpConfigPath = './mcp-config.json';

  console.log('Using MCP servers for enhanced capabilities\n');
  console.log(`MCP Config: ${mcpConfigPath}\n`);

  // Example: Using MCP servers like GitHub, Slack, or Datadog
  const response = await client.query(
    'Check the status of our production services and alert if there are any issues',
    {
      outputFormat: 'json',
      mcpConfig: mcpConfigPath,
      allowedTools: ['mcp__datadog', 'mcp__slack', 'Bash'],
    }
  );

  if (response.format === 'json') {
    console.log('Response:');
    console.log(response.result);
    console.log(`\nCost: $${response.total_cost_usd.toFixed(6)}`);
  }
}

/**
 * Example MCP configuration structure
 *
 * Save this to mcp-config.json:
 * {
 *   "mcpServers": {
 *     "datadog": {
 *       "command": "npx",
 *       "args": ["-y", "@anthropic-ai/mcp-server-datadog"],
 *       "env": {
 *         "DATADOG_API_KEY": "your-api-key",
 *         "DATADOG_APP_KEY": "your-app-key"
 *       }
 *     },
 *     "slack": {
 *       "command": "npx",
 *       "args": ["-y", "@anthropic-ai/mcp-server-slack"],
 *       "env": {
 *         "SLACK_BOT_TOKEN": "your-bot-token"
 *       }
 *     },
 *     "github": {
 *       "command": "npx",
 *       "args": ["-y", "@anthropic-ai/mcp-server-github"],
 *       "env": {
 *         "GITHUB_TOKEN": "your-github-token"
 *       }
 *     }
 *   }
 * }
 */

// Uncomment to run (requires MCP config file)
// main().catch((error) => {
//   console.error('Error:', error);
//   process.exit(1);
// });

console.log('Note: This example requires an MCP configuration file.');
console.log('See the code comments for the configuration structure.');
