import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.js';
import { Badge } from '@/components/ui/badge.js';
import { Clock, MessageSquare, DollarSign } from 'lucide-react';
import type { Session } from '@/types/agent.js';

interface SessionCardProps {
  session: Session;
  isActive?: boolean;
  onClick: (session: Session) => void;
}

export function SessionCard({ session, isActive, onClick }: SessionCardProps) {
  const formattedDate = new Date(session.last_active).toLocaleString();
  const costFormatted = `$${session.total_cost_usd.toFixed(4)}`;

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isActive ? 'ring-2 ring-primary' : ''
      }`}
      onClick={() => onClick(session)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-mono truncate flex-1">
            {session.id}
          </CardTitle>
          {isActive && (
            <Badge variant="default" className="ml-2 text-xs">
              Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center text-xs text-muted-foreground">
          <Clock className="h-3 w-3 mr-1" />
          {formattedDate}
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center text-muted-foreground">
            <MessageSquare className="h-3 w-3 mr-1" />
            {session.turns} turns
          </div>
          <div className="flex items-center text-muted-foreground">
            <DollarSign className="h-3 w-3 mr-1" />
            {costFormatted}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
