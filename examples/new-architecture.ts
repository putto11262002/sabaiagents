/**
 * Example: New Architecture with ClaudeCode, Agent, and SessionStore
 *
 * Demonstrates the refactored architecture using namespaces and factories
 */

import {
  createClaudeCode,
  createAgent,
  createSessionStore,
  BuiltInTools,
  type Claude,
} from '../src/claude/index.js';

async function main() {
  console.log('=== Claude Code New Architecture Demo ===\n');

  // ============= 1. Built-in Tools =============
  console.log('1. Built-in Tools Catalog\n');

  console.log('All available tools:', BuiltInTools.getAllToolNames());
  console.log('\nSafe tools (no system modification):', BuiltInTools.getSafeTools());
  console.log('\nRead-only preset:', BuiltInTools.TOOL_PRESETS.readonly);
  console.log('\nTool info for "Bash":', BuiltInTools.getTool('Bash'));

  // ============= 2. Basic ClaudeCode Usage =============
  console.log('\n\n2. Basic ClaudeCode Instance\n');

  const claude = createClaudeCode({
    defaultOptions: {
      allowedTools: BuiltInTools.TOOL_PRESETS.readonly,
      outputFormat: 'json',
    },
  });

  // Check availability
  const available = await claude.isAvailable();
  console.log(`Claude CLI available: ${available}`);

  if (available) {
    // Simple query
    const response = await claude.query('What is 2 + 2? Answer with just the number.');

    if (response.format === 'json') {
      console.log(`Response: ${response.result}`);
      console.log(`Cost: $${response.total_cost_usd.toFixed(6)}`);
      console.log(`Session ID: ${response.session_id}`);
    }
  }

  // ============= 3. Session Store =============
  console.log('\n\n3. Session Store (SQLite)\n');

  // Create in-memory store for demo
  const store = createSessionStore(':memory:');

  // Manually add some data
  store.upsertSession({
    id: 'test-session-1',
    created_at: Date.now(),
    last_active: Date.now(),
    turns: 2,
    total_cost_usd: 0.001,
  });

  store.addConversationTurn('test-session-1', {
    role: 'user',
    content: 'Hello',
    timestamp: Date.now(),
  });

  store.addConversationTurn('test-session-1', {
    role: 'assistant',
    content: 'Hi there!',
    timestamp: Date.now(),
  });

  // Query the store
  const session = store.getSession('test-session-1');
  console.log('Session metadata:', session);

  const history = store.getConversationHistory('test-session-1');
  console.log('Conversation history:', history);

  const stats = store.getStats();
  console.log('Store stats:', stats);

  // ============= 4. Agent Usage =============
  console.log('\n\n4. Agent with Auto-Session Storage\n');

  if (available) {
    // Create a code review agent
    const reviewer = createAgent({
      name: 'code-reviewer',
      cwd: process.cwd(),
      sessionStore: store,
      claudeConfig: {
        allowedTools: ['Read', 'Grep', 'Glob'],
        outputFormat: 'json',
      },
    });

    console.log(`Agent name: ${reviewer.getName()}`);
    console.log(`Agent cwd: ${reviewer.getCwd()}`);

    // Run the agent (automatically saves to session store)
    const result = await reviewer.run('List all TypeScript files in src/claude');

    if (result.format === 'json') {
      console.log(`\nAgent result: ${result.result.substring(0, 200)}...`);
      console.log(`Session ID: ${result.session_id}`);
      console.log(`Turns: ${result.num_turns}`);

      // Continue in same session
      const followUp = await reviewer.run('How many files are there?', {
        sessionId: result.session_id,
      });

      if (followUp.format === 'json') {
        console.log(`\nFollow-up: ${followUp.result}`);
      }

      // Check session was saved
      const savedSession = store.getSession(result.session_id);
      console.log(`\nSaved session metadata:`, savedSession);

      const savedHistory = store.getConversationHistory(result.session_id);
      console.log(`Saved conversation turns: ${savedHistory.length}`);
    }
  }

  // ============= 5. Streaming with Agent =============
  console.log('\n\n5. Streaming with Agent\n');

  if (available) {
    const assistant = createAgent({
      name: 'assistant',
      cwd: process.cwd(),
      sessionStore: store,
      claudeConfig: {
        allowedTools: BuiltInTools.TOOL_PRESETS.safe,
      },
    });

    console.log('Streaming response:');
    console.log('---');

    for await (const message of assistant.runStream('Count from 1 to 3')) {
      if (message.type === 'assistant') {
        const assistantMsg = message as Claude.AssistantMessage;
        for (const block of assistantMsg.message.content) {
          if (block.type === 'text') {
            process.stdout.write((block as Claude.TextContent).text);
          }
        }
      }

      if (message.type === 'result') {
        const result = message as Claude.ResultMessage;
        console.log('\n---');
        console.log(`Session: ${result.session_id}`);
        console.log(`Duration: ${result.duration_ms}ms`);
      }
    }
  }

  // ============= 6. Tool Presets =============
  console.log('\n\n6. Tool Presets\n');

  console.log('Available presets:');
  console.log('  - readonly:', BuiltInTools.TOOL_PRESETS.readonly);
  console.log('  - codeEditor:', BuiltInTools.TOOL_PRESETS.codeEditor);
  console.log('  - webResearch:', BuiltInTools.TOOL_PRESETS.webResearch);
  console.log('  - dataAnalysis:', BuiltInTools.TOOL_PRESETS.dataAnalysis);

  // Cleanup
  store.close();

  console.log('\n\n=== Demo Complete ===');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
