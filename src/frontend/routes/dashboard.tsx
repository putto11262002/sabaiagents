import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.js';
import { Separator } from '@/components/ui/separator.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.js';
import { ScrollArea } from '@/components/ui/scroll-area.js';
import { Plus, Settings } from 'lucide-react';

// Agent components
import { AgentCard } from '@/components/agents/AgentCard.js';
import { AgentDetails } from '@/components/agents/AgentDetails.js';
import { CreateAgentDialog } from '@/components/agents/CreateAgentDialog.js';

// Session components
import { SessionList } from '@/components/sessions/SessionList.js';
import { SessionStats } from '@/components/sessions/SessionStats.js';

// Chat components
import { ChatWindow } from '@/components/chat/ChatWindow.js';

import type { Agent, Session, Message } from '@/types/agent.js';

export default function Dashboard() {
  // State management
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Dialog states
  const [showAgentDetails, setShowAgentDetails] = useState(false);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // Load initial data
  useEffect(() => {
    loadAgents();
    loadSessions();
  }, []);

  // Load messages when session changes
  useEffect(() => {
    if (activeSession) {
      loadMessages(activeSession.id);
    } else {
      setMessages([]);
    }
  }, [activeSession?.id]);

  // API functions (placeholder implementations)
  const loadAgents = async () => {
    // TODO: Replace with actual API call
    const mockAgents: Agent[] = [
      {
        id: '1',
        name: 'Code Reviewer',
        cwd: '/home/user/sabaiagents',
        tools: ['Read', 'Grep', 'Glob'],
        description: 'Reviews code for quality and best practices',
        createdAt: Date.now() - 86400000,
        lastActive: Date.now() - 3600000,
      },
      {
        id: '2',
        name: 'Documentation Writer',
        cwd: '/home/user/sabaiagents',
        tools: ['Read', 'Write', 'Edit'],
        description: 'Generates and updates documentation',
        createdAt: Date.now() - 172800000,
      },
    ];
    setAgents(mockAgents);
  };

  const loadSessions = async () => {
    // TODO: Replace with actual API call
    const mockSessions: Session[] = [
      {
        id: 'sess_01HXA2B3C4D5E6F7G8H9J0K1',
        agentId: '1',
        created_at: Date.now() - 7200000,
        last_active: Date.now() - 3600000,
        turns: 15,
        total_cost_usd: 0.0234,
      },
      {
        id: 'sess_01HXB3C4D5E6F7G8H9J0K1L2',
        agentId: '1',
        created_at: Date.now() - 14400000,
        last_active: Date.now() - 7200000,
        turns: 8,
        total_cost_usd: 0.0156,
      },
    ];
    setSessions(mockSessions);
  };

  const loadMessages = async (sessionId: string) => {
    // TODO: Replace with actual API call
    const mockMessages: Message[] = [
      {
        role: 'user',
        content: 'Can you review the authentication module?',
        timestamp: Date.now() - 3600000,
      },
      {
        role: 'assistant',
        content: 'I\'ll review the authentication module for you. Let me examine the code...\n\nI found a few areas that could be improved:\n1. Add rate limiting to prevent brute force attacks\n2. Use bcrypt with a higher cost factor\n3. Implement proper session timeout handling',
        timestamp: Date.now() - 3500000,
      },
      {
        role: 'user',
        content: 'Thanks! Can you show me how to implement rate limiting?',
        timestamp: Date.now() - 3400000,
      },
      {
        role: 'assistant',
        content: 'Here\'s how to implement rate limiting using express-rate-limit:\n\n```javascript\nconst rateLimit = require(\'express-rate-limit\');\n\nconst loginLimiter = rateLimit({\n  windowMs: 15 * 60 * 1000, // 15 minutes\n  max: 5, // 5 requests per window\n  message: \'Too many login attempts\'\n});\n\napp.post(\'/login\', loginLimiter, handleLogin);\n```',
        timestamp: Date.now() - 3300000,
      },
    ];
    setMessages(mockMessages);
  };

  const handleCreateAgent = async (data: Partial<Agent>) => {
    // TODO: Replace with actual API call
    const newAgent: Agent = {
      id: Date.now().toString(),
      name: data.name!,
      cwd: data.cwd!,
      tools: data.tools || [],
      description: data.description,
      createdAt: Date.now(),
    };
    setAgents([...agents, newAgent]);
  };

  const handleUpdateAgent = async (data: Partial<Agent>) => {
    // TODO: Replace with actual API call
    if (editingAgent) {
      const updatedAgents = agents.map((agent) =>
        agent.id === editingAgent.id ? { ...agent, ...data } : agent
      );
      setAgents(updatedAgents);
      setEditingAgent(null);
    }
  };

  const handleConfigureAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setShowCreateAgent(true);
  };

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    // Load sessions for this agent
    const agentSessions = sessions.filter((s) => s.agentId === agent.id);
    if (agentSessions.length > 0) {
      setActiveSession(agentSessions[0]);
    } else {
      // Create new session
      const newSession: Session = {
        id: `sess_${Date.now()}`,
        agentId: agent.id,
        created_at: Date.now(),
        last_active: Date.now(),
        turns: 0,
        total_cost_usd: 0,
      };
      setSessions([newSession, ...sessions]);
      setActiveSession(newSession);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!activeSession) return;

    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    setMessages([...messages, userMessage]);
    setIsLoading(true);

    // TODO: Replace with actual API call
    setTimeout(() => {
      const assistantMessage: Message = {
        role: 'assistant',
        content: 'This is a placeholder response. The actual agent will respond here.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);

      // Update session
      setActiveSession({
        ...activeSession,
        last_active: Date.now(),
        turns: activeSession.turns + 1,
        total_cost_usd: activeSession.total_cost_usd + 0.001,
      });
    }, 1000);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Agents */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Agents</h2>
            <Button
              size="sm"
              onClick={() => {
                setEditingAgent(null);
                setShowCreateAgent(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onConfigure={handleConfigureAgent}
                onSelect={handleSelectAgent}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              {selectedAgent && (
                <p className="text-sm text-muted-foreground mt-1">
                  Active Agent: {selectedAgent.name}
                </p>
              )}
            </div>
            {selectedAgent && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAgentDetails(true);
                }}
              >
                <Settings className="h-4 w-4 mr-1" />
                Agent Details
              </Button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedAgent ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">No agent selected</p>
                <p className="text-sm">Select an agent to start a session</p>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="chat" className="flex-1 flex flex-col">
              <div className="border-b px-4">
                <TabsList>
                  <TabsTrigger value="chat">Chat</TabsTrigger>
                  <TabsTrigger value="sessions">Sessions</TabsTrigger>
                  {activeSession && <TabsTrigger value="stats">Stats</TabsTrigger>}
                </TabsList>
              </div>

              <TabsContent value="chat" className="flex-1 m-0 overflow-hidden">
                <ChatWindow
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                />
              </TabsContent>

              <TabsContent value="sessions" className="flex-1 m-0 overflow-hidden">
                <SessionList
                  sessions={sessions.filter((s) => s.agentId === selectedAgent.id)}
                  activeSessionId={activeSession?.id}
                  onSessionSelect={(session) => {
                    setActiveSession(session);
                  }}
                />
              </TabsContent>

              {activeSession && (
                <TabsContent value="stats" className="flex-1 m-0 p-4 overflow-auto">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Session Statistics</h3>
                      <SessionStats session={activeSession} />
                    </div>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-2">Session ID</h4>
                      <p className="text-sm font-mono text-muted-foreground bg-muted px-3 py-2 rounded">
                        {activeSession.id}
                      </p>
                    </div>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <AgentDetails
        agent={selectedAgent}
        open={showAgentDetails}
        onOpenChange={setShowAgentDetails}
      />
      <CreateAgentDialog
        open={showCreateAgent}
        onOpenChange={setShowCreateAgent}
        onSubmit={editingAgent ? handleUpdateAgent : handleCreateAgent}
        agent={editingAgent || undefined}
      />
    </div>
  );
}
