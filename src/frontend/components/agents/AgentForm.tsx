import React, { useState } from 'react';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Label } from '@/components/ui/label.js';
import { Textarea } from '@/components/ui/textarea.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.js';
import type { Agent } from '@/types/agent.js';

interface AgentFormProps {
  agent?: Agent;
  onSubmit: (data: Partial<Agent>) => void;
  onCancel: () => void;
}

const AVAILABLE_TOOLS = [
  'Read',
  'Write',
  'Edit',
  'Bash',
  'Grep',
  'Glob',
  'Task',
  'WebFetch',
  'WebSearch',
];

export function AgentForm({ agent, onSubmit, onCancel }: AgentFormProps) {
  const [formData, setFormData] = useState<Partial<Agent>>({
    name: agent?.name || '',
    cwd: agent?.cwd || process.cwd() || '/home/user/sabaiagents',
    description: agent?.description || '',
    tools: agent?.tools || [],
  });

  const [selectedTools, setSelectedTools] = useState<string[]>(
    agent?.tools || []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      tools: selectedTools,
    });
  };

  const toggleTool = (tool: string) => {
    setSelectedTools((prev) =>
      prev.includes(tool)
        ? prev.filter((t) => t !== tool)
        : [...prev, tool]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Agent Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Code Reviewer"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Brief description of this agent's purpose"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cwd">Working Directory *</Label>
        <Input
          id="cwd"
          value={formData.cwd}
          onChange={(e) => setFormData({ ...formData, cwd: e.target.value })}
          placeholder="/path/to/project"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Tools</Label>
        <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
          {AVAILABLE_TOOLS.map((tool) => (
            <div key={tool} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`tool-${tool}`}
                checked={selectedTools.includes(tool)}
                onChange={() => toggleTool(tool)}
                className="rounded border-gray-300"
              />
              <Label
                htmlFor={`tool-${tool}`}
                className="font-normal cursor-pointer"
              >
                {tool}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {agent ? 'Update Agent' : 'Create Agent'}
        </Button>
      </div>
    </form>
  );
}
