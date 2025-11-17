/**
 * CodeMirror 6 Prompt Editor
 *
 * A markdown-based prompt editor with custom syntax highlighting and autocomplete for:
 * - {variables} - Template variables like {now}, {user}, {date}
 * - @commands - Slash commands like @search, @analyze
 * - tools: - Tool declarations like tools: search, analyze
 *
 * Architecture:
 * 1. Base markdown language support
 * 2. Custom syntax highlighting via ViewPlugin decorations
 * 3. Multiple autocomplete sources for different triggers
 * 4. Custom theme for syntax elements
 */

import { EditorState } from '@codemirror/state';
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { autocompletion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// ============================================================================
// DATA: Mock data for autocomplete suggestions
// ============================================================================

/**
 * Available template variables
 * In a real application, these would come from your backend/context
 */
const AVAILABLE_VARIABLES = [
  { name: '{now}', description: 'Current date and time (ISO 8601)', example: '2024-03-15T10:30:00Z' },
  { name: '{date}', description: 'Current date (YYYY-MM-DD)', example: '2024-03-15' },
  { name: '{time}', description: 'Current time (HH:MM:SS)', example: '10:30:00' },
  { name: '{user}', description: 'Current user name', example: 'john_doe' },
  { name: '{session_id}', description: 'Current session identifier', example: 'abc123xyz' },
  { name: '{model}', description: 'AI model being used', example: 'claude-sonnet-4.5' }
];

/**
 * Available slash commands
 * In a real application, these would be dynamically loaded from your command registry
 */
const AVAILABLE_COMMANDS = [
  { name: '@search', description: 'Search through documents', params: 'query: string' },
  { name: '@analyze', description: 'Analyze text or code', params: 'content: string' },
  { name: '@summarize', description: 'Generate a summary', params: 'text: string, length?: number' },
  { name: '@translate', description: 'Translate text', params: 'text: string, language: string' },
  { name: '@format', description: 'Format code or text', params: 'content: string, style?: string' },
  { name: '@execute', description: 'Execute a command', params: 'command: string' }
];

/**
 * Available tools
 * In a real application, these would come from your tool registry
 */
const AVAILABLE_TOOLS = [
  { name: 'search', description: 'Full-text search capability', category: 'retrieval' },
  { name: 'calculator', description: 'Mathematical calculations', category: 'computation' },
  { name: 'web_fetch', description: 'Fetch content from URLs', category: 'web' },
  { name: 'code_executor', description: 'Execute code snippets', category: 'execution' },
  { name: 'file_reader', description: 'Read file contents', category: 'filesystem' },
  { name: 'image_analyzer', description: 'Analyze images', category: 'vision' }
];

// ============================================================================
// CUSTOM SYNTAX HIGHLIGHTING
// ============================================================================

/**
 * ViewPlugin for custom syntax highlighting
 *
 * This plugin decorates special syntax elements in the document:
 * - {variables} in green
 * - @commands in pink
 * - tools: declarations in cyan
 *
 * How it works:
 * 1. On document change, scan the entire document
 * 2. Use regex to find patterns
 * 3. Create Decoration.mark() for each match
 * 4. CodeMirror applies CSS classes to these ranges
 */
const customSyntaxHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    /**
     * Update decorations when document changes
     */
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    /**
     * Build decoration set for the entire document
     *
     * Performance: For very large documents (>10000 lines), consider
     * only highlighting the visible viewport using view.visibleRanges
     */
    buildDecorations(view: EditorView): DecorationSet {
      const decorations = [];
      const doc = view.state.doc;

      // Iterate through each line in the document
      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const lineText = line.text;
        const lineStart = line.from;

        // Pattern 1: Find {variables} like {now}, {user}, {date}
        // Regex: matches { followed by word characters followed by }
        const variableRegex = /\{(\w+)\}/g;
        let match;

        while ((match = variableRegex.exec(lineText)) !== null) {
          // Create decoration mark for this variable
          // The CSS class 'cm-prompt-variable' will be applied
          decorations.push(
            Decoration.mark({
              class: 'cm-prompt-variable',
              // Optional: add attributes for debugging
              attributes: { 'data-type': 'variable' }
            }).range(lineStart + match.index, lineStart + match.index + match[0].length)
          );
        }

        // Pattern 2: Find @commands like @search, @analyze
        // Regex: matches @ followed by word characters
        const commandRegex = /@(\w+)/g;

        while ((match = commandRegex.exec(lineText)) !== null) {
          decorations.push(
            Decoration.mark({
              class: 'cm-prompt-command',
              attributes: { 'data-type': 'command' }
            }).range(lineStart + match.index, lineStart + match.index + match[0].length)
          );
        }

        // Pattern 3: Find 'tools:' followed by tool names
        // This is more complex: we need to highlight both 'tools:' and the tool names
        const toolsRegex = /(tools:)\s*(\w+(?:\s*,\s*\w+)*)/gi;

        while ((match = toolsRegex.exec(lineText)) !== null) {
          // Highlight the 'tools:' keyword
          const keywordStart = lineStart + match.index;
          const keywordEnd = keywordStart + match[1].length;

          decorations.push(
            Decoration.mark({
              class: 'cm-prompt-tools-keyword',
              attributes: { 'data-type': 'tools-keyword' }
            }).range(keywordStart, keywordEnd)
          );

          // Highlight the tool names after 'tools:'
          if (match[2]) {
            const toolNamesStart = lineStart + match.index + match[1].length + (match[0].indexOf(match[2]) - match[1].length);
            const toolNamesEnd = toolNamesStart + match[2].length;

            decorations.push(
              Decoration.mark({
                class: 'cm-prompt-tool-name',
                attributes: { 'data-type': 'tool-name' }
              }).range(toolNamesStart, toolNamesEnd)
            );
          }
        }
      }

      // Create decoration set from all decorations
      // 'true' parameter indicates decorations are already sorted by position
      return Decoration.set(decorations, true);
    }
  },
  {
    // Tell CodeMirror where to find decorations
    decorations: (v) => v.decorations
  }
);

