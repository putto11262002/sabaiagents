/**
 * Tests for ClaudeClient
 */

import { describe, test, expect } from 'bun:test';
import { ClaudeClient, createClient } from '../../src/claude/client.ts';

describe('ClaudeClient', () => {
  describe('Constructor', () => {
    test('should create a new client instance', () => {
      const client = new ClaudeClient();
      expect(client).toBeInstanceOf(ClaudeClient);
    });

    test('should have session manager', () => {
      const client = new ClaudeClient();
      const sessionManager = client.getSessionManager();
      expect(sessionManager).toBeDefined();
    });
  });

  describe('createClient', () => {
    test('should create a client using factory function', () => {
      const client = createClient();
      expect(client).toBeInstanceOf(ClaudeClient);
    });
  });

  describe('isAvailable', () => {
    test('should check CLI availability', async () => {
      const client = new ClaudeClient();
      const available = await client.isAvailable();
      expect(typeof available).toBe('boolean');
    });
  });

  describe('getVersion', () => {
    test('should return version or null', async () => {
      const client = new ClaudeClient();
      const version = await client.getVersion();
      expect(version === null || typeof version === 'string').toBe(true);
    });
  });

  describe('Session Management', () => {
    test('should create a new session', () => {
      const client = new ClaudeClient();
      const session = client.createSession();
      expect(session).toBeDefined();
    });

    test('should resume a session by ID', () => {
      const client = new ClaudeClient();
      const session = client.resumeSession('session_123');
      expect(session).toBeDefined();
      expect(session.getSessionId()).toBe('session_123');
    });

    test('should continue last session', () => {
      const client = new ClaudeClient();
      const session = client.continueLastSession();
      expect(session).toBeDefined();
    });

    test('should create session with options', () => {
      const client = new ClaudeClient();
      const session = client.createSession(undefined, {
        allowedTools: ['Bash', 'Read'],
        verbose: true,
      });
      expect(session).toBeDefined();
    });
  });
});
