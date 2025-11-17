/**
 * Example: Session resumption
 *
 * Demonstrates resuming previous sessions and continuing conversations
 */

import { ClaudeClient } from '../src/claude/index.js';

async function main() {
  const client = new ClaudeClient();

  console.log('=== Part 1: Create initial session ===\n');

  // Create a session and get session ID
  const session1 = client.createSession();

  const response1 = await session1.send(
    'I am working on a TypeScript project. Can you help me understand generics?',
    {
      outputFormat: 'json',
    }
  );

  let sessionId = '';
  if (response1.format === 'json') {
    sessionId = response1.session_id;
    console.log(`Session ID: ${sessionId}`);
    console.log(`Response: ${response1.result.slice(0, 100)}...\n`);
  }

  console.log('=== Part 2: Resume session later ===\n');

  // Simulate resuming the session later (e.g., in a different process or after restart)
  const session2 = client.resumeSession(sessionId);

  const response2 = await session2.send(
    'Can you give me a specific example of generics?',
    {
      outputFormat: 'json',
    }
  );

  if (response2.format === 'json') {
    console.log(`Resumed session: ${response2.session_id}`);
    console.log(`Response: ${response2.result.slice(0, 100)}...\n`);
  }

  console.log('=== Part 3: Continue most recent session ===\n');

  // Continue the most recent session without knowing the session ID
  const session3 = client.continueLastSession();

  const response3 = await session3.send(
    'Thanks! That helps.',
    {
      outputFormat: 'json',
    }
  );

  if (response3.format === 'json') {
    console.log(`Continued session: ${response3.session_id}`);
    console.log(`Response: ${response3.result}\n`);
  }

  console.log('=== Session Export/Import ===\n');

  // Export session data for persistence
  const sessionData = session3.export();
  console.log('Exported session data:');
  console.log(`  ID: ${sessionData.metadata.id}`);
  console.log(`  Turns: ${sessionData.metadata.turns}`);
  console.log(`  History items: ${sessionData.history.length}`);
  console.log(`  Total cost: $${sessionData.metadata.total_cost_usd.toFixed(6)}`);

  // Import into a new session (e.g., for persistence/restoration)
  const session4 = client.createSession();
  session4.import(sessionData);

  console.log('\nSession successfully imported and restored!');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
