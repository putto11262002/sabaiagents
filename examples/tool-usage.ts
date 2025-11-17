/**
 * Example: Tool configuration
 *
 * Demonstrates configuring allowed and disallowed tools
 */

import { ClaudeClient, extractToolUses } from '../src/claude/index.ts';
import type { Claude } from '../src/claude/index.ts';

async function main() {
  const client = new ClaudeClient();

  console.log('Example 1: Allowing only specific tools\n');

  // Only allow Read and Bash tools
  for await (const message of client.stream(
    'Read the package.json file and tell me what scripts are available',
    {
      outputFormat: 'stream-json',
      allowedTools: ['Read', 'Bash'],
    }
  )) {
    if (message.type === 'assistant') {
      const assistantMsg = message as Claude.AssistantMessage;
      const toolUses = extractToolUses(assistantMsg.message.content);

      if (toolUses.length > 0) {
        console.log('Tools used:');
        for (const tool of toolUses) {
          console.log(`  - ${tool.name}`);
          console.log(`    Input:`, JSON.stringify(tool.input, null, 2));
        }
      }
    }

    if (message.type === 'result') {
      const result = message as Claude.ResultMessage;
      console.log('\nFinal response:');
      console.log(result.result);
    }
  }

  console.log('\n---\n');
  console.log('Example 2: Disallowing WebSearch\n');

  // Disallow WebSearch to keep responses local
  const response = await client.query(
    'What is the latest TypeScript version?',
    {
      outputFormat: 'json',
      disallowedTools: ['WebSearch', 'WebFetch'],
    }
  );

  if (response.format === 'json') {
    console.log('Response (without web access):');
    console.log(response.result);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
