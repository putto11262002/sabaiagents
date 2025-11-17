import React, { useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage.js';
import { ChatInput } from './ChatInput.js';
import type { Message } from '@/types/agent.js';

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

export function ChatWindow({
  messages,
  onSendMessage,
  isLoading = false,
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm">Start a conversation with your agent</p>
            </div>
          </div>
        ) : (
          <div>
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            {isLoading && (
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm">Agent is thinking...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <ChatInput
        onSend={onSendMessage}
        disabled={isLoading}
        placeholder={
          isLoading
            ? 'Agent is responding...'
            : 'Type your message... (Shift+Enter for new line)'
        }
      />
    </div>
  );
}