// ============================================================================
// AUTOCOMPLETE: Variable Suggestions
// ============================================================================

/**
 * Autocomplete source for {variables}
 *
 * Triggers when user types '{' and shows available template variables
 *
 * How it works:
 * 1. context.matchBefore() finds text matching pattern before cursor
 * 2. If pattern matches, return completion options
 * 3. CodeMirror shows popup with options
 * 4. User selects with arrows/enter or continues typing to filter
 */
function variableCompletions(context: CompletionContext): CompletionResult | null {
  // Match pattern: '{' followed by optional word characters
  // This matches: '{', '{n', '{now', etc.
  const before = context.matchBefore(/\{\w*/);

  // If no match, don't show completions
  if (!before) return null;

  // If cursor is not at the end of the matched text, don't show completions
  // This prevents showing completions when cursor is in the middle of a word
  if (before.from === before.to && !context.explicit) return null;

  // Get the partial text the user has typed (e.g., '{n' -> 'n')
  const typedText = before.text.slice(1).toLowerCase(); // Remove the '{'

  // Filter variables based on what user has typed
  const options = AVAILABLE_VARIABLES
    .filter(v => v.name.toLowerCase().includes(typedText))
    .map(variable => ({
      label: variable.name,
      type: 'variable', // Icon type in autocomplete popup
      detail: variable.example, // Shown on the right side
      info: variable.description, // Shown in hover tooltip
      apply: variable.name, // What gets inserted when selected
      // Boost score for exact prefix matches
      boost: variable.name.toLowerCase().startsWith('{' + typedText) ? 1 : 0
    }));

  return {
    from: before.from, // Start of the replacement range
    options: options,
    // Optional: set filter to false if you want to handle filtering manually
    filter: false // We already filtered above
  };
}

// ============================================================================
// AUTOCOMPLETE: Command Suggestions
// ============================================================================

/**
 * Autocomplete source for @commands
 *
 * Triggers when user types '@' and shows available slash commands
 */
function commandCompletions(context: CompletionContext): CompletionResult | null {
  // Match pattern: '@' followed by optional word characters
  const before = context.matchBefore(/@\w*/);

  if (!before) return null;
  if (before.from === before.to && !context.explicit) return null;

  const typedText = before.text.slice(1).toLowerCase(); // Remove the '@'

  const options = AVAILABLE_COMMANDS
    .filter(cmd => cmd.name.toLowerCase().includes(typedText))
    .map(command => ({
      label: command.name,
      type: 'keyword', // Different icon type
      detail: command.params,
      info: `${command.description}\n\nParameters: ${command.params}`,
      apply: command.name,
      boost: command.name.toLowerCase().startsWith('@' + typedText) ? 1 : 0
    }));

  return {
    from: before.from,
    options: options,
    filter: false
  };
}

// ============================================================================
// AUTOCOMPLETE: Tool Suggestions
// ============================================================================

/**
 * Autocomplete source for tools:
 *
 * Triggers when user types 'tools:' and shows available tools
 * This is more complex because we need to detect the 'tools:' prefix
 */
function toolCompletions(context: CompletionContext): CompletionResult | null {
  // Get text from line start to cursor
  const line = context.state.doc.lineAt(context.pos);
  const textBeforeCursor = line.text.slice(0, context.pos - line.from);

  // Check if we're in a 'tools:' context
  // Match 'tools:' followed by optional whitespace and word characters
  const toolsMatch = textBeforeCursor.match(/tools:\s*(\w*)$/i);

  if (!toolsMatch) return null;

  const typedText = toolsMatch[1].toLowerCase();

  // Calculate the start position for the completion
  // We want to replace from the start of the current tool name
  const from = context.pos - typedText.length;

  const options = AVAILABLE_TOOLS
    .filter(tool => tool.name.toLowerCase().includes(typedText))
    .map(tool => ({
      label: tool.name,
      type: 'function', // Yet another icon type
      detail: tool.category,
      info: `${tool.description}\n\nCategory: ${tool.category}`,
      apply: tool.name,
      boost: tool.name.toLowerCase().startsWith(typedText) ? 1 : 0
    }));

  return {
    from: from,
    options: options,
    filter: false
  };
}

// ============================================================================
// AUTOCOMPLETE: Multi-tool Suggestions (for comma-separated lists)
// ============================================================================

/**
 * Enhanced tool completions that handle comma-separated tool lists
 *
 * Handles cases like:
 * - tools: search, calculator,|  <- cursor here, suggest next tool
 * - tools: sea|  <- cursor here, suggest completing 'search'
 */
function multiToolCompletions(context: CompletionContext): CompletionResult | null {
  const line = context.state.doc.lineAt(context.pos);
  const textBeforeCursor = line.text.slice(0, context.pos - line.from);

  // Match 'tools:' followed by any tool names and commas, ending with optional partial tool name
  // Examples:
  // - 'tools: search, calc' matches with 'calc' as the last partial
  // - 'tools: search, ' matches with '' as the last partial
  const toolsMatch = textBeforeCursor.match(/tools:\s*((?:\w+\s*,\s*)*(\w*))$/i);

  if (!toolsMatch) return null;

  const typedText = toolsMatch[2]?.toLowerCase() || '';
  const from = context.pos - typedText.length;

  // Get already specified tools to avoid suggesting duplicates
  const specifiedTools = toolsMatch[1]
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 0);

  const options = AVAILABLE_TOOLS
    .filter(tool => {
      // Filter out already specified tools
      if (specifiedTools.includes(tool.name.toLowerCase())) return false;
      // Filter by typed text
      return tool.name.toLowerCase().includes(typedText);
    })
    .map(tool => ({
      label: tool.name,
      type: 'function',
      detail: tool.category,
      info: `${tool.description}\n\nCategory: ${tool.category}`,
      // Add comma and space if there are already tools specified
      apply: specifiedTools.length > 1 ? ` ${tool.name}` : tool.name,
      boost: tool.name.toLowerCase().startsWith(typedText) ? 1 : 0
    }));

  return {
    from: from,
    options: options,
    filter: false
  };
}

