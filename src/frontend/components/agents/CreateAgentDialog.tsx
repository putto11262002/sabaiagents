import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.js';
import { AgentForm } from './AgentForm.js';
import type { Agent } from '@/types/agent.js';

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Agent>) => void;
  agent?: Agent;
}

export function CreateAgentDialog({
  open,
  onOpenChange,
  onSubmit,
  agent,
}: CreateAgentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {agent ? 'Edit Agent' : 'Create New Agent'}
          </DialogTitle>
          <DialogDescription>
            {agent
              ? 'Update your agent configuration'
              : 'Configure a new agent for your tasks'}
          </DialogDescription>
        </DialogHeader>
        <AgentForm
          agent={agent}
          onSubmit={(data) => {
            onSubmit(data);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
