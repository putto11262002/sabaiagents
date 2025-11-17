import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.js';
import { MessageSquare, Clock, DollarSign, Activity } from 'lucide-react';
import type { Session } from '@/types/agent.js';

interface SessionStatsProps {
  session: Session;
}

export function SessionStats({ session }: SessionStatsProps) {
  const stats = [
    {
      title: 'Total Turns',
      value: session.turns.toString(),
      icon: MessageSquare,
      description: 'Conversation exchanges',
    },
    {
      title: 'Total Cost',
      value: `$${session.total_cost_usd.toFixed(4)}`,
      icon: DollarSign,
      description: 'API usage cost',
    },
    {
      title: 'Created',
      value: new Date(session.created_at).toLocaleDateString(),
      icon: Clock,
      description: 'Session start date',
    },
    {
      title: 'Last Active',
      value: new Date(session.last_active).toLocaleTimeString(),
      icon: Activity,
      description: 'Last interaction time',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
