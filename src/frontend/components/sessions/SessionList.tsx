import React from 'react';
import { SessionCard } from './SessionCard.js';
import type { Session } from '@/types/agent.js';

interface SessionListProps {
  sessions: Session[];
  activeSessionId?: string;
  onSessionSelect: (session: Session) => void;
}

export function SessionList({
  sessions,
  activeSessionId,
  onSessionSelect,
}: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No sessions yet
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-3 p-4">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            isActive={session.id === activeSessionId}
            onClick={onSessionSelect}
          />
        ))}
      </div>
    </div>
  );
}
