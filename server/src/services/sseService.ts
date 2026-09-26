import { Response } from 'express';

interface Client {
  id: string;
  projectId?: string;
  res: Response;
}

class SSEService {
  private clients: Client[] = [];

  addClient(id: string, res: Response, projectId?: string) {
    this.clients.push({ id, res, projectId });

    // Send initial handshake
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    res.on('close', () => {
      this.removeClient(id);
    });
  }

  removeClient(id: string) {
    this.clients = this.clients.filter((c) => c.id !== id);
  }

  broadcast(event: string, data: any, projectId?: string) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

    this.clients.forEach((client) => {
      if (!projectId || !client.projectId || client.projectId === projectId) {
        try {
          client.res.write(payload);
        } catch (err) {
          console.error(`Failed to send SSE to client ${client.id}:`, err);
        }
      }
    });
  }

  sendLog(projectId: string, log: {
    level: string;
    step: string;
    message: string;
    details?: string;
    timestamp?: string;
  }) {
    this.broadcast('log', {
      projectId,
      ...log,
      timestamp: log.timestamp || new Date().toISOString(),
    }, projectId);
  }

  sendAgentState(projectId: string, state: string, currentTask?: string) {
    this.broadcast('agent_state', {
      projectId,
      state,
      currentTask,
      timestamp: new Date().toISOString(),
    }, projectId);
  }

  sendProgressUpdate(projectId: string, progress: {
    currentDay: number;
    currentTaskIndex: number;
    completedTasks: number;
    totalTasks: number;
    overallProgress: number;
    testsPassingPct: number;
    status: string;
    agentState: string;
  }) {
    this.broadcast('progress', {
      projectId,
      ...progress,
    }, projectId);
  }

  sendCommit(projectId: string, commit: any) {
    this.broadcast('commit', {
      projectId,
      commit,
    }, projectId);
  }
}

export const sseService = new SSEService();