// ============================================================================
// THEME & STYLING
// ============================================================================

/**
 * Custom theme for the prompt editor
 *
 * Defines colors and styles for:
 * - Editor container
 * - Custom syntax elements ({variables}, @commands, tools:)
 * - Autocomplete popup
 */
const promptEditorTheme = EditorView.theme({
  // Main editor container
  '&': {
    height: '400px',
    fontSize: '14px',
    border: '1px solid #e1e4e8',
    borderRadius: '6px'
  },

  // Content area (where text is)
  '.cm-content': {
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
    padding: '10px',
    caretColor: '#0366d6' // Cursor color
  },

  // Focused editor
  '&.cm-focused': {
    outline: '2px solid #0366d6',
    outlineOffset: '2px'
  },

  // Line gutters (line numbers, if enabled)
  '.cm-gutters': {
    backgroundColor: '#f6f8fa',
    border: 'none',
    borderRight: '1px solid #e1e4e8'
  },

  // Active line highlighting
  '.cm-activeLine': {
    backgroundColor: '#f6f8fa'
  },

  // Selection
  '.cm-selectionBackground, ::selection': {
    backgroundColor: '#b3d7ff !important'
  },

  // Custom syntax: {variables}
  '.cm-prompt-variable': {
    color: '#22863a', // GitHub green
    fontWeight: '600',
    backgroundColor: '#dcffe4',
    padding: '2px 4px',
    borderRadius: '3px'
  },

  // Custom syntax: @commands
  '.cm-prompt-command': {
    color: '#6f42c1', // GitHub purple
    fontWeight: '600',
    backgroundColor: '#f5f0ff',
    padding: '2px 4px',
    borderRadius: '3px'
  },

  // Custom syntax: 'tools:' keyword
  '.cm-prompt-tools-keyword': {
    color: '#005cc5', // GitHub blue
    fontWeight: '700'
  },

  // Custom syntax: tool names after 'tools:'
  '.cm-prompt-tool-name': {
    color: '#0366d6', // GitHub bright blue
    fontWeight: '600',
    backgroundColor: '#e6f2ff',
    padding: '2px 4px',
    borderRadius: '3px'
  },

  // Autocomplete tooltip container
  '.cm-tooltip-autocomplete': {
    backgroundColor: '#ffffff',
    border: '1px solid #e1e4e8',
    borderRadius: '6px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'
  },

  // Individual autocomplete option
  '.cm-tooltip-autocomplete ul li': {
    padding: '6px 10px',
    cursor: 'pointer'
  },

  // Selected/highlighted option
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    backgroundColor: '#0366d6',
    color: '#ffffff'
  },

  // Autocomplete option detail (right side)
  '.cm-completionDetail': {
    fontStyle: 'italic',
    color: '#6a737d'
  }
});

