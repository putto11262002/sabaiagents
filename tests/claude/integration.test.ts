/**
 * Integration tests for Claude Code client
 *
 * These tests require the Claude CLI to be installed and authenticated.
 * They will be skipped if the CLI is not available.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { ClaudeClient } from '../../src/claude/client.js';

describe('Integration Tests', () => {
  let client: ClaudeClient;
  let isAvailable: boolean = false;

  beforeAll(async () => {
    client = new ClaudeClient();
    isAvailable = await client.isAvailable();

    if (!isAvailable) {
      console.log('\nSkipping integration tests: Claude CLI not available');
      console.log('Install Claude CLI to run integration tests\n');
    }
  });

  test('should check Claude CLI availability', async () => {
    const available = await client.isAvailable();
    expect(typeof available).toBe('boolean');
  });

  // Only run these tests if Claude CLI is available
  describe('Query Operations', { skip: !isAvailable }, () => {
    test('should execute a simple text query', async () => {
      if (!isAvailable) return;

      const response = await client.query('What is 2 + 2? Answer with just the number.');

      expect(response).toBeDefined();
      expect(response.format).toBe('text');

      if (response.format === 'text') {
        expect(response.text).toBeDefined();
        expect(response.exitCode).toBe(0);
      }
    }, { timeout: 30000 });

    test('should execute a JSON query', async () => {
      if (!isAvailable) return;

      const response = await client.query('What is 2 + 2? Answer with just the number.', {
        outputFormat: 'json',
      });

      expect(response).toBeDefined();
      expect(response.format).toBe('json');

      if (response.format === 'json') {
        expect(response.result).toBeDefined();
        expect(response.session_id).toBeDefined();
        expect(response.total_cost_usd).toBeGreaterThanOrEqual(0);
        expect(response.is_error).toBe(false);
        expect(response.exitCode).toBe(0);
      }
    }, { timeout: 30000 });

    test('should execute a streaming query', async () => {
      if (!isAvailable) return;

      const messages = [];

      for await (const message of client.stream('Count from 1 to 3')) {
        messages.push(message);
      }

      expect(messages.length).toBeGreaterThan(0);

      // Should have at least an init and result message
      const initMessage = messages.find(m => m.type === 'init');
      const resultMessage = messages.find(m => m.type === 'result');

      expect(initMessage).toBeDefined();
      expect(resultMessage).toBeDefined();
    }, { timeout: 30000 });
  });

  describe('Session Operations', { skip: !isAvailable }, () => {
    test('should create and use a session', async () => {
      if (!isAvailable) return;

      const session = client.createSession();

      const response1 = await session.send('My favorite color is blue.', {
        outputFormat: 'json',
      });

      expect(response1.format).toBe('json');

      if (response1.format === 'json') {
        const sessionId = response1.session_id;
        expect(sessionId).toBeDefined();

        // Second message in the same session
        const response2 = await session.send('What is my favorite color?', {
          outputFormat: 'json',
        });

        expect(response2.format).toBe('json');

        if (response2.format === 'json') {
          expect(response2.session_id).toBe(sessionId);
          // Claude should remember the favorite color
          expect(response2.result.toLowerCase()).toContain('blue');
        }
      }
    }, { timeout: 60000 });

    test('should export and import session data', async () => {
      if (!isAvailable) return;

      const session1 = client.createSession();

      await session1.send('Remember: the password is "secret123"', {
        outputFormat: 'json',
      });

      // Export session data
      const sessionData = session1.export();

      expect(sessionData.metadata).toBeDefined();
      expect(sessionData.history).toBeDefined();
      expect(sessionData.history.length).toBeGreaterThan(0);

      // Import into new session
      const session2 = client.createSession();
      session2.import(sessionData);

      expect(session2.getSessionId()).toBe(sessionData.metadata.id);
      expect(session2.getHistory()).toHaveLength(sessionData.history.length);
    }, { timeout: 30000 });
  });

  describe('Tool Configuration', { skip: !isAvailable }, () => {
    test('should respect allowed tools', async () => {
      if (!isAvailable) return;

      const response = await client.query('Read the package.json file', {
        outputFormat: 'json',
        allowedTools: ['Read'],
      });

      expect(response.format).toBe('json');

      if (response.format === 'json') {
        expect(response.is_error).toBe(false);
      }
    }, { timeout: 30000 });
  });
});
