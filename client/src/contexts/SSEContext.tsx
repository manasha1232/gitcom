import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { ExecutionLog, ProjectProgress, Commit } from '../api/client';

export interface SSEContextValue {
  subscribe: (projectId: string) => void;
  unsubscribe: () => void;
  logs: ExecutionLog[];
  progress: Partial<ProjectProgress> | null;
  lastCommit: Commit | null;
  agentState: string | null;
  connected: boolean;
  isConnected: boolean;
  latestLog: ExecutionLog | null;
  latestProgress: Partial<ProjectProgress> | null;
  latestCommit: Commit | null;
  clearLogs: () => void;
}

const SSEContext = createContext<SSEContextValue>({
  subscribe: () => {},
  unsubscribe: () => {},
  logs: [],
  progress: null,
  lastCommit: null,
  agentState: null,
  connected: false,
  isConnected: false,
  latestLog: null,
  latestProgress: null,
  latestCommit: null,
  clearLogs: () => {},
});

export function SSEProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [progress, setProgress] = useState<Partial<ProjectProgress> | null>(null);
  const [lastCommit, setLastCommit] = useState<Commit | null>(null);
  const [agentState, setAgentState] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [latestLog, setLatestLog] = useState<ExecutionLog | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const subscribe = useCallback((projectId: string) => {
    if (esRef.current) {
      esRef.current.close();
    }

    const es = new EventSource(`/events?projectId=${projectId}`);
    esRef.current = es;

    es.addEventListener('log', (e) => {
      try {
        const data = JSON.parse(e.data) as ExecutionLog & { projectId: string };
        setLatestLog(data);
        setLogs((prev) => [...prev.slice(-499), data]);
      } catch {}
    });

    es.addEventListener('progress', (e) => {
      try {
        const data = JSON.parse(e.data);
        setProgress(data);
      } catch {}
    });

    es.addEventListener('commit', (e) => {
      try {
        const data = JSON.parse(e.data);
        setLastCommit(data.commit);
      } catch {}
    });

    es.addEventListener('agent_state', (e) => {
      try {
        const data = JSON.parse(e.data);
        setAgentState(data.state);
      } catch {}
    });

    es.addEventListener('connected', () => {
      setConnected(true);
    });

    es.onerror = () => {
      setConnected(false);
      es.close();
      esRef.current = null;
      reconnectTimer.current = setTimeout(() => {
        subscribe(projectId);
      }, 3000);
    };

    es.onopen = () => {
      setConnected(true);
    };
  }, []);

  const unsubscribe = useCallback(() => {
    clearTimeout(reconnectTimer.current);
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setConnected(false);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setLatestLog(null);
  }, []);

  return (
    <SSEContext.Provider
      value={{
        subscribe,
        unsubscribe,
        logs,
        progress,
        lastCommit,
        agentState,
        connected,
        isConnected: connected,
        latestLog,
        latestProgress: progress,
        latestCommit: lastCommit,
        clearLogs,
      }}
    >
      {children}
    </SSEContext.Provider>
  );
}

export function useSSE() {
  return useContext(SSEContext);
}
