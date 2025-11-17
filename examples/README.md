# Claude Code Headless Mode Examples

This directory contains comprehensive examples demonstrating the Claude Code headless mode client library.

## Prerequisites

- Claude Code CLI installed and authenticated
- Bun runtime

## Running Examples

```bash
# Basic text query
bun examples/basic-query.ts

# JSON output format
bun examples/json-output.ts

# Streaming responses
bun examples/streaming.ts

# Multi-turn conversations
bun examples/multi-turn.ts

# Tool configuration
bun examples/tool-usage.ts

# Session resumption
bun examples/session-resume.ts

# MCP integration (requires MCP config)
bun examples/mcp-integration.ts

# Incident response automation
bun examples/incident-response.ts
```

## Example Descriptions

### basic-query.ts
Simple text-based queries showing the most basic usage pattern.

### json-output.ts
Demonstrates JSON output format to get structured responses with metadata like cost, duration, and session ID.

### streaming.ts
Real-time streaming of Claude's response as it's generated, useful for providing immediate feedback to users.

### multi-turn.ts
Session-based multi-turn conversations with context preservation across multiple queries.

### tool-usage.ts
Configuring allowed and disallowed tools to control Claude's capabilities.

### session-resume.ts
Resuming previous sessions and continuing conversations, with session export/import for persistence.

### mcp-integration.ts
Using Model Context Protocol (MCP) servers for enhanced integrations (Datadog, Slack, GitHub, etc.).

### incident-response.ts
Real-world automation scenario showing incident analysis and response recommendations.

## Notes

- Some examples may incur API costs
- MCP examples require additional configuration files
- Tool usage examples may interact with your file system
