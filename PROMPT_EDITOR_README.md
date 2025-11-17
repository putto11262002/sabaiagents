# CodeMirror 6 Prompt Editor

A powerful markdown-based prompt editor with custom syntax highlighting and intelligent autocomplete, built with CodeMirror 6.

## Features

### 🎯 Custom Syntax Support

1. **Variables** - `{variable_name}`
   - Trigger: Type `{`
   - Example: `{now}`, `{user}`, `{date}`
   - Highlighted in green with background

2. **Commands** - `@command_name`
   - Trigger: Type `@`
   - Example: `@search`, `@analyze`, `@summarize`
   - Highlighted in purple with background

3. **Tools** - `tools: tool1, tool2`
   - Trigger: Type `tools:` followed by space
   - Example: `tools: search, calculator, web_fetch`
   - Highlighted in blue with background

### ⌨️ Intelligent Autocomplete

- **Automatic triggers** on special characters (`{`, `@`, `tools:`)
- **Fuzzy matching** - filters as you type
- **Keyboard navigation** - arrow keys to select, Enter to accept
- **Context-aware** - shows relevant suggestions based on cursor position
- **Descriptions** - hover over suggestions to see details

### 🎨 Markdown Support

Full markdown syntax highlighting including:
- Headers (h1, h2, h3)
- **Bold** and *italic* text
- `Inline code` and code blocks
- Lists (bullet and numbered)
- Block quotes
- Links

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

This installs:
- `@codemirror/state` - State management
- `@codemirror/view` - Editor view
- `@codemirror/lang-markdown` - Markdown support
- `@codemirror/autocomplete` - Autocomplete functionality
- `@codemirror/language` - Language utilities
- `@lezer/highlight` - Syntax highlighting

### 2. Run the Demo

```bash
bun --hot serve-demo.ts
```

Then open http://localhost:3000 in your browser.

### 3. Try It Out

1. **Type `{`** - You'll see variable suggestions like `{now}`, `{user}`, `{date}`
2. **Type `@`** - You'll see command suggestions like `@search`, `@analyze`
3. **Type `tools:`** - You'll see tool suggestions like `search`, `calculator`
4. **Use arrow keys** to navigate and **Enter** to select
5. **Press Escape** to close the autocomplete popup

## Project Structure

```
├── prompt-editor.ts              # Main editor implementation
├── prompt-editor-demo.html       # Demo page with UI
├── serve-demo.ts                 # Bun development server
├── CODEMIRROR_GUIDE.md          # Detailed implementation guide
└── PROMPT_EDITOR_README.md      # This file
```

## Files Explained

### `prompt-editor.ts`

The core editor implementation with:

```typescript
// Create an editor instance
const editor = createPromptEditor(
  document.getElementById('container'),
  'Initial content',
  (content) => {
    console.log('Content changed:', content);
  }
);

// Get current content
const content = getEditorContent(editor);

// Set content programmatically
setEditorContent(editor, 'New content');
```

### `prompt-editor-demo.html`

A complete demo page showing:
- How to import and use the editor
- Example content demonstrating all features
- Interactive buttons to test functionality
- Documentation of available syntax

### `CODEMIRROR_GUIDE.md`

Comprehensive guide covering:
- CodeMirror 6 core concepts
- Architecture explanation
- Implementation details for each feature
- Performance considerations
- Styling and theming

## Usage in Your Project

### Basic Integration

```html
<!DOCTYPE html>
<html>
<body>
  <div id="editor"></div>

  <script type="module">
    import { createPromptEditor } from './prompt-editor.ts';

    const editor = createPromptEditor(
      document.getElementById('editor'),
      '# Start typing...'
    );
  </script>
</body>
</html>
```

### With Bun.serve()

```typescript
import html from "./your-page.html";

Bun.serve({
  port: 3000,
  routes: {
    "/": html
  },
  development: {
    hmr: true  // Hot reloading
  }
});
```

### React Integration (if needed)

```tsx
import { useEffect, useRef } from 'react';
import { createPromptEditor, type EditorView } from './prompt-editor';

function PromptEditorComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      editorRef.current = createPromptEditor(
        containerRef.current,
        '# Initial content',
        (content) => {
          console.log('Changed:', content);
        }
      );
    }

    return () => {
      editorRef.current?.destroy();
    };
  }, []);

  return <div ref={containerRef} />;
}
```

## Customization

### Adding New Variables

Edit the `AVAILABLE_VARIABLES` array in `prompt-editor.ts`:

```typescript
const AVAILABLE_VARIABLES = [
  {
    name: '{my_var}',
    description: 'My custom variable',
    example: 'example_value'
  },
  // ... more variables
];
```

### Adding New Commands

Edit the `AVAILABLE_COMMANDS` array:

