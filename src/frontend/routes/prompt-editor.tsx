/**
 * Prompt Editor Page
 *
 * Demonstrates the CodeMirror 6 prompt editor with real-time validation,
 * custom syntax highlighting, and autocomplete features.
 */

import { useState } from 'react';
import { PromptEditor } from '../components/PromptEditor.js';

const EXAMPLE_CONTENT = `# AI Assistant Prompt

You are an AI assistant with access to powerful tools.

## Context Variables (hover over errors to see suggestions!)

- Current user: {user}
- Current time: {now}
- Invalid example: {wrong_var} ← This will show a red underline!

## Available Commands

Use @search to find information in the knowledge base.
Use @invalid_cmd to demonstrate errors ← Red underline here!

## Tool Configuration

tools: search, calculator, invalid_tool ← Error on invalid_tool!

## Valid Examples

- Valid user: {user}
- Valid command: @analyze
- Valid tools: search, calculator, web_fetch
`;

export function PromptEditorPage() {
  const [content, setContent] = useState(EXAMPLE_CONTENT);
  const [showOutput, setShowOutput] = useState(false);

  const handleGetContent = () => {
    setShowOutput(true);
  };

  const handleClear = () => {
    setContent('');
    setShowOutput(false);
  };

  const handleLoadExample = () => {
    setContent(EXAMPLE_CONTENT);
    setShowOutput(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Prompt Editor</h1>
        <p className="text-gray-600">
          A powerful markdown-based editor with custom syntax highlighting, autocomplete, and real-time validation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Editor Column */}
        <div>
          <div className="mb-4">
            <h2 className="text-2xl font-semibold mb-2">Editor</h2>
            <p className="text-sm text-gray-600 mb-4">
              Try typing <code className="bg-gray-100 px-1 rounded">{`{`}</code>,{' '}
              <code className="bg-gray-100 px-1 rounded">@</code>, or{' '}
              <code className="bg-gray-100 px-1 rounded">tools:</code> to see autocomplete
            </p>
          </div>

          <PromptEditor
            initialContent={content}
            onChange={setContent}
            height="500px"
            className="mb-4"
          />

          <div className="flex gap-2 mb-4">
            <button
              onClick={handleGetContent}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Get Content
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleLoadExample}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Load Example
            </button>
          </div>

          {showOutput && (
            <div className="bg-gray-50 border border-gray-200 rounded p-4">
              <h3 className="font-semibold mb-2">Current Content:</h3>
              <pre className="text-sm whitespace-pre-wrap break-words overflow-auto max-h-60">
                {content}
              </pre>
            </div>
          )}
        </div>

        {/* Documentation Column */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Features</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  <span className="text-green-600">{`{Variables}`}</span>
                </h3>
                <p className="text-sm text-gray-700 mb-2">
                  Template variables for dynamic content. Type <code className="bg-gray-100 px-1 rounded">{`{`}</code>{' '}
                  to trigger autocomplete.
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li><code className="bg-gray-100 px-1 rounded">{`{now}`}</code> - Current date and time</li>
                  <li><code className="bg-gray-100 px-1 rounded">{`{date}`}</code> - Current date</li>
                  <li><code className="bg-gray-100 px-1 rounded">{`{user}`}</code> - Current user name</li>
                  <li><code className="bg-gray-100 px-1 rounded">{`{session_id}`}</code> - Session identifier</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">
                  <span className="text-purple-600">@Commands</span>
                </h3>
                <p className="text-sm text-gray-700 mb-2">
                  Slash commands for actions. Type <code className="bg-gray-100 px-1 rounded">@</code>{' '}
                  to trigger autocomplete.
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li><code className="bg-gray-100 px-1 rounded">@search</code> - Search documents</li>
                  <li><code className="bg-gray-100 px-1 rounded">@analyze</code> - Analyze text or code</li>
                  <li><code className="bg-gray-100 px-1 rounded">@summarize</code> - Generate summary</li>
                  <li><code className="bg-gray-100 px-1 rounded">@translate</code> - Translate text</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">
                  <span className="text-blue-600">tools: declarations</span>
                </h3>
                <p className="text-sm text-gray-700 mb-2">
                  Declare available tools. Type <code className="bg-gray-100 px-1 rounded">tools:</code>{' '}
                  to trigger autocomplete.
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li><code className="bg-gray-100 px-1 rounded">search</code> - Full-text search</li>
                  <li><code className="bg-gray-100 px-1 rounded">calculator</code> - Math calculations</li>
                  <li><code className="bg-gray-100 px-1 rounded">web_fetch</code> - Fetch URLs</li>
                  <li><code className="bg-gray-100 px-1 rounded">code_executor</code> - Execute code</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">
                  <span className="text-red-600">Real-time Validation</span>
                </h3>
                <p className="text-sm text-gray-700">
                  The editor validates your content in real-time and shows errors for:
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mt-2">
                  <li>Unknown variables (not in the predefined list)</li>
                  <li>Unknown commands (not in the command registry)</li>
                  <li>Invalid tool names</li>
                  <li>Malformed syntax</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h3 className="font-semibold mb-2">💡 Pro Tips</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Use markdown syntax for formatting</li>
              <li>• Autocomplete appears as you type</li>
              <li>• Hover over suggestions for descriptions</li>
              <li>• Errors are underlined in red</li>
              <li>• Press Escape to close autocomplete</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
