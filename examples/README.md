# Tool Library Examples

This directory contains examples demonstrating the unified tool library system.

## Examples

### 1. `tool-library-basic.ts`
Basic usage of the tool registry:
- Creating a tool registry
- Registering different types of tools (built-in, MCP, command)
- Querying and filtering tools
- Using tool presets

```bash
tsx examples/tool-library-basic.ts
```

### 2. `mcp-manager-basic.ts`
MCP manager basics:
- Creating an MCP manager
- Adding MCP servers
- Creating gateways to group tools
- Generating MCP configurations

```bash
tsx examples/mcp-manager-basic.ts
```

### 3. `tool-agent-basic.ts`
Tool-enhanced agents:
- Creating agents with the unified tool system
- Using built-in tools, MCP tools, and command tools together
- Dynamic tool configuration per run

```bash
tsx examples/tool-agent-basic.ts
```

### 4. `mcp-gateway-advanced.ts`
Advanced MCP gateway usage:
- Creating multiple gateways for different purposes
- Generating MCP config files
- Using router for tool routing

```bash
tsx examples/mcp-gateway-advanced.ts
```

## Tool Types

### Built-in Tools
Claude Code's native tools (Read, Write, Bash, etc.)

### MCP Tools
Tools from Model Context Protocol servers

### Command Tools
System commands wrapped as tools

## Environment Variables

Some examples require environment variables:
- `GITHUB_TOKEN` - for GitHub MCP server
- `LINEAR_API_KEY` - for Linear MCP server
- `SLACK_TOKEN` - for Slack MCP server
- `DATADOG_API_KEY` - for Datadog MCP server
- `DATADOG_APP_KEY` - for Datadog MCP server

## Notes

- Most examples have API calls commented out to avoid unintended execution
- Uncomment the relevant sections to test with actual APIs
- Make sure to set up required environment variables before running
