export interface Agent {
  id: string;
  name: string;
  cwd: string;
  tools?: string[];
  description?: string;
  createdAt: number;
  lastActive?: number;
}

export interface Session {
  id: string;
  agentId?: string;
  created_at: number;
  last_active: number;
  turns: number;
  total_cost_usd: number;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
