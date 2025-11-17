# Claude Code Headless Mode Client for Bun

A comprehensive TypeScript library for interacting with Claude Code in headless mode, built specifically for Bun runtime. This library provides a type-safe, feature-complete wrapper around the Claude CLI with full support for streaming, sessions, tool configuration, and MCP integrations.

## Features

- ✅ **Complete Type System** - Full TypeScript support with namespace organization
- ✅ **Multiple Output Formats** - Text, JSON, and stream-JSON
- ✅ **Session Management** - Multi-turn conversations with context preservation
- ✅ **Streaming Support** - Real-time response streaming with async iterators
- ✅ **Tool Configuration** - Fine-grained control over allowed/disallowed tools
- ✅ **MCP Integration** - Support for Model Context Protocol servers
- ✅ **Error Handling** - Custom error classes for different failure modes
- ✅ **Process Management** - Robust process lifecycle handling with timeouts
- ✅ **Session Persistence** - Export/import session data for long-running workflows
- ✅ **Bun-Native** - Built with Bun APIs (`Bun.$`, `Bun.file`, etc.)

## Prerequisites

- [Bun](https://bun.sh) runtime installed
- [Claude Code CLI](https://code.claude.com) installed and authenticated
- TypeScript 5.x

## Installation

```bash
bun install
```

## Quick Start

### Basic Query

```typescript
import { ClaudeClient } from './src/claude';

const client = new ClaudeClient();

// Simple text query
const response = await client.query('What is 2 + 2?');
console.log(response.text);
```

### JSON Output

```typescript
const response = await client.query('Explain TypeScript generics', {
  outputFormat: 'json',
});

if (response.format === 'json') {
  console.log('Cost:', response.total_cost_usd);
  console.log('Duration:', response.duration_ms);
  console.log('Response:', response.result);
}
```

### Streaming

```typescript
for await (const message of client.stream('Explain recursion')) {
  if (message.type === 'assistant') {
    const text = extractText(message.message.content);
    process.stdout.write(text);
  }
}
```

### Multi-Turn Conversations

```typescript
const session = client.createSession();

await session.send('My name is Alice');
await session.send('What is my name?'); // Claude remembers!

// Export session for persistence
const sessionData = session.export();

// Resume later
const newSession = client.createSession();
newSession.import(sessionData);
```

### Tool Configuration

```typescript
const response = await client.query('Read package.json', {
  allowedTools: ['Read', 'Bash'],
  disallowedTools: ['WebSearch'],
});
```

## API Reference

### ClaudeClient

Main client class for interacting with Claude Code.

#### Methods

- `query(prompt, options?)` - Execute a single query
- `stream(prompt, options?)` - Stream responses in real-time
- `processStdin(stdin, options?)` - Process input from stdin
- `createSession(initialPrompt?, options?)` - Create a new session
- `resumeSession(sessionId, options?)` - Resume an existing session
- `continueLastSession(options?)` - Continue the most recent session
- `isAvailable()` - Check if Claude CLI is available
- `getVersion()` - Get Claude CLI version

### Session

Session class for multi-turn conversations.

#### Methods

- `send(prompt, options?)` - Send a message in this session
- `stream(prompt, options?)` - Stream a message in this session
- `sendMultiple(messages, options?)` - Send multiple messages
- `getSessionId()` - Get current session ID
- `getMetadata()` - Get session metadata
- `getHistory()` - Get conversation history
- `export()` - Export session data
- `import(data)` - Import session data
- `clear()` - Clear session and start fresh

### Types

All types are organized under the `Claude` namespace:

```typescript
import type { Claude } from './src/claude';

// Options
Claude.QueryOptions
Claude.StreamOptions
Claude.SessionOptions

// Messages
Claude.StreamMessage
Claude.UserMessage
Claude.AssistantMessage
Claude.ResultMessage

// Content
Claude.ContentBlock
Claude.TextContent
Claude.ToolUseContent
Claude.ThinkingContent

// Response
Claude.Response
Claude.TextResponse
Claude.JsonResponse
Claude.StreamJsonResponse
```

### Error Classes

- `ClaudeError` - Base error class
- `ClaudeProcessError` - Process execution failures
- `ClaudeTimeoutError` - Operation timeouts
- `ClaudeParseError` - Stream parsing failures
- `ClaudeAPIError` - API-level errors
- `ClaudeSessionError` - Session operation failures
- `ClaudeConfigError` - Configuration errors

## Examples

Comprehensive examples are available in the `examples/` directory:

```bash
# Basic queries
bun examples/basic-query.ts

# JSON output with metadata
bun examples/json-output.ts

# Real-time streaming
bun examples/streaming.ts

# Multi-turn conversations
bun examples/multi-turn.ts

# Session resumption
bun examples/session-resume.ts

# Tool configuration
bun examples/tool-usage.ts

# MCP integration
bun examples/mcp-integration.ts

# Real-world automation
bun examples/incident-response.ts
```

## Testing

Run the test suite:

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/claude/client.test.ts

# Run integration tests (requires Claude CLI)
bun test tests/claude/integration.test.ts

# Type checking
bun run typecheck
```

## Architecture

```
src/claude/
├── index.ts              # Main exports
├── types.ts              # TypeScript namespace with all types
├── client.ts             # ClaudeClient class
├── process.ts            # Process spawning and management
├── stream-parser.ts      # Stream-JSON parser
├── session-manager.ts    # Session management
└── error.ts              # Custom error classes
```

## Development

```bash
# Install dependencies
bun install

# Run type checking
bun run typecheck

# Run tests
bun test

# Build
bun run build
```

## Configuration

### MCP Servers

Create an `mcp-config.json` file:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-github"],
      "env": {
        "GITHUB_TOKEN": "your-token"
      }
    }
  }
}
```

Use with:

```typescript
const response = await client.query('Check my GitHub issues', {
  mcpConfig: './mcp-config.json',
});
```

## Best Practices

1. **Use JSON output** for programmatic parsing and metadata
2. **Use streaming** for long responses to provide immediate feedback
3. **Use sessions** for multi-turn conversations to maintain context
4. **Configure tools** to limit Claude's capabilities based on your use case
5. **Handle errors** with try-catch and specific error types
6. **Set timeouts** for long-running operations
7. **Export sessions** for persistence across process restarts

## Performance

- Built with Bun for maximum performance
- Streaming support for immediate response feedback
- Efficient process management with proper cleanup
- Type-safe with zero runtime overhead

## Contributing

Contributions are welcome! Please ensure:

- All tests pass (`bun test`)
- Type checking passes (`bun run typecheck`)
- Code follows the existing style
- New features include tests and examples

## License

MIT

## Acknowledgments

Built for use with [Claude Code](https://code.claude.com) by Anthropic.
