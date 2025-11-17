/**
 * React wrapper component for the CodeMirror 6 Prompt Editor
 *
 * This component wraps the vanilla JavaScript prompt editor module
 * and provides a React-friendly interface with proper lifecycle management.
 */

import { useEffect, useRef, useState } from 'react';
import { EditorView } from '@codemirror/view';
import { createPromptEditor, getEditorContent, setEditorContent } from '../../../prompt-editor.js';

export interface PromptEditorProps {
  /**
   * Initial content to display in the editor
   */
  initialContent?: string;

  /**
   * Callback fired when editor content changes
   */
  onChange?: (content: string) => void;

  /**
   * Additional CSS classes for the container
   */
  className?: string;

  /**
   * Height of the editor (default: '400px')
   */
  height?: string;
}

/**
 * PromptEditor React Component
 *
 * Features:
 * - {variables} autocomplete and syntax highlighting
 * - @commands autocomplete and syntax highlighting
 * - tools: declarations with autocomplete
 * - Real-time validation and error detection
 * - Markdown support
 *
 * @example
 * ```tsx
 * <PromptEditor
 *   initialContent="Hello {user}, use @search to find data"
 *   onChange={(content) => console.log(content)}
 *   height="500px"
 * />
 * ```
 */
export function PromptEditor({
  initialContent = '',
  onChange,
  className = '',
  height = '400px'
}: PromptEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Initialize editor on mount
  useEffect(() => {
    if (!editorRef.current) return;

    // Create the editor instance
    const view = createPromptEditor(
      editorRef.current,
      initialContent,
      onChange
    );

    // Store the view reference for external access
    viewRef.current = view;

    // Cleanup on unmount
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []); // Only run once on mount

  // Handle initialContent changes after mount
  useEffect(() => {
    if (viewRef.current && initialContent !== getEditorContent(viewRef.current)) {
      setEditorContent(viewRef.current, initialContent);
    }
  }, [initialContent]);

  return (
    <div className={className}>
      <div
        ref={editorRef}
        style={{
          height,
          border: '1px solid #ddd',
          borderRadius: '4px',
          overflow: 'auto'
        }}
      />
    </div>
  );
}

/**
 * Hook to get programmatic access to the editor instance
 * Use this if you need to call getEditorContent or setEditorContent externally
 */
export function usePromptEditor() {
  const [view, setView] = useState<EditorView | null>(null);

  return {
    view,
    setView,
    getContent: () => view ? getEditorContent(view) : '',
    setContent: (content: string) => view && setEditorContent(view, content)
  };
}
