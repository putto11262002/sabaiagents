# Tool Library

Unified tool system for Claude Code agents supporting three types of tools:

1. **Built-in Tools** - Claude Code's native tools (Read, Write, Bash, etc.)
2. **MCP Tools** - Tools from Model Context Protocol servers
3. **Command Tools** - System commands wrapped as tools

## Architecture

```
lib/
├── tool/           # Core tool system
│   ├── types.ts           # Tool type definitions
│   ├── registry.ts        # Tool registry
│   ├── adapters/          # Tool adapters
│   ├── builders/          # Tool builders
│   └── presets/           # Pre-configured tool sets
│
├── mcp/            # MCP manager and gateway
│   ├── types.ts           # MCP type definitions
│   ├── manager.ts         # MCP server management
│   ├── gateway.ts         # MCP gateway/proxy
│   ├── router.ts          # Tool routing
│   └── config-writer.ts   # MCP config file writer
│
└── index.ts        # Main exports
```

## Quick Start

### 1. Tool Registry

```typescript
import { createRegistry, ToolBuilders } from './lib/index.js';

// Create registry
const registry = createRegistry();

// Register built-in tool
const readTool = ToolBuilders.fromClaudeTool('Read');
registry.register(readTool);

// Register MCP tool
const githubTool = ToolBuilders.createMcpTool({
  id: 'github-issues',
  name: 'GitHub Issues',
  description: 'Query GitHub issues',
  serverName: 'github',
  toolName: 'list_issues',
  mcpConfig: {
    command: 'npx',
    args: ['-y', '@anthropic-ai/mcp-server-github'],
  },
});
registry.register(githubTool);

// Register command tool
const gitStatus = ToolBuilders.createGitTool(
  'git-status',
  'Git Status',
  'Get repository status',
  ['status', '--short']
);
registry.register(gitStatus);

// Query tools
const allTools = registry.list();
const mcpTools = registry.getByType('mcp');
```

### 2. MCP Manager

```typescript
import { createManager } from './lib/index.js';

// Create manager
const manager = createManager();

// Add MCP servers
manager.addServer('github', {
  command: 'npx',
  args: ['-y', '@anthropic-ai/mcp-server-github'],
  env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN },
});

// Create gateway
const gateway = manager.createGateway({
  name: 'devops-tools',
  tools: ['github-issues', 'github-pr'],
});

// Get MCP config
const mcpConfig = gateway.getMcpConfig();
```

### 3. Tool-Enhanced Agent

```typescript
import { Session } from './src/core/session/index.js';
import { createToolAgent } from './src/core/agent/index.js';
import { createRegistry, ToolBuilders } from './lib/index.js';

// Setup
const sessionStore = Session.createStore('./sessions.db');
const registry = createRegistry();

// Register tools
const tools = ToolBuilders.fromClaudeTools(['Read', 'Write', 'Bash']);
tools.forEach(tool => registry.register(tool));

// Create agent
const agent = createToolAgent({
  name: 'code-assistant',
  cwd: process.cwd(),
  sessionStore,
  tools: {
    registry,
    allowed: ['read', 'write', 'bash'],
  },
});

// Use agent
const result = await agent.run('Read README and summarize');
```

## Features

### Tool Registry
- Register and manage tools of different types
- Query tools by type, category, or tags
- Filter tools with flexible criteria

### MCP Manager
- Add and manage MCP servers
- Create gateways to group tools
- Route tool calls to appropriate servers
- Generate MCP config files

### Tool Adapters
- Validate tool definitions
- Adapt tools for execution
- Generate Claude Code configuration

### Tool Builders
- Helper functions for creating tools
- Support for presets (readonly, codeEditor, etc.)
- Bulk tool creation

### Agent Integration
- Seamless integration with existing Agent system
- Dynamic tool configuration
- Runtime tool resolution
- Backward compatible with legacy config

## Examples

See the `examples/` directory for detailed usage examples:

- `tool-library-basic.ts` - Basic tool registry usage
- `mcp-manager-basic.ts` - MCP manager basics
- `tool-agent-basic.ts` - Tool-enhanced agents
- `mcp-gateway-advanced.ts` - Advanced MCP gateway usage

## API Reference

### Tool Namespace

```typescript
namespace Tool {
  interface Registry {
    register(tool: AnyTool): void;
    unregister(id: string): boolean;
    get(id: string): AnyTool | null;
    list(filter?: ToolFilter): AnyTool[];
    getByType(type: 'builtin' | 'mcp' | 'command'): AnyTool[];
    has(id: string): boolean;
    clear(): void;
  }
}
```

### MCP Namespace

```typescript
namespace Mcp {
  interface Manager {
    addServer(name: string, config: McpServerConfig): void;
    removeServer(name: string): boolean;
    getServer(name: string): McpServerConfig | null;
    listServers(): Record<string, McpServerConfig>;
    createGateway(config: GatewayConfig): Gateway;
    listGateways(): Gateway[];
  }

  interface Gateway {
    readonly id: string;
    readonly name: string;
    readonly tools: readonly string[];
    getMcpConfig(): McpServerConfig;
    addTool(toolId: string): void;
    removeTool(toolId: string): void;
  }
}
```

## Design Decisions

1. **Namespace Pattern** - Follows existing codebase patterns (Tool, Mcp namespaces)
2. **Type Safety** - Full TypeScript support with strict typing
3. **Adapter Pattern** - Each tool type has dedicated adapter
4. **Registry-Based** - Central registry for tool discovery
5. **Gateway Flexibility** - Multiple gateways with different tool combinations
6. **Backward Compatible** - Works with existing claudeConfig

## Future Enhancements

- [ ] MCP proxy server implementation
- [ ] Tool discovery from MCP servers
- [ ] Tool execution through command adapter
- [ ] Tool validation schemas
- [ ] Tool permissions system
- [ ] Tool usage analytics