/**
 * Syntax highlighting style for built-in markdown elements
 *
 * This styles standard markdown syntax: headers, bold, italic, code, etc.
 */
const markdownHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, fontSize: '1.6em', fontWeight: 'bold', color: '#24292e' },
  { tag: tags.heading2, fontSize: '1.4em', fontWeight: 'bold', color: '#24292e' },
  { tag: tags.heading3, fontSize: '1.2em', fontWeight: 'bold', color: '#24292e' },
  { tag: tags.strong, fontWeight: 'bold', color: '#24292e' },
  { tag: tags.emphasis, fontStyle: 'italic', color: '#24292e' },
  { tag: tags.link, color: '#0366d6', textDecoration: 'underline' },
  { tag: tags.monospace,
    fontFamily: 'Monaco, Menlo, monospace',
    backgroundColor: '#f6f8fa',
    padding: '2px 4px',
    borderRadius: '3px',
    fontSize: '0.95em',
    color: '#e36209'
  },
  { tag: tags.quote, color: '#6a737d', fontStyle: 'italic' },
  { tag: tags.list, color: '#24292e' }
]);

// ============================================================================
// EDITOR FACTORY
// ============================================================================

/**
 * Create and configure the prompt editor
 *
 * @param parent - DOM element to mount the editor in
 * @param initialContent - Initial document content
 * @param onChange - Callback fired when document changes
 * @returns EditorView instance
 */
export function createPromptEditor(
  parent: HTMLElement,
  initialContent: string = '',
  onChange?: (content: string) => void
): EditorView {

  // Configure all extensions
  const extensions = [
    // 1. Base markdown language support
    markdown(),

    // 2. Autocomplete with all our custom sources
    autocompletion({
      override: [
        variableCompletions,     // Trigger on '{'
        commandCompletions,      // Trigger on '@'
        multiToolCompletions     // Trigger after 'tools:'
      ],
      activateOnTyping: true,    // Show suggestions as user types
      closeOnBlur: true,         // Close popup when editor loses focus
      maxRenderedOptions: 10,    // Max suggestions to show
      defaultKeymap: true        // Enable default keyboard shortcuts (arrows, enter, escape)
    }),

    // 3. Custom syntax highlighting
    customSyntaxHighlighter,

    // 4. Markdown syntax highlighting
    syntaxHighlighting(markdownHighlightStyle),

    // 5. Custom theme
    promptEditorTheme,

    // 6. Change listener (if callback provided)
    ...(onChange ? [
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      })
    ] : [])
  ];

  // Create initial state
  const state = EditorState.create({
    doc: initialContent,
    extensions: extensions
  });

  // Create and return view
  const view = new EditorView({
    state: state,
    parent: parent
  });

  return view;
}

// ============================================================================
// UTILITY: Get Editor Content
// ============================================================================

/**
 * Get current content from editor
 */
export function getEditorContent(view: EditorView): string {
  return view.state.doc.toString();
}

/**
 * Set editor content programmatically
 */
export function setEditorContent(view: EditorView, content: string): void {
  view.dispatch({
    changes: {
      from: 0,
      to: view.state.doc.length,
      insert: content
    }
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  EditorView,
  type EditorState,
  AVAILABLE_VARIABLES,
  AVAILABLE_COMMANDS,
  AVAILABLE_TOOLS
};
