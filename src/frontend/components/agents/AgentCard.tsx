import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.js';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Settings, Play } from 'lucide-react';
import type { Agent } from '@/types/agent.js';

interface AgentCardProps {
  agent: Agent;
  onConfigure: (agent: Agent) => void;
  onSelect: (agent: Agent) => void;
}

export function AgentCard({ agent, onConfigure, onSelect }: AgentCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{agent.name}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {agent.description || 'No description'}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onConfigure(agent);
            }}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Working Directory</p>
            <p className="text-sm font-mono bg-muted px-2 py-1 rounded text-xs">
              {agent.cwd}
            </p>
          </div>
          {agent.tools && agent.tools.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Tools</p>
              <div className="flex flex-wrap gap-1">
                {agent.tools.map((tool) => (
                  <Badge key={tool} variant="secondary" className="text-xs">
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(agent);
            }}
            className="w-full"
            size="sm"
          >
            <Play className="h-3 w-3 mr-1" />
            Start Session
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