```typescript
const AVAILABLE_COMMANDS = [
  {
    name: '@my_command',
    description: 'My custom command',
    params: 'param1: string, param2?: number'
  },
  // ... more commands
];
```

### Adding New Tools

Edit the `AVAILABLE_TOOLS` array:

```typescript
const AVAILABLE_TOOLS = [
  {
    name: 'my_tool',
    description: 'My custom tool',
    category: 'custom'
  },
  // ... more tools
];
```

### Customizing Theme

Modify the `promptEditorTheme` in `prompt-editor.ts`:

```typescript
const promptEditorTheme = EditorView.theme({
  '.cm-prompt-variable': {
    color: '#ff0000',  // Change variable color to red
    fontWeight: '700'
  },
  // ... more styles
});
```

### Changing Editor Height

```typescript
const promptEditorTheme = EditorView.theme({
  '&': {
    height: '600px',  // Change from default 400px
    // ... other styles
  }
});
```

## API Reference

### `createPromptEditor(parent, initialContent?, onChange?)`

Creates a new editor instance.

**Parameters:**
- `parent: HTMLElement` - DOM element to mount editor in
- `initialContent?: string` - Initial document content (default: '')
- `onChange?: (content: string) => void` - Callback when content changes

**Returns:** `EditorView` instance

### `getEditorContent(view)`

Gets the current content from the editor.

**Parameters:**
- `view: EditorView` - Editor instance

**Returns:** `string` - Current document content

### `setEditorContent(view, content)`

Sets editor content programmatically.

**Parameters:**
- `view: EditorView` - Editor instance
- `content: string` - New content to set

**Returns:** `void`

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Space` | Force show autocomplete |
| `↑` / `↓` | Navigate suggestions |
| `Enter` | Accept selected suggestion |
| `Escape` | Close autocomplete popup |
| `Tab` | Accept suggestion (alternative) |

## Performance Notes

- **Efficient decoration updates**: Only rebuilds on document changes
- **Viewport-limited highlighting**: For large documents, can be optimized to only highlight visible text
- **Debounced autocomplete**: Suggestions appear smoothly without lag
- **Minimal re-renders**: Immutable state model prevents unnecessary updates

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Troubleshooting

### Autocomplete not showing

1. Check you're typing the correct trigger character (`{`, `@`, or `tools:`)
2. Verify the editor has focus
3. Try pressing `Ctrl+Space` to force show autocomplete

### Syntax highlighting not working

1. Ensure the pattern matches exactly (e.g., `{word}` not `{ word }`)
2. Check browser console for errors
3. Verify all dependencies are installed

### Styles look broken

1. Clear browser cache and reload
2. Check the theme is properly applied in `createPromptEditor()`
3. Verify no CSS conflicts with existing styles

## Advanced Usage

### Custom Completion Source

Add your own autocomplete source:

```typescript
import { CompletionContext } from '@codemirror/autocomplete';

function myCustomCompletions(context: CompletionContext) {
  const before = context.matchBefore(/my-pattern/);
  if (!before) return null;

  return {
    from: before.from,
    options: [
      {
        label: 'suggestion1',
        type: 'keyword',
        info: 'Description here'
      }
    ]
  };
}

// Add to autocompletion extension
autocompletion({
  override: [
    variableCompletions,
    commandCompletions,
    multiToolCompletions,
    myCustomCompletions  // Add here
  ]
})
```

### Custom Syntax Highlighting

Add new patterns to `customSyntaxHighlighter`:

```typescript
// In buildDecorations method
const myPatternRegex = /my-pattern/g;
while ((match = myPatternRegex.exec(lineText)) !== null) {
  decorations.push(
    Decoration.mark({
      class: 'cm-my-custom-class'
    }).range(startPos, endPos)
  );
}
```

### Loading Data from API

```typescript
// Fetch variables from backend
const variables = await fetch('/api/variables').then(r => r.json());

// Update AVAILABLE_VARIABLES before creating editor
AVAILABLE_VARIABLES.push(...variables);

const editor = createPromptEditor(...);
```

## Next Steps

1. **Add validation**: Show errors for malformed syntax
2. **Add snippets**: Template expansions (e.g., `cmd` → full command template)
3. **Add preview**: Live preview of rendered markdown
4. **Add export**: Export to different formats
5. **Add collaborative editing**: Multiple users editing same document

## Resources

- [CodeMirror 6 Docs](https://codemirror.net/docs/)
- [CodeMirror 6 Examples](https://codemirror.net/examples/)
- [Lezer Parser Guide](https://lezer.codemirror.net/docs/guide/)
- [Bun Documentation](https://bun.sh/docs)

## License

This implementation is provided as-is for educational and development purposes.

## Contributing

To extend this editor:
1. Fork the project
2. Make your changes to `prompt-editor.ts`
3. Test in the demo: `bun --hot serve-demo.ts`
4. Document your changes in this README
