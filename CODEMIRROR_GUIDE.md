# CodeMirror 6 Prompt Editor - Implementation Guide

## Overview

This guide explains how to build a markdown-based prompt editor with custom syntax highlighting and autocomplete using CodeMirror 6.

## Table of Contents
1. [CodeMirror 6 Core Concepts](#core-concepts)
2. [Architecture Overview](#architecture)
3. [Implementation Details](#implementation)
4. [Custom Features](#custom-features)

---

## Core Concepts

### 1. **State Management** (`@codemirror/state`)

CodeMirror 6 uses an **immutable state model**. The editor state contains:
- Document content
- Selection/cursor position
- Configuration
- Extensions

**Key Concept**: State never mutates. Changes create new states via transactions.

```typescript
import { EditorState } from '@codemirror/state';

// Create initial state
const state = EditorState.create({
  doc: "Initial content",
  extensions: [/* extensions */]
});

// Update state via transaction
const transaction = state.update({
  changes: { from: 0, to: 0, insert: "New text" }
});
const newState = transaction.state;
```

### 2. **View Layer** (`@codemirror/view`)

The `EditorView` is the DOM representation of the editor state.

```typescript
import { EditorView } from '@codemirror/view';

const view = new EditorView({
  state: state,
  parent: document.body
});
```

**Key Concept**: View is a pure rendering of state. All logic lives in state/extensions.

### 3. **Extensions System**

Extensions add functionality to the editor. They can:
- Define syntax highlighting
- Add autocomplete
- Handle keyboard shortcuts
- Theme the editor
- Add custom decorations

**Extension Types**:
- **State Fields**: Store custom state data
- **View Plugins**: Interact with DOM
- **Facets**: Configure behavior
- **Language Extensions**: Define syntax/parsing

### 4. **Syntax Highlighting** (`@lezer/highlight`)

Syntax highlighting works through:
1. **Parser**: Analyzes text and creates syntax tree
2. **Highlighter**: Maps syntax nodes to CSS classes
3. **Theme**: Defines colors for classes

**Tag System**: Uses semantic tags like `variableName`, `keyword`, `comment`

```typescript
import { tags } from '@lezer/highlight';

// Define what each tag looks like
const highlighting = HighlightStyle.define([
  { tag: tags.keyword, color: '#ff79c6' },
  { tag: tags.variableName, color: '#50fa7b' }
]);
```

### 5. **Autocomplete** (`@codemirror/autocomplete`)

Autocomplete provides suggestions as user types.

**Core Components**:
- **Completion Source**: Function that returns suggestions
- **Completion Context**: Info about current cursor position
- **Completion Result**: List of options to show

**Trigger Methods**:
1. **Explicit**: User presses Ctrl+Space
2. **Implicit**: Automatically trigger on certain characters

```typescript
import { autocompletion } from '@codemirror/autocomplete';

function myCompletions(context) {
  // Analyze context and return suggestions
  return {
    from: context.pos,
    options: [
      { label: "suggestion1", type: "variable" },
      { label: "suggestion2", type: "function" }
    ]
  };
}

const extension = autocompletion({ override: [myCompletions] });
```

---

## Architecture Overview

Our prompt editor has these components:

```
┌─────────────────────────────────────────────┐
│         CodeMirror Editor View              │
├─────────────────────────────────────────────┤
│  Extensions:                                 │
│  ┌──────────────────────────────────────┐  │
│  │ 1. Markdown Language Support         │  │
│  │    - Base markdown syntax            │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ 2. Custom Syntax Highlighting        │  │
│  │    - {variables} → variable tag      │  │
│  │    - @commands → keyword tag         │  │
│  │    - tools: → meta tag               │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ 3. Autocomplete Sources              │  │
│  │    - { → Variable suggestions        │  │
│  │    - @ → Command suggestions         │  │
│  │    - tools: → Tool suggestions       │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ 4. Theme & Styling                   │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## Implementation Details

### Step 1: Custom Syntax Highlighting

**Challenge**: Markdown mode doesn't know about `{variables}`, `@commands`, `tools:`

**Solution**: Use `ViewPlugin` with decorations to overlay custom styling

**How Decorations Work**:
1. Parse document on each update
2. Find custom syntax patterns
3. Create decoration marks at those positions
4. CodeMirror renders them with CSS classes

```typescript
import { Decoration, ViewPlugin, DecorationSet } from '@codemirror/view';

const customHighlight = ViewPlugin.fromClass(class {
  decorations: DecorationSet;

  constructor(view) {
    this.decorations = this.buildDecorations(view);
  }

  update(update) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.buildDecorations(update.view);
    }
  }

  buildDecorations(view) {
    const decorations = [];
    const text = view.state.doc.toString();

    // Find {variables}
    const varRegex = /\{(\w+)\}/g;
    let match;
    while (match = varRegex.exec(text)) {
      decorations.push(
        Decoration.mark({
          class: 'cm-variable'
        }).range(match.index, match.index + match[0].length)
      );
    }

    return Decoration.set(decorations);
  }
}, {
  decorations: v => v.decorations
});
```

### Step 2: Autocomplete Implementation

**Challenge**: Detect when user types `{`, `@`, or `tools:` and show relevant suggestions

**Solution**: Create completion source that:
1. Checks text before cursor
2. Determines which suggestions to show
3. Returns completion options

**Completion Context Properties**:
- `context.pos`: Current cursor position
- `context.state.doc`: Document content
- `context.explicit`: User pressed Ctrl+Space vs auto-trigger
- `context.matchBefore(regex)`: Get text matching pattern before cursor

```typescript
import { CompletionContext } from '@codemirror/autocomplete';

function variableCompletions(context: CompletionContext) {
  // Check if we just typed '{'
  const before = context.matchBefore(/\{\w*/);

  if (!before) return null;

  return {
    from: before.from,
    options: [
      {
        label: '{now}',
        type: 'variable',
        info: 'Current date and time'
      },
      {
        label: '{user}',
        type: 'variable',
        info: 'Current user name'
      }
    ]
  };
}
```

### Step 3: Integration

Combine all extensions:

```typescript
const extensions = [
  markdown(),                    // Base markdown
  customHighlight,               // Our custom highlighting
  autocompletion({
    override: [
      variableCompletions,
      commandCompletions,
      toolCompletions
    ]
  }),
  EditorView.theme({
    '.cm-variable': { color: '#50fa7b' },
    '.cm-command': { color: '#ff79c6' },
    '.cm-tool': { color: '#8be9fd' }
  })
];

const state = EditorState.create({
  doc: initialContent,
  extensions: extensions
});

const view = new EditorView({
  state: state,
  parent: document.querySelector('#editor')
});
```

---

## Custom Features

### Feature 1: Variable Suggestions (`{`)

**Trigger**: User types `{`
**Behavior**: Show list of available variables like `{now}`, `{user}`, `{date}`

**Implementation**:
- Match pattern: `/\{\w*/`
- Filter variables based on what's typed
- Show tooltip with description

### Feature 2: Command Suggestions (`@`)

**Trigger**: User types `@`
**Behavior**: Show list of slash commands

**Implementation**:
- Match pattern: `/@\w*/`
- Fuzzy match command names
- Show command descriptions

### Feature 3: Tool Suggestions (`tools:`)

**Trigger**: User types `tools:` followed by space
**Behavior**: Show list of available tools

**Implementation**:
- Match pattern: `/tools:\s*\w*/`
- More complex: need to detect we're after `tools:`
- Show tool names and parameters

---

## Performance Considerations

### 1. **Efficient Decoration Updates**

Only rebuild decorations when document changes:

```typescript
update(update) {
  // Only rebuild if document actually changed
  if (update.docChanged) {
    this.decorations = this.buildDecorations(update.view);
  }
}
```

### 2. **Viewport-Limited Highlighting**

For large documents, only highlight visible portion:

```typescript
buildDecorations(view) {
  const decorations = [];

  // Only process visible range
  for (let { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    // ... find patterns in visible text only
  }

  return Decoration.set(decorations, true); // true = sorted
}
```

### 3. **Debounced Autocomplete**

Avoid showing autocomplete on every keystroke:

```typescript
autocompletion({
  activateOnTyping: true,
  closeOnBlur: true,
  override: [myCompletions]
})
```

---

## Styling & Theming

CodeMirror 6 uses CSS-in-JS for theming:

```typescript
EditorView.theme({
  // Editor container
  '&': {
    height: '400px',
    border: '1px solid #ddd'
  },

  // Content area
  '.cm-content': {
    fontFamily: 'Monaco, monospace',
    fontSize: '14px'
  },

  // Custom syntax classes
  '.cm-variable': {
    color: '#50fa7b',
    fontWeight: 'bold'
  },

  '.cm-command': {
    color: '#ff79c6',
    fontStyle: 'italic'
  },

  // Autocomplete popup
  '.cm-tooltip-autocomplete': {
    border: '1px solid #444',
    backgroundColor: '#1e1e1e'
  }
})
```

---

## Testing the Editor

1. **Type `{`** → Should see variable suggestions
2. **Type `@`** → Should see command suggestions
3. **Type `tools:`** → Should see tool suggestions
4. **Use arrow keys** → Navigate suggestions
5. **Press Enter** → Accept suggestion
6. **Press Escape** → Close suggestions

---

## Next Steps

1. **Add syntax validation**: Show errors for malformed syntax
2. **Add snippets**: Template expansions
3. **Add formatting**: Auto-indent, bracket matching
4. **Add preview**: Live preview of rendered markdown
5. **Add keyboard shortcuts**: Custom key bindings

---

## Resources

- [CodeMirror 6 Documentation](https://codemirror.net/docs/)
- [CodeMirror 6 Examples](https://codemirror.net/examples/)
- [Lezer Parser System](https://lezer.codemirror.net/)
