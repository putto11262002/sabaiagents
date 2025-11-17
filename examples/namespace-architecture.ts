/**
 * Example: TypeScript Namespace Architecture
 *
 * Demonstrates the new namespace-based architecture using:
 * - ClaudeCode namespace
 * - Agent namespace
 * - Session namespace
 */

import { ClaudeCode, Agent, Session, type Claude } from '../src/index.ts';

async function main() {
  console.log('=== TypeScript Namespace Architecture Demo ===\n');

  // ============= 1. ClaudeCode Namespace =============
  console.log('1. ClaudeCode Namespace\n');

  // Access built-in tools catalog
  console.log('All tools:', ClaudeCode.BuiltInTools.getAllNames());
  console.log('Safe tools:', ClaudeCode.BuiltInTools.getSafeTools());
  console.log('Tool presets:', Object.keys(ClaudeCode.BuiltInTools.PRESETS));

  // Get specific tool info
  const bashTool = ClaudeCode.BuiltInTools.get('Bash');
  console.log('\nBash tool info:', bashTool);

  // Create ClaudeCode instance
  const claude = ClaudeCode.create({
    defaultOptions: {
      allowedTools: [...ClaudeCode.BuiltInTools.PRESETS.readonly],
      outputFormat: 'json',
    },
  });

  // Check availability
  const available = await claude.isAvailable();
  console.log(`\nClaude CLI available: ${available}`);

  if (available) {
    // Simple query
    const response = await claude.query('What is 2 + 2? Answer with just the number.');

    if (response.format === 'json') {
      console.log(`Response: ${response.result}`);
      console.log(`Cost: $${response.total_cost_usd.toFixed(6)}`);
      console.log(`Session ID: ${response.session_id}`);
    }
  }

  // ============= 2. Session Namespace =============
  console.log('\n\n2. Session Namespace\n');

  // Create session store using Session namespace
  const store = Session.createStore(':memory:');

  // Manually add session data
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

  // ============= 3. Agent Namespace =============
  console.log('\n\n3. Agent Namespace\n');

  if (available) {
    // Create agent using Agent namespace
    const reviewer = Agent.create({
      name: 'code-reviewer',
      cwd: process.cwd(),
      sessionStore: store,
      claudeConfig: {
        allowedTools: [...ClaudeCode.BuiltInTools.PRESETS.readonly],
        outputFormat: 'json',
      },
    });

    console.log(`Agent name: ${reviewer.getName()}`);
    console.log(`Agent cwd: ${reviewer.getCwd()}`);

    // Run the agent
    const result = await reviewer.run('List all TypeScript files in src/core');

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

  // ============= 4. Streaming with Agent =============
  console.log('\n\n4. Streaming with Agent\n');

  if (available) {
    const assistant = Agent.create({
      name: 'assistant',
      cwd: process.cwd(),
      sessionStore: store,
      claudeConfig: {
        allowedTools: [...ClaudeCode.BuiltInTools.getSafeTools()],
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

  // ============= 5. Tool Presets =============
  console.log('\n\n5. Tool Presets from ClaudeCode.BuiltInTools\n');

  console.log('Available presets:');
  console.log('  - readonly:', ClaudeCode.BuiltInTools.PRESETS.readonly);
  console.log('  - codeEditor:', ClaudeCode.BuiltInTools.PRESETS.codeEditor);
  console.log('  - webResearch:', ClaudeCode.BuiltInTools.PRESETS.webResearch);
  console.log('  - dataAnalysis:', ClaudeCode.BuiltInTools.PRESETS.dataAnalysis);

  // ============= 6. Type Safety =============
  console.log('\n\n6. Type Safety with Namespaces\n');

  // All types are properly namespaced
  const metadata: Session.Metadata = {
    id: 'test',
    created_at: Date.now(),
    last_active: Date.now(),
    turns: 0,
    total_cost_usd: 0,
  };

  const config: Agent.Config = {
    name: 'test-agent',
    cwd: '/',
    sessionStore: store,
  };

  const claudeConfig: ClaudeCode.Config = {
    defaultOptions: {
      outputFormat: 'json',
    },
  };

  console.log('All types are properly namespaced:');
  console.log('  - Session.Metadata');
  console.log('  - Session.Turn');
  console.log('  - Session.Store');
  console.log('  - Agent.Config');
  console.log('  - Agent.Instance');
  console.log('  - ClaudeCode.Config');
  console.log('  - ClaudeCode.Instance');
  console.log('  - ClaudeCode.BuiltInTools.Definition');

  // Cleanup
  store.close();

  console.log('\n\n=== Demo Complete ===');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
