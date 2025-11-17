import React from 'react';
import { cn } from '@/lib/utils.js';
import { Badge } from '@/components/ui/badge.js';
import type { Message } from '@/types/agent.js';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex w-full gap-3 px-4 py-3',
        isUser ? 'bg-muted/50' : 'bg-background'
      )}
    >
      <div className="flex-shrink-0">
        <Badge variant={isUser ? 'default' : 'secondary'}>
          {isUser ? 'You' : 'AI'}
        </Badge>
      </div>
      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
