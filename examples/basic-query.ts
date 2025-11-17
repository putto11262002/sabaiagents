/**
 * Example: Basic text query
 *
 * Demonstrates simple text-based queries to Claude Code
 */

import { ClaudeClient } from '../src/claude/index.ts';

async function main() {
  const client = new ClaudeClient();

  // Check if Claude CLI is available
  const available = await client.isAvailable();
  if (!available) {
    console.error('Claude CLI is not available. Please install it first.');
    process.exit(1);
  }

  // Get Claude version
  const version = await client.getVersion();
  console.log(`Using Claude CLI version: ${version}\n`);

  // Simple text query
  console.log('Sending query: "What is 2 + 2?"\n');
  const response = await client.query('What is 2 + 2?');

  if (response.format === 'text') {
    console.log('Response:');
    console.log(response.text);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
