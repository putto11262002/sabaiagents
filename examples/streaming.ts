/**
 * Example: Streaming responses
 *
 * Demonstrates real-time streaming of Claude's response
 */

import { ClaudeClient, extractText } from '../src/claude/index.js';
import type { Claude } from '../src/claude/index.js';

async function main() {
  const client = new ClaudeClient();

  console.log('Streaming query: "Explain the concept of recursion with an example"\n');
  console.log('Response (streaming):');
  console.log('---');

  let fullResponse = '';

  for await (const message of client.stream('Explain the concept of recursion with an example', {
    outputFormat: 'stream-json',
  })) {
    switch (message.type) {
      case 'init':
        const initMsg = message as Claude.InitMessage;
        console.log(`[Session started${initMsg.session_id ? `: ${initMsg.session_id}` : ''}]`);
        break;

      case 'assistant':
        const assistantMsg = message as Claude.AssistantMessage;
        const text = extractText(assistantMsg.message.content);
        if (text) {
          process.stdout.write(text);
          fullResponse += text;
        }
        break;

      case 'result':
        const result = message as Claude.ResultMessage;
        console.log('\n---');
        console.log(`\nCompleted in ${result.duration_ms}ms`);
        console.log(`Cost: $${result.total_cost_usd.toFixed(6)}`);
        console.log(`Turns: ${result.num_turns}`);
        break;

      case 'error':
        const error = message as Claude.ErrorMessage;
        console.error(`\nError: ${error.error}`);
        break;
    }
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
