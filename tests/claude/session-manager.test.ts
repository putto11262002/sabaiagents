/**
 * Tests for Session and SessionManager
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { Session, SessionManager } from '../../src/claude/session-manager.ts';
import type { Claude } from '../../src/claude/types.ts';

describe('Session', () => {
  describe('Constructor', () => {
    test('should create a new session', () => {
      const session = new Session();
      expect(session).toBeInstanceOf(Session);
    });

    test('should create session with options', () => {
      const session = new Session({
        sessionId: 'session_123',
        allowedTools: ['Bash'],
      });
      expect(session.getSessionId()).toBe('session_123');
    });
  });

  describe('Metadata', () => {
    test('should start with null metadata', () => {
      const session = new Session();
      expect(session.getMetadata()).toBeNull();
    });

    test('should start with empty history', () => {
      const session = new Session();
      expect(session.getHistory()).toHaveLength(0);
    });
  });

  describe('clear', () => {
    test('should clear session data', () => {
      const session = new Session({ sessionId: 'session_123' });
      session.clear();
      expect(session.getSessionId()).toBeNull();
      expect(session.getMetadata()).toBeNull();
      expect(session.getHistory()).toHaveLength(0);
    });
  });

  describe('export/import', () => {
    test('should export session data', () => {
      const session = new Session();

      // Manually set metadata for testing
      const metadata: Claude.SessionMetadata = {
        id: 'session_123',
        created_at: Date.now(),
        last_active: Date.now(),
        turns: 2,
        total_cost_usd: 0.002,
      };

      // Since we can't easily test the full send flow without Claude CLI,
      // we'll test import/export with manually created data
      const sessionData: Claude.SessionData = {
        metadata,
        history: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: Date.now(),
          },
          {
            role: 'assistant',
            content: 'Hi there!',
            timestamp: Date.now(),
          },
        ],
      };

      session.import(sessionData);

      const exported = session.export();
      expect(exported.metadata.id).toBe('session_123');
      expect(exported.history).toHaveLength(2);
    });

    test('should import session data correctly', () => {
      const session = new Session();

      const sessionData: Claude.SessionData = {
        metadata: {
          id: 'session_456',
          created_at: Date.now(),
          last_active: Date.now(),
          turns: 1,
          total_cost_usd: 0.001,
        },
        history: [
          {
            role: 'user',
            content: 'Test',
            timestamp: Date.now(),
          },
        ],
      };

      session.import(sessionData);

      expect(session.getSessionId()).toBe('session_456');
      expect(session.getHistory()).toHaveLength(1);
      expect(session.getMetadata()?.turns).toBe(1);
    });
  });
});

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  describe('create', () => {
    test('should create a new session', () => {
      const session = manager.create();
      expect(session).toBeInstanceOf(Session);
    });

    test('should create session with options', () => {
      const session = manager.create({
        allowedTools: ['Bash'],
        verbose: true,
      });
      expect(session).toBeInstanceOf(Session);
    });
  });

  describe('resume', () => {
    test('should resume a session by ID', () => {
      const session = manager.resume('session_123');
      expect(session.getSessionId()).toBe('session_123');
    });

    test('should store resumed session', () => {
      const session = manager.resume('session_123');
      const retrieved = manager.get('session_123');
      expect(retrieved).toBe(session);
    });
  });

  describe('continue', () => {
    test('should create continue session', () => {
      const session = manager.continue();
      expect(session).toBeInstanceOf(Session);
    });
  });

  describe('get', () => {
    test('should retrieve session by ID', () => {
      const session = manager.resume('session_123');
      const retrieved = manager.get('session_123');
      expect(retrieved).toBe(session);
    });

    test('should return undefined for non-existent session', () => {
      const session = manager.get('nonexistent');
      expect(session).toBeUndefined();
    });
  });

  describe('getLast', () => {
    test('should return undefined when no sessions', () => {
      const last = manager.getLast();
      expect(last).toBeUndefined();
    });

    test('should return last resumed session', () => {
      manager.resume('session_123');
      const session2 = manager.resume('session_456');
      const last = manager.getLast();
      expect(last).toBe(session2);
    });
  });

  describe('delete', () => {
    test('should delete a session', () => {
      manager.resume('session_123');
      const deleted = manager.delete('session_123');
      expect(deleted).toBe(true);
      expect(manager.get('session_123')).toBeUndefined();
    });

    test('should return false for non-existent session', () => {
      const deleted = manager.delete('nonexistent');
      expect(deleted).toBe(false);
    });

    test('should clear last session ID when deleting last session', () => {
      manager.resume('session_123');
      manager.delete('session_123');
      expect(manager.getLast()).toBeUndefined();
    });
  });

  describe('clear', () => {
    test('should clear all sessions', () => {
      manager.resume('session_123');
      manager.resume('session_456');
      manager.clear();
      expect(manager.list()).toHaveLength(0);
      expect(manager.getLast()).toBeUndefined();
    });
  });

  describe('list', () => {
    test('should return empty array when no sessions', () => {
      const list = manager.list();
      expect(list).toHaveLength(0);
    });

    test('should list all session IDs', () => {
      manager.resume('session_123');
      manager.resume('session_456');
      const list = manager.list();
      expect(list).toHaveLength(2);
      expect(list).toContain('session_123');
      expect(list).toContain('session_456');
    });
  });
});
