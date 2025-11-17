/**
 * Example: JSON output format
 *
 * Demonstrates using JSON output format to get structured responses with metadata
 */

import { ClaudeClient } from '../src/claude/index.ts';

async function main() {
  const client = new ClaudeClient();

  console.log('Sending query with JSON output format...\n');

  const response = await client.query('Explain what TypeScript is in one sentence.', {
    outputFormat: 'json',
  });

  if (response.format === 'json') {
    console.log('Response metadata:');
    console.log(`  Session ID: ${response.session_id}`);
    console.log(`  Number of turns: ${response.num_turns}`);
    console.log(`  Duration: ${response.duration_ms}ms`);
    console.log(`  API Duration: ${response.duration_api_ms}ms`);
    console.log(`  Total cost: $${response.total_cost_usd.toFixed(6)}`);
    console.log(`  Is error: ${response.is_error}`);
    console.log();
    console.log('Response:');
    console.log(response.result);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
