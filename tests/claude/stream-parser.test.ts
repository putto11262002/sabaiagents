/**
 * Tests for stream parser
 */

import { describe, test, expect } from 'vitest';
import {
  parseLine,
  filterMessages,
  getResult,
  getUserMessages,
  getAssistantMessages,
  extractText,
  extractThinking,
  extractToolUses,
  createUserInput,
  createStreamInput,
  validateMessage,
} from '../../src/claude/stream-parser.js';
import type { Claude } from '../../src/claude/types.js';
import { ClaudeParseError } from '../../src/claude/error.js';

describe('Stream Parser', () => {
  describe('parseLine', () => {
    test('should parse valid init message', () => {
      const line = '{"type":"init","subtype":"start","session_id":"session_123"}';
      const message = parseLine(line);

      expect(message).not.toBeNull();
      expect(message?.type).toBe('init');
    });

    test('should parse valid user message', () => {
      const line = '{"type":"user","message":{"role":"user","content":"Hello"}}';
      const message = parseLine(line);

      expect(message).not.toBeNull();
      expect(message?.type).toBe('user');
    });

    test('should parse valid assistant message', () => {
      const line = '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Hi"}]}}';
      const message = parseLine(line);

      expect(message).not.toBeNull();
      expect(message?.type).toBe('assistant');
    });

    test('should parse valid result message', () => {
      const line = '{"type":"result","subtype":"success","total_cost_usd":0.001,"is_error":false,"duration_ms":1000,"duration_api_ms":800,"num_turns":1,"result":"Done","session_id":"session_123"}';
      const message = parseLine(line);

      expect(message).not.toBeNull();
      expect(message?.type).toBe('result');

      const result = message as Claude.ResultMessage;
      expect(result.subtype).toBe('success');
      expect(result.total_cost_usd).toBe(0.001);
    });

    test('should return null for empty line', () => {
      const message = parseLine('');
      expect(message).toBeNull();
    });

    test('should throw error for invalid JSON', () => {
      expect(() => parseLine('invalid json')).toThrow(ClaudeParseError);
    });

    test('should throw error for JSON without type field', () => {
      expect(() => parseLine('{"data":"value"}')).toThrow(ClaudeParseError);
    });
  });

  describe('filterMessages', () => {
    const messages: Claude.StreamMessage[] = [
      { type: 'init', subtype: 'start' },
      { type: 'user', message: { role: 'user', content: 'Hello' } },
      { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'Hi' }] } },
      {
        type: 'result',
        subtype: 'success',
        total_cost_usd: 0.001,
        is_error: false,
        duration_ms: 1000,
        duration_api_ms: 800,
        num_turns: 1,
        result: 'Done',
        session_id: 'session_123',
      },
    ];

    test('should filter user messages', () => {
      const userMessages = filterMessages(messages, 'user');
      expect(userMessages).toHaveLength(1);
      expect(userMessages[0]?.type).toBe('user');
    });

    test('should filter assistant messages', () => {
      const assistantMessages = filterMessages(messages, 'assistant');
      expect(assistantMessages).toHaveLength(1);
      expect(assistantMessages[0]?.type).toBe('assistant');
    });

    test('should filter result messages', () => {
      const resultMessages = filterMessages(messages, 'result');
      expect(resultMessages).toHaveLength(1);
      expect(resultMessages[0]?.type).toBe('result');
    });

    test('should return empty array for non-existent type', () => {
      const errorMessages = filterMessages(messages, 'error');
      expect(errorMessages).toHaveLength(0);
    });
  });

  describe('getResult', () => {
    test('should extract result message', () => {
      const messages: Claude.StreamMessage[] = [
        { type: 'user', message: { role: 'user', content: 'Hello' } },
        {
          type: 'result',
          subtype: 'success',
          total_cost_usd: 0.001,
          is_error: false,
          duration_ms: 1000,
          duration_api_ms: 800,
          num_turns: 1,
          result: 'Done',
          session_id: 'session_123',
        },
      ];

      const result = getResult(messages);
      expect(result).not.toBeNull();
      expect(result?.session_id).toBe('session_123');
    });

    test('should return null when no result exists', () => {
      const messages: Claude.StreamMessage[] = [
        { type: 'user', message: { role: 'user', content: 'Hello' } },
      ];

      const result = getResult(messages);
      expect(result).toBeNull();
    });
  });

  describe('extractText', () => {
    test('should extract text from string content', () => {
      const text = extractText('Hello, world!');
      expect(text).toBe('Hello, world!');
    });

    test('should extract text from content blocks', () => {
      const content: Claude.ContentBlock[] = [
        { type: 'text', text: 'Hello' },
        { type: 'text', text: 'World' },
      ];

      const text = extractText(content);
      expect(text).toBe('Hello\nWorld');
    });

    test('should ignore non-text blocks', () => {
      const content: Claude.ContentBlock[] = [
        { type: 'text', text: 'Hello' },
        { type: 'thinking', thinking: 'Hmm...' },
        { type: 'text', text: 'World' },
      ];

      const text = extractText(content);
      expect(text).toBe('Hello\nWorld');
    });
  });

  describe('extractThinking', () => {
    test('should extract thinking blocks', () => {
      const content: Claude.ContentBlock[] = [
        { type: 'text', text: 'Hello' },
        { type: 'thinking', thinking: 'Let me think...' },
        { type: 'thinking', thinking: 'I understand now.' },
      ];

      const thinking = extractThinking(content);
      expect(thinking).toHaveLength(2);
      expect(thinking[0]).toBe('Let me think...');
      expect(thinking[1]).toBe('I understand now.');
    });

    test('should return empty array when no thinking blocks', () => {
      const content: Claude.ContentBlock[] = [
        { type: 'text', text: 'Hello' },
      ];

      const thinking = extractThinking(content);
      expect(thinking).toHaveLength(0);
    });
  });

  describe('extractToolUses', () => {
    test('should extract tool use blocks', () => {
      const content: Claude.ContentBlock[] = [
        { type: 'text', text: 'Let me check...' },
        { type: 'tool_use', id: 'tool_1', name: 'Bash', input: { command: 'ls' } },
        { type: 'tool_use', id: 'tool_2', name: 'Read', input: { file: 'test.txt' } },
      ];

      const tools = extractToolUses(content);
      expect(tools).toHaveLength(2);
      expect(tools[0]?.name).toBe('Bash');
      expect(tools[1]?.name).toBe('Read');
    });
  });

  describe('createUserInput', () => {
    test('should create user input from string', () => {
      const input = createUserInput('Hello, Claude!');
      const parsed = JSON.parse(input);

      expect(parsed.type).toBe('user');
      expect(parsed.message.role).toBe('user');
      expect(parsed.message.content).toBe('Hello, Claude!');
    });

    test('should create user input from content blocks', () => {
      const content: Claude.ContentBlock[] = [
        { type: 'text', text: 'Hello' },
      ];

      const input = createUserInput(content);
      const parsed = JSON.parse(input);

      expect(parsed.type).toBe('user');
      expect(parsed.message.content).toHaveLength(1);
    });
  });

  describe('createStreamInput', () => {
    test('should create stream input from messages', () => {
      const messages = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'user' as const, content: 'How are you?' },
      ];

      const input = createStreamInput(messages);
      const lines = input.split('\n');

      expect(lines).toHaveLength(2);

      const msg1 = JSON.parse(lines[0]!);
      const msg2 = JSON.parse(lines[1]!);

      expect(msg1.type).toBe('user');
      expect(msg2.type).toBe('user');
    });
  });

  describe('validateMessage', () => {
    test('should validate init message', () => {
      const message = { type: 'init', subtype: 'start' };
      expect(validateMessage(message)).toBe(true);
    });

    test('should validate user message', () => {
      const message = {
        type: 'user',
        message: { role: 'user', content: 'Hello' },
      };
      expect(validateMessage(message)).toBe(true);
    });

    test('should validate result message', () => {
      const message = {
        type: 'result',
        subtype: 'success',
        total_cost_usd: 0.001,
        is_error: false,
        duration_ms: 1000,
        duration_api_ms: 800,
        num_turns: 1,
        result: 'Done',
        session_id: 'session_123',
      };
      expect(validateMessage(message)).toBe(true);
    });

    test('should reject invalid message', () => {
      const message = { invalid: 'data' };
      expect(validateMessage(message)).toBe(false);
    });

    test('should reject non-object', () => {
      expect(validateMessage('string')).toBe(false);
      expect(validateMessage(null)).toBe(false);
      expect(validateMessage(undefined)).toBe(false);
    });
  });
});
