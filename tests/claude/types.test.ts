/**
 * Tests for type definitions
 */

import { describe, test, expect } from 'vitest';
import type { Claude } from '../../src/claude/types.js';

describe('Claude Types', () => {
  describe('Message Content Types', () => {
    test('TextContent should have correct shape', () => {
      const content: Claude.TextContent = {
        type: 'text',
        text: 'Hello, world!',
      };

      expect(content.type).toBe('text');
      expect(content.text).toBe('Hello, world!');
    });

    test('ToolUseContent should have correct shape', () => {
      const content: Claude.ToolUseContent = {
        type: 'tool_use',
        id: 'tool_123',
        name: 'Bash',
        input: { command: 'ls -la' },
      };

      expect(content.type).toBe('tool_use');
      expect(content.id).toBe('tool_123');
      expect(content.name).toBe('Bash');
      expect(content.input.command).toBe('ls -la');
    });

    test('ToolResultContent should have correct shape', () => {
      const content: Claude.ToolResultContent = {
        type: 'tool_result',
        tool_use_id: 'tool_123',
        content: 'Command output',
        is_error: false,
      };

      expect(content.type).toBe('tool_result');
      expect(content.tool_use_id).toBe('tool_123');
      expect(content.is_error).toBe(false);
    });

    test('ThinkingContent should have correct shape', () => {
      const content: Claude.ThinkingContent = {
        type: 'thinking',
        thinking: 'Let me think about this...',
      };

      expect(content.type).toBe('thinking');
      expect(content.thinking).toBe('Let me think about this...');
    });
  });

  describe('Stream Message Types', () => {
    test('InitMessage should have correct shape', () => {
      const message: Claude.InitMessage = {
        type: 'init',
        subtype: 'start',
        session_id: 'session_123',
        timestamp: Date.now(),
      };

      expect(message.type).toBe('init');
      expect(message.subtype).toBe('start');
      expect(message.session_id).toBe('session_123');
    });

    test('ResultMessage should have correct shape', () => {
      const message: Claude.ResultMessage = {
        type: 'result',
        subtype: 'success',
        total_cost_usd: 0.001,
        is_error: false,
        duration_ms: 1000,
        duration_api_ms: 800,
        num_turns: 1,
        result: 'The answer is 42',
        session_id: 'session_123',
      };

      expect(message.type).toBe('result');
      expect(message.subtype).toBe('success');
      expect(message.is_error).toBe(false);
      expect(message.total_cost_usd).toBe(0.001);
    });

    test('ErrorMessage should have correct shape', () => {
      const message: Claude.ErrorMessage = {
        type: 'error',
        error: 'Something went wrong',
        error_code: 'UNKNOWN_ERROR',
      };

      expect(message.type).toBe('error');
      expect(message.error).toBe('Something went wrong');
      expect(message.error_code).toBe('UNKNOWN_ERROR');
    });

    test('UserMessage should have correct shape', () => {
      const message: Claude.UserMessage = {
        type: 'user',
        message: {
          role: 'user',
          content: 'Hello!',
        },
      };

      expect(message.type).toBe('user');
      expect(message.message.role).toBe('user');
      expect(message.message.content).toBe('Hello!');
    });

    test('AssistantMessage should have correct shape', () => {
      const message: Claude.AssistantMessage = {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Hello!' },
          ],
        },
      };

      expect(message.type).toBe('assistant');
      expect(message.message.role).toBe('assistant');
      expect(message.message.content).toHaveLength(1);
    });
  });

  describe('Response Types', () => {
    test('TextResponse should have correct shape', () => {
      const response: Claude.TextResponse = {
        format: 'text',
        text: 'Response text',
        exitCode: 0,
      };

      expect(response.format).toBe('text');
      expect(response.text).toBe('Response text');
      expect(response.exitCode).toBe(0);
    });

    test('JsonResponse should have correct shape', () => {
      const response: Claude.JsonResponse = {
        format: 'json',
        type: 'result',
        subtype: 'success',
        total_cost_usd: 0.001,
        is_error: false,
        duration_ms: 1000,
        duration_api_ms: 800,
        num_turns: 1,
        result: 'The answer',
        session_id: 'session_123',
        exitCode: 0,
      };

      expect(response.format).toBe('json');
      expect(response.type).toBe('result');
      expect(response.session_id).toBe('session_123');
    });
  });

  describe('Options Types', () => {
    test('QueryOptions should allow all expected fields', () => {
      const options: Claude.QueryOptions = {
        outputFormat: 'json',
        verbose: true,
        appendSystemPrompt: 'Custom prompt',
        allowedTools: ['Bash', 'Read'],
        disallowedTools: ['WebSearch'],
        timeout: 30000,
        cwd: '/tmp',
      };

      expect(options.outputFormat).toBe('json');
      expect(options.verbose).toBe(true);
      expect(options.allowedTools).toHaveLength(2);
    });

    test('StreamOptions should require stream-json format', () => {
      const options: Claude.StreamOptions = {
        outputFormat: 'stream-json',
        inputFormat: 'stream-json',
      };

      expect(options.outputFormat).toBe('stream-json');
      expect(options.inputFormat).toBe('stream-json');
    });

    test('SessionOptions should allow session configuration', () => {
      const options: Claude.SessionOptions = {
        sessionId: 'session_123',
        continue: false,
        allowedTools: ['Bash'],
      };

      expect(options.sessionId).toBe('session_123');
      expect(options.continue).toBe(false);
    });
  });
});
