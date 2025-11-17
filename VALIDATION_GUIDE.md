# Validation System Guide

## Overview

The CodeMirror 6 Prompt Editor includes a powerful real-time validation system that checks for errors in custom syntax elements and provides helpful feedback to users. This guide explains the concepts, architecture, and implementation details.

## Table of Contents

1. [What is Validation?](#what-is-validation)
2. [Why Validation Matters](#why-validation-matters)
3. [Architecture Overview](#architecture-overview)
4. [Implementation Details](#implementation-details)
5. [How It Works](#how-it-works)
6. [Customization Guide](#customization-guide)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting](#troubleshooting)

---

## What is Validation?

Validation is the process of checking user input against a set of rules to ensure correctness. In the prompt editor, validation checks that:

- **Variables** like `{user}` are recognized template variables
- **Commands** like `@search` are valid slash commands
- **Tools** in `tools: search, calculator` are available tools

When the editor detects an invalid element, it:
1. **Underlines it in red** (like spell-check)
2. **Shows an error message** on hover
3. **Suggests corrections** that can be applied with one click

### Visual Example

```
❌ INVALID:
Hello {wrong_user}!
      ^^^^^^^^^^^
      Unknown variable: '{wrong_user}'. Did you mean one of: {user}, {now}, {date}?

✅ VALID:
Hello {user}!
```

---

## Why Validation Matters

### 1. **Immediate Feedback**
Users know instantly when they make a typo, before running the prompt.

### 2. **Discoverability**
Error messages show what options are available, helping users learn the syntax.

### 3. **Reduced Errors**
Catching mistakes early prevents runtime errors and failed executions.

### 4. **Better UX**
Quick fixes make corrections effortless - just click the suggestion.

### 5. **Professional Feel**
Real-time validation makes the editor feel like a modern IDE.

---

## Architecture Overview

The validation system consists of three main components:

```
┌─────────────────────────────────────────────────────────────┐
│                    CodeMirror Editor                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. LINTER EXTENSION                                 │  │
│  │     - Triggers on document changes                   │  │
│  │     - Calls promptLinter() function                  │  │
│  │     - Debounced by 500ms                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  2. promptLinter() FUNCTION                          │  │
│  │     - Scans document for patterns                    │  │
│  │     - Validates against available options            │  │
│  │     - Returns array of Diagnostic objects            │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  3. DIAGNOSTIC RENDERING                             │  │
│  │     - Red underlines (via CSS)                       │  │
│  │     - Error tooltips on hover                        │  │
│  │     - Quick fix actions                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Linter Extension Setup

The linter is configured in the `createPromptEditor()` function:

```typescript
linter(promptLinter, {
  delay: 500,              // Wait 500ms after typing stops
  needsRefresh: undefined  // Revalidate on any document change
})
```

**Key Parameters:**
- `promptLinter` - The validation function to call
- `delay` - Debounce time in milliseconds (prevents lag while typing)
- `needsRefresh` - When to revalidate (undefined = always)

### 2. The promptLinter Function

This is the heart of the validation system. It:
1. Receives the current `EditorView`
2. Scans the document for patterns
3. Validates each match
4. Returns an array of `Diagnostic` objects

```typescript
function promptLinter(view: EditorView): Diagnostic[]
```

**Return Value: Diagnostic Object**

```typescript
interface Diagnostic {
  from: number;           // Start position in document
  to: number;             // End position in document
  severity: 'error' | 'warning' | 'info';
  message: string;        // Error message to display
  actions?: Action[];     // Optional quick fix actions
}
```

### 3. Validation Process

#### Step 1: Build Lookup Sets

For fast O(1) validation:

```typescript
const validVariables = new Set(
  AVAILABLE_VARIABLES.map(v => v.name.toLowerCase())
);
// Result: Set { '{now}', '{user}', '{date}', ... }
```

**Why Sets?**
- `Array.includes()` is O(n) - slow for large lists
- `Set.has()` is O(1) - instant lookup
- Critical for real-time performance

#### Step 2: Scan Document Line by Line

```typescript
for (let i = 1; i <= doc.lines; i++) {
  const line = doc.line(i);
  const lineText = line.text;
  const lineStart = line.from;

  // Find patterns in this line...
}
```

**Why Line by Line?**
- Easier position calculations
- Natural text structure
- Can optimize per-line in future

#### Step 3: Pattern Matching with Regex

**Variables Pattern:**
```typescript
const variableRegex = /\{(\w+)\}/g;
// Matches: {user}, {now}, {anything}
// Captures: user, now, anything
```

**Commands Pattern:**
```typescript
const commandRegex = /@(\w+)/g;
// Matches: @search, @analyze, @anything
// Captures: search, analyze, anything
```

**Tools Pattern:**
```typescript
const toolsRegex = /tools:\s*(\w+(?:\s*,\s*\w+)*)/gi;
// Matches: tools: search, calculator
// Captures: search, calculator
```

#### Step 4: Position Calculation

This is crucial for accurate underlining:

```typescript
const matchStart = lineStart + match.index;
const matchEnd = matchStart + fullMatch.length;
```

**Example:**
```
Document position 0  ───────────────────────▶
Line 1: "# Prompt\n"              (positions 0-9)
Line 2: "Hello {user}!\n"         (positions 10-23)
                                   lineStart = 10
                         {user}    match.index = 6
                                   matchStart = 10 + 6 = 16
                                   matchEnd = 16 + 6 = 22
```

#### Step 5: Validation Check

```typescript
if (!validVariables.has(fullMatch.toLowerCase())) {
  // Create diagnostic for this error
}
```

#### Step 6: Create Diagnostic with Quick Fixes

```typescript
diagnostics.push({
  from: matchStart,
  to: matchEnd,
  severity: 'error',
  message: `Unknown variable: '${fullMatch}'. Did you mean...?`,
  actions: [
    {
      name: `Replace with {user}`,
      apply(view, from, to) {
        view.dispatch({
          changes: { from, to, insert: '{user}' }
        });
      }
    }
  ]
});
```

**Actions** provide one-click fixes:
- User hovers over error
- Sees suggestions in tooltip
- Clicks a suggestion
- `apply()` function runs
- Error is replaced with correct value

### 4. Styling Error Indicators

Error styling is defined in `promptEditorTheme`:

```typescript
'.cm-lintRange-error': {
  backgroundImage: 'url("data:image/svg+xml,...")',  // Red squiggly line
  backgroundRepeat: 'repeat-x',
  backgroundPosition: 'bottom left',
  paddingBottom: '2px'
}
```

**Why SVG Background?**
- Scalable and crisp at any zoom level
- Pure CSS, no image files needed
- Matches IDE-style error indicators

---

## How It Works: Step-by-Step Example

Let's trace what happens when a user types an invalid variable:

### User Action: Types `{wrong}`

```
Initial:    Hello _|
Types:      Hello {wrong}|
                  ^^^^^^^ (invalid)
```

### System Response:

**1. User stops typing**
```
⏱️ Timer starts: 500ms debounce
```

**2. After 500ms, linter runs**
```typescript
promptLinter(view) called
```

**3. Linter scans document**
```typescript
// Line 1: "Hello {wrong}"
variableRegex.exec("Hello {wrong}")
// Match: {wrong} at position 6-13
```

**4. Validation check**
```typescript
validVariables.has('{wrong}')  // false!
```

**5. Create diagnostic**
```typescript
{
  from: 6,
  to: 13,
  severity: 'error',
  message: "Unknown variable: '{wrong}'...",
  actions: [/* quick fixes */]
}
```

**6. CodeMirror renders error**
```
Visual result:
Hello {wrong}
      ^^^^^^^ (red underline)
```

**7. User hovers**
```
Tooltip appears:
┌────────────────────────────────────┐
│ ⚠️ Unknown variable: '{wrong}'     │
│ Did you mean: {user}, {now}?       │
│                                    │
│ Quick fixes:                       │
│ • Replace with {user}              │
│ • Replace with {now}               │
└────────────────────────────────────┘
```

**8. User clicks "Replace with {user}"**
```typescript
apply(view, 6, 13) {
  view.dispatch({
    changes: { from: 6, to: 13, insert: '{user}' }
  });
}
```

**9. Text replaced**
```
Result: Hello {user}
              ^^^^^^ (no error, green highlight)
```

---

## Customization Guide

### Adding New Validation Rules

#### 1. Add Severity Levels

```typescript
diagnostics.push({
  severity: 'warning',  // Instead of 'error'
  message: 'This variable is deprecated. Use {user_id} instead.'
});
```

**Severity Types:**
- `'error'` - Red underline, critical issue
- `'warning'` - Yellow underline, non-critical
- `'info'` - Blue underline, informational

#### 2. Validate Additional Patterns

Example: Validate that tools list isn't too long

```typescript
// In promptLinter function, after tools validation
if (tools.length > 5) {
  diagnostics.push({
    from: toolsStart,
    to: toolsStart + toolsList.length,
    severity: 'warning',
    message: 'Too many tools specified. Consider limiting to 5 or fewer for optimal performance.'
  });
}
```

#### 3. Add Contextual Validation

Example: Warn if using deprecated variables

```typescript
const DEPRECATED_VARIABLES = new Map([
  ['{username}', '{user}'],
  ['{datetime}', '{now}']
]);

if (DEPRECATED_VARIABLES.has(fullMatch.toLowerCase())) {
  diagnostics.push({
    from: matchStart,
    to: matchEnd,
    severity: 'warning',
    message: `Variable '${fullMatch}' is deprecated. Use '${DEPRECATED_VARIABLES.get(fullMatch)}' instead.`,
    actions: [{
      name: `Replace with ${DEPRECATED_VARIABLES.get(fullMatch)}`,
      apply(view, from, to) {
        view.dispatch({
          changes: { from, to, insert: DEPRECATED_VARIABLES.get(fullMatch) }
        });
      }
    }]
  });
}
```

#### 4. Smart Quick Fixes

Use fuzzy matching for better suggestions:

```typescript
// Simple fuzzy match by edit distance
function getSimilarVariables(input: string, available: Variable[]): Variable[] {
  return available
    .map(v => ({
      variable: v,
      score: levenshteinDistance(input.toLowerCase(), v.name.toLowerCase())
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map(x => x.variable);
}

// Use in actions
actions: getSimilarVariables(variableName, AVAILABLE_VARIABLES)
  .map(v => ({
    name: `Replace with ${v.name}`,
    apply(view, from, to) { /* ... */ }
  }))
```

### Configuring Linter Behavior

#### Adjust Debounce Delay

```typescript
linter(promptLinter, {
  delay: 1000,  // Wait 1 second (slower typing)
  // OR
  delay: 250,   // Wait 250ms (faster feedback)
})
```

**Recommendations:**
- **Fast typers**: 250-500ms
- **Slow typers**: 500-1000ms
- **Large documents**: 1000ms+

#### Validate Only Visible Text

For very large documents (>10,000 lines):

```typescript
function promptLinter(view: EditorView): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Only validate visible viewport
  for (const range of view.visibleRanges) {
    const startLine = view.state.doc.lineAt(range.from);
    const endLine = view.state.doc.lineAt(range.to);

    for (let i = startLine.number; i <= endLine.number; i++) {
      // Validate this line...
    }
  }

  return diagnostics;
}
```

---

## Performance Considerations

### 1. **Debouncing**

The 500ms delay prevents validation from running on every keystroke:

```
User types: "H" "e" "l" "l" "o"
Without debounce: Validate 5 times ❌
With debounce: Validate 1 time ✅ (after "Hello")
```

### 2. **Set Lookups O(1)**

```typescript
// ❌ SLOW: O(n) linear search
AVAILABLE_VARIABLES.find(v => v.name === fullMatch)

// ✅ FAST: O(1) constant time
validVariables.has(fullMatch)
```

### 3. **Early Returns**

Skip unnecessary work:

```typescript
// Skip empty lines
if (lineText.trim().length === 0) continue;

// Skip code blocks (don't validate inside ```)
if (lineText.startsWith('```')) continue;
```

### 4. **Limit Suggestions**

Don't show all 100 options:

```typescript
.slice(0, 3)  // Show only top 3 suggestions
```

### 5. **Benchmark**

For large documents, measure performance:

```typescript
function promptLinter(view: EditorView): Diagnostic[] {
  const start = performance.now();

  // Validation logic...

  const end = performance.now();
  console.log(`Linting took ${end - start}ms`);

  return diagnostics;
}
```

**Targets:**
- Small docs (<100 lines): <10ms
- Medium docs (100-1000 lines): <50ms
- Large docs (1000+ lines): <200ms

---

## Troubleshooting

### Problem: Validation is slow while typing

**Cause:** Debounce delay is too short
**Solution:** Increase delay to 1000ms

```typescript
linter(promptLinter, { delay: 1000 })
```

---

### Problem: Errors don't show up

**Cause 1:** Linter extension not added
**Solution:** Check `extensions` array includes linter

**Cause 2:** Pattern regex doesn't match
**Solution:** Test regex in isolation

```typescript
const regex = /\{(\w+)\}/g;
console.log('{user}'.match(regex));  // Should output: ['{user}']
```

---

### Problem: Wrong positions underlined

**Cause:** Position calculation off by one
**Solution:** Verify `lineStart + match.index` logic

```typescript
console.log({
  lineStart,
  matchIndex: match.index,
  fullMatch: match[0],
  calculatedStart: lineStart + match.index
});
```

---

### Problem: Quick fixes don't work

**Cause:** `apply()` function has wrong parameters
**Solution:** Check signature

```typescript
apply(view: EditorView, from: number, to: number) {
  // Correct: use from and to parameters, not matchStart/matchEnd
  view.dispatch({
    changes: { from, to, insert: 'replacement' }
  });
}
```

---

### Problem: Validation runs even when not editing

**Cause:** `needsRefresh` configured incorrectly
**Solution:** Use `undefined` for standard behavior

```typescript
linter(promptLinter, {
  needsRefresh: undefined  // Default: only on doc changes
})
```

---

## Advanced Topics

### Loading Validation Rules from API

```typescript
let VALID_TOOLS: Set<string>;

async function loadToolsFromAPI() {
  const tools = await fetch('/api/tools').then(r => r.json());
  VALID_TOOLS = new Set(tools.map(t => t.name.toLowerCase()));
}

// Call before creating editor
await loadToolsFromAPI();
const editor = createPromptEditor(...);
```

### Dynamic Validation Rules

Update validation rules at runtime:

```typescript
export function updateAvailableTools(newTools: Tool[]) {
  AVAILABLE_TOOLS.length = 0;
  AVAILABLE_TOOLS.push(...newTools);

  // Force revalidation
  editorView.dispatch({});
}
```

### Cross-Reference Validation

Validate that referenced tools are actually declared:

```typescript
// Find all tools declarations
const declaredTools = new Set();
// ... scan for tools: ... and add to set

// Find all tool references
// ... scan for tool usage

// Validate references
if (!declaredTools.has(toolName)) {
  diagnostics.push({
    severity: 'error',
    message: `Tool '${toolName}' is not declared in tools: list`
  });
}
```

---

## Summary

The validation system provides:

✅ **Real-time error checking** for variables, commands, and tools
✅ **Visual feedback** with red underlines
✅ **Helpful error messages** showing what went wrong
✅ **Quick fixes** for one-click corrections
✅ **Performance optimizations** for smooth typing experience
✅ **Extensible architecture** for custom validation rules

By understanding these concepts and implementation details, you can:
- Customize validation rules for your use case
- Add new validation patterns
- Optimize performance for large documents
- Debug validation issues effectively
- Build confidence in your prompt editor

---

## Next Steps

1. **Try the demo**: Load the validation demo in the editor to see it in action
2. **Experiment**: Add your own validation rules
3. **Optimize**: Measure performance in your specific use case
4. **Extend**: Add warning and info severity levels
5. **Integrate**: Connect to your backend API for dynamic rules

Happy validating! 🎯
