/**
 * Tests for process management
 */

import { describe, test, expect } from 'vitest';
import { buildArgs, checkClaudeAvailable } from '../../src/claude/process.js';
import type { Claude } from '../../src/claude/types.js';

describe('Process Management', () => {
  describe('buildArgs', () => {
    test('should build basic args with prompt', () => {
      const args = buildArgs('Hello, Claude!');

      expect(args).toContain('--print');
      expect(args).toContain('Hello, Claude!');
    });

    test('should include output format', () => {
      const options: Claude.QueryOptions = {
        outputFormat: 'json',
      };

      const args = buildArgs('Test', options);

      expect(args).toContain('--output-format=json');
    });

    test('should include input format for streaming', () => {
      const options: Claude.StreamOptions = {
        outputFormat: 'stream-json',
        inputFormat: 'stream-json',
      };

      const args = buildArgs('Test', options);

      expect(args).toContain('--output-format=stream-json');
      expect(args).toContain('--input-format=stream-json');
    });

    test('should include session ID for resume', () => {
      const options: Claude.SessionOptions = {
        sessionId: 'session_123',
      };

      const args = buildArgs('Test', options);

      expect(args).toContain('--resume');
      expect(args).toContain('session_123');
    });

    test('should include continue flag', () => {
      const options: Claude.SessionOptions = {
        continue: true,
      };

      const args = buildArgs('Test', options);

      expect(args).toContain('--continue');
    });

    test('should include allowed tools', () => {
      const options: Claude.QueryOptions = {
        allowedTools: ['Bash', 'Read', 'Grep'],
      };

      const args = buildArgs('Test', options);

      const toolsArg = args.find(arg => arg.startsWith('--allowedTools='));
      expect(toolsArg).toBeDefined();
      expect(toolsArg).toContain('Bash');
      expect(toolsArg).toContain('Read');
      expect(toolsArg).toContain('Grep');
    });

    test('should include disallowed tools', () => {
      const options: Claude.QueryOptions = {
        disallowedTools: ['WebSearch', 'WebFetch'],
      };

      const args = buildArgs('Test', options);

      const toolsArg = args.find(arg => arg.startsWith('--disallowedTools='));
      expect(toolsArg).toBeDefined();
      expect(toolsArg).toContain('WebSearch');
      expect(toolsArg).toContain('WebFetch');
    });

    test('should include MCP config', () => {
      const options: Claude.QueryOptions = {
        mcpConfig: './mcp-config.json',
      };

      const args = buildArgs('Test', options);

      expect(args).toContain('--mcp-config=./mcp-config.json');
    });

    test('should include permission settings', () => {
      const options: Claude.QueryOptions = {
        permissionMode: 'acceptEdits',
        permissionPromptTool: 'permission-handler',
      };

      const args = buildArgs('Test', options);

      expect(args).toContain('--permission-mode=acceptEdits');
      expect(args).toContain('--permission-prompt-tool=permission-handler');
    });

    test('should include system prompt', () => {
      const options: Claude.QueryOptions = {
        appendSystemPrompt: 'You are a helpful assistant.',
      };

      const args = buildArgs('Test', options);

      expect(args).toContain('--append-system-prompt=You are a helpful assistant.');
    });

    test('should include verbose flag', () => {
      const options: Claude.QueryOptions = {
        verbose: true,
      };

      const args = buildArgs('Test', options);

      expect(args).toContain('--verbose');
    });

    test('should include no-interactive flag', () => {
      const options: Claude.QueryOptions = {
        noInteractive: true,
      };

      const args = buildArgs('Test', options);

      expect(args).toContain('--no-interactive');
    });

    test('should handle null prompt for stdin mode', () => {
      const args = buildArgs(null);

      expect(args).toContain('--print');
      expect(args).not.toContain('null');
      // Should not have a prompt argument
      expect(args.filter(arg => !arg.startsWith('--'))).toHaveLength(0);
    });

    test('should build complete args with all options', () => {
      const options: Claude.QueryOptions = {
        outputFormat: 'json',
        allowedTools: ['Bash', 'Read'],
        disallowedTools: ['WebSearch'],
        mcpConfig: './mcp.json',
        verbose: true,
        noInteractive: true,
        appendSystemPrompt: 'Custom prompt',
        permissionMode: 'acceptEdits',
      };

      const args = buildArgs('Test query', options);

      // Should contain all expected flags
      expect(args).toContain('--print');
      expect(args).toContain('--output-format=json');
      expect(args).toContain('--verbose');
      expect(args).toContain('--no-interactive');
      expect(args).toContain('Test query');

      // Should have tools configuration
      const allowedTools = args.find(arg => arg.startsWith('--allowedTools='));
      const disallowedTools = args.find(arg => arg.startsWith('--disallowedTools='));
      expect(allowedTools).toBeDefined();
      expect(disallowedTools).toBeDefined();
    });
  });

  describe('checkClaudeAvailable', () => {
    test('should check if claude CLI is available', async () => {
      const available = await checkClaudeAvailable();
      // Result depends on environment, just check it's a boolean
      expect(typeof available).toBe('boolean');
    });
  });
});
