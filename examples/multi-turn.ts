/**
 * Example: Multi-turn conversation
 *
 * Demonstrates session-based multi-turn conversations with context preservation
 */

import { ClaudeClient } from '../src/claude/index.ts';

async function main() {
  const client = new ClaudeClient();

  console.log('Creating a new session for multi-turn conversation...\n');

  // Create a session
  const session = client.createSession();

  // Turn 1
  console.log('Turn 1: "My name is Alice and I like programming."');
  const response1 = await session.send('My name is Alice and I like programming.', {
    outputFormat: 'json',
  });

  if (response1.format === 'json') {
    console.log(`Session ID: ${response1.session_id}`);
    console.log(`Response: ${response1.result}\n`);
  }

  // Turn 2 - Claude should remember the name
  console.log('Turn 2: "What is my name?"');
  const response2 = await session.send('What is my name?', {
    outputFormat: 'json',
  });

  if (response2.format === 'json') {
    console.log(`Response: ${response2.result}\n`);
  }

  // Turn 3 - Claude should remember the interest
  console.log('Turn 3: "What do I like?"');
  const response3 = await session.send('What do I like?', {
    outputFormat: 'json',
  });

  if (response3.format === 'json') {
    console.log(`Response: ${response3.result}\n`);
  }

  // Display session metadata
  const metadata = session.getMetadata();
  if (metadata) {
    console.log('Session summary:');
    console.log(`  Total turns: ${metadata.turns}`);
    console.log(`  Total cost: $${metadata.total_cost_usd.toFixed(6)}`);
  }

  // Display conversation history
  const history = session.getHistory();
  console.log(`\nConversation history (${history.length} messages):`);
  for (const turn of history) {
    const preview = typeof turn.content === 'string'
      ? turn.content.slice(0, 50)
      : JSON.stringify(turn.content).slice(0, 50);
    console.log(`  [${turn.role}] ${preview}...`);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
