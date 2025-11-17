/**
 * Type definitions for Claude Code Headless Mode
 * All types are organized under the Claude namespace
 */

export namespace Claude {
  // ============= CLI Options =============

  /**
   * Base options available for all Claude CLI invocations
   */
  export interface BaseOptions {
    /** Enable verbose logging output */
    verbose?: boolean;
    /** Append custom text to the system prompt (only with --print) */
    appendSystemPrompt?: string;
    /** Path to MCP server configuration JSON file */
    mcpConfig?: string;
    /** MCP tool name for handling permission requests */
    permissionPromptTool?: string;
    /** Permission mode (e.g., 'acceptEdits') */
    permissionMode?: string;
    /** Disable interactive prompts */
    noInteractive?: boolean;
  }

  /**
   * Tool configuration options
   */
  export interface ToolOptions {
    /** List of allowed tools (space or comma-separated) */
    allowedTools?: string[];
    /** List of disallowed tools (space or comma-separated) */
    disallowedTools?: string[];
  }

  /**
   * Options for query operations
   */
  export interface QueryOptions extends BaseOptions, ToolOptions {
    /** Output format: text, json, or stream-json */
    outputFormat?: 'text' | 'json' | 'stream-json';
    /** Custom timeout in milliseconds */
    timeout?: number;
    /** Working directory for the claude process */
    cwd?: string;
  }

  /**
   * Options for streaming operations
   */
  export interface StreamOptions extends BaseOptions, ToolOptions {
    /** Output format (must be stream-json for streaming) */
    outputFormat: 'stream-json';
    /** Input format for multi-turn streaming */
    inputFormat?: 'stream-json';
    /** Session ID to resume (mutually exclusive with continue) */
    sessionId?: string;
    /** Continue the most recent session */
    continue?: boolean;
    /** Custom timeout in milliseconds */
    timeout?: number;
    /** Working directory for the claude process */
    cwd?: string;
  }

  /**
   * Options for session-based operations
   */
  export interface SessionOptions extends BaseOptions, ToolOptions {
    /** Session ID to resume (mutually exclusive with continue) */
    sessionId?: string;
    /** Continue the most recent session */
    continue?: boolean;
    /** Custom timeout in milliseconds */
    timeout?: number;
    /** Working directory for the claude process */
    cwd?: string;
  }

  // ============= Message Content Types =============

  /**
   * Text content block
   */
  export interface TextContent {
    type: 'text';
    text: string;
  }

  /**
   * Tool use content block (Claude calling a tool)
   */
  export interface ToolUseContent {
    type: 'tool_use';
    id: string;
    name: string;
    input: Record<string, unknown>;
  }

  /**
   * Tool result content block (result of a tool execution)
   */
  export interface ToolResultContent {
    type: 'tool_result';
    tool_use_id: string;
    content: string | Array<{ type: string; [key: string]: unknown }>;
    is_error?: boolean;
  }

  /**
   * Thinking content block (Claude's reasoning process)
   */
  export interface ThinkingContent {
    type: 'thinking';
    thinking: string;
  }

  /**
   * Image content block
   */
  export interface ImageContent {
    type: 'image';
    source: {
      type: 'base64' | 'url';
      media_type: string;
      data?: string;
      url?: string;
    };
  }

  /**
   * Union type for all content blocks
   */
  export type ContentBlock =
    | TextContent
    | ToolUseContent
    | ToolResultContent
    | ThinkingContent
    | ImageContent;

  // ============= Message Types =============

  /**
   * Generic message structure
   */
  export interface Message {
    role: 'user' | 'assistant';
    content: ContentBlock[] | string;
  }

  /**
   * User message in stream-JSON format
   */
  export interface UserMessage {
    type: 'user';
    message: {
      role: 'user';
      content: ContentBlock[] | string;
    };
  }

  /**
   * Assistant message in stream-JSON format
   */
  export interface AssistantMessage {
    type: 'assistant';
    message: {
      role: 'assistant';
      content: ContentBlock[];
    };
  }

  // ============= Stream-JSON Message Types =============

  /**
   * Initial message when starting a stream
   */
  export interface InitMessage {
    type: 'init';
    subtype: 'start';
    session_id?: string;
    timestamp?: number;
  }

  /**
   * Result message with statistics (final message in stream)
   */
  export interface ResultMessage {
    type: 'result';
    subtype: 'success' | 'error';
    total_cost_usd: number;
    is_error: boolean;
    duration_ms: number;
    duration_api_ms: number;
    num_turns: number;
    result: string;
    session_id: string;
  }

  /**
   * Error message
   */
  export interface ErrorMessage {
    type: 'error';
    error: string;
    error_code?: string;
    details?: unknown;
  }

  /**
   * Union type for all stream messages
   */
  export type StreamMessage =
    | InitMessage
    | UserMessage
    | AssistantMessage
    | ResultMessage
    | ErrorMessage;

  // ============= Response Types =============

  /**
   * Response from a text-format query
   */
  export interface TextResponse {
    format: 'text';
    text: string;
    exitCode: number;
  }

  /**
   * Response from a JSON-format query
   */
  export interface JsonResponse {
    format: 'json';
    type: 'result';
    subtype: 'success' | 'error';
    total_cost_usd: number;
    is_error: boolean;
    duration_ms: number;
    duration_api_ms: number;
    num_turns: number;
    result: string;
    session_id: string;
    exitCode: number;
  }

  /**
   * Response from a stream-JSON query
   */
  export interface StreamJsonResponse {
    format: 'stream-json';
    messages: StreamMessage[];
    final: ResultMessage;
    exitCode: number;
  }

  /**
   * Union type for all response types
   */
  export type Response = TextResponse | JsonResponse | StreamJsonResponse;

  // ============= Session Management =============

  /**
   * Session metadata
   */
  export interface SessionMetadata {
    id: string;
    created_at: number;
    last_active: number;
    turns: number;
    total_cost_usd: number;
  }

  /**
   * Session conversation history item
   */
  export interface ConversationTurn {
    role: 'user' | 'assistant';
    content: ContentBlock[] | string;
    timestamp: number;
  }

  /**
   * Session data structure
   */
  export interface SessionData {
    metadata: SessionMetadata;
    history: ConversationTurn[];
  }

  // ============= Process Types =============

  /**
   * Process execution result
   */
  export interface ProcessResult {
    stdout: string;
    stderr: string;
    exitCode: number;
  }

  /**
   * Stream processor callback
   */
  export type StreamCallback = (message: StreamMessage) => void | Promise<void>;

  // ============= MCP Configuration =============

  /**
   * MCP server configuration
   */
  export interface McpServerConfig {
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }

  /**
   * MCP configuration file structure
   */
  export interface McpConfig {
    mcpServers?: Record<string, McpServerConfig>;
  }

  // ============= Tool Specification =============

  /**
   * Tool specification with parameters
   */
  export interface ToolSpec {
    name: string;
    parameters?: Record<string, unknown>;
  }

  // ============= Parser Types =============

  /**
   * Stream parser state
   */
  export interface ParserState {
    buffer: string;
    messages: StreamMessage[];
    complete: boolean;
  }
}
