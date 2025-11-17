import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.js';
import { Badge } from '@/components/ui/badge.js';
import { Separator } from '@/components/ui/separator.js';
import type { Agent } from '@/types/agent.js';

interface AgentDetailsProps {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentDetails({ agent, open, onOpenChange }: AgentDetailsProps) {
  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{agent.name}</DialogTitle>
          <DialogDescription>
            {agent.description || 'No description provided'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Agent ID</h4>
            <p className="text-sm text-muted-foreground font-mono bg-muted px-3 py-2 rounded">
              {agent.id}
            </p>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-2">Working Directory</h4>
            <p className="text-sm text-muted-foreground font-mono bg-muted px-3 py-2 rounded">
              {agent.cwd}
            </p>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-2">Tools</h4>
            {agent.tools && agent.tools.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {agent.tools.map((tool) => (
                  <Badge key={tool} variant="secondary">
                    {tool}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tools configured</p>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-1">Created</h4>
              <p className="text-sm text-muted-foreground">
                {new Date(agent.createdAt).toLocaleString()}
              </p>
            </div>
            {agent.lastActive && (
              <div>
                <h4 className="text-sm font-medium mb-1">Last Active</h4>
                <p className="text-sm text-muted-foreground">
                  {new Date(agent.lastActive).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
