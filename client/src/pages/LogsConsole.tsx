import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Terminal, Trash2, Download, Pause, Play, Search,
  Filter, RefreshCw, Activity, ArrowDown
} from 'lucide-react';
import { projectsApi } from '../api/client';
import { useSSE } from '../contexts/SSEContext';
import type { Project, ExecutionLog } from '../api/client';

export default function LogsConsole() {
  const { id } = useParams<{ id: string }>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(id || '');
  const [project, setProject] = useState<Project | null>(null);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isLivePaused, setIsLivePaused] = useState(false);

  const consoleEndRef = useRef<HTMLDivElement>(null);
  const { isConnected, latestLog } = useSSE();

  useEffect(() => {
    projectsApi.list().then((res) => {
      if (res.success && res.data) {
        setProjects(res.data);
        if (!selectedProjectId && res.data.length > 0) {
          setSelectedProjectId(res.data[0].id);
        }
      }
    });
  }, []);

  const fetchLogs = async () => {
    if (!selectedProjectId) return;
    try {
      const [projRes, logRes] = await Promise.all([
        projectsApi.get(selectedProjectId),
        projectsApi.logs(selectedProjectId, 200),
      ]);
      if (projRes.success) setProject(projRes.data);
      if (logRes.success && logRes.data) {
        setLogs(logRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchLogs();
  }, [selectedProjectId]);

  // Handle SSE new log
  useEffect(() => {
    if (isLivePaused) return;
    if (latestLog && latestLog.projectId === selectedProjectId) {
      setLogs((prev) => {
        if (prev.some((l) => l.id === latestLog.id)) return prev;
        return [...prev, latestLog];
      });
    }
  }, [latestLog, selectedProjectId, isLivePaused]);

  useEffect(() => {
    if (autoScroll && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleClear = () => {
    setLogs([]);
  };

  const handleDownloadLogs = () => {
    const text = logs
      .map((l) => `[${l.createdAt}] [${l.level}] [${l.stage}] ${l.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commitflow-logs-${project?.name || 'project'}-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter((log) => {
    if (levelFilter !== 'ALL' && log.level !== levelFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.stage.toLowerCase().includes(q) ||
        log.level.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getLevelStyle = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'text-rose-400 font-bold';
      case 'WARN':
        return 'text-amber-400';
      case 'AGENT':
        return 'text-purple-400 font-semibold';
      case 'GIT':
        return 'text-emerald-400';
      case 'INFO':
      default:
        return 'text-indigo-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Terminal className="text-indigo-400" size={24} />
            Real-Time Execution Logs
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Live telemetry, agent cognitive steps, file synthesis events, and git transaction records
          </p>
        </div>

        {/* Project Selector & Actions */}
        <div className="flex items-center gap-3">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="input-field max-w-xs text-sm"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button onClick={fetchLogs} className="btn-secondary p-2.5 text-xs" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Terminal Toolbar */}
      <div className="card p-3.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Filters & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Level Filter */}
          <div className="flex items-center bg-zinc-950 rounded-lg p-0.5 border border-zinc-800">
            {['ALL', 'AGENT', 'GIT', 'INFO', 'ERROR'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  levelFilter === lvl
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Filter log stream..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-8 pr-3 py-1 text-xs w-48"
            />
          </div>
        </div>

        {/* Right: Controls & Status */}
        <div className="flex items-center gap-2">
          {/* Live Status indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected && !isLivePaused ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-zinc-400">
              {isLivePaused ? 'PAUSED' : isConnected ? 'STREAM ACTIVE' : 'CONNECTING'}
            </span>
          </div>

          <button
            onClick={() => setIsLivePaused(!isLivePaused)}
            className={`btn-secondary text-xs flex items-center gap-1 py-1 px-2.5 ${
              isLivePaused ? 'text-amber-400 border-amber-500/30' : ''
            }`}
            title={isLivePaused ? 'Resume stream' : 'Pause stream'}
          >
            {isLivePaused ? <Play size={12} /> : <Pause size={12} />}
            {isLivePaused ? 'Resume' : 'Pause'}
          </button>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`btn-secondary text-xs flex items-center gap-1 py-1 px-2.5 ${
              autoScroll ? 'text-indigo-400 border-indigo-500/30' : ''
            }`}
            title="Auto-scroll to bottom"
          >
            <ArrowDown size={12} />
            Auto-Scroll
          </button>

          <button
            onClick={handleDownloadLogs}
            disabled={logs.length === 0}
            className="btn-secondary text-xs flex items-center gap-1 py-1 px-2.5"
            title="Export logs to file"
          >
            <Download size={12} />
            Export
          </button>

          <button
            onClick={handleClear}
            disabled={logs.length === 0}
            className="btn-secondary text-xs flex items-center gap-1 py-1 px-2.5 text-zinc-400 hover:text-rose-400"
            title="Clear buffer"
          >
            <Trash2 size={12} />
            Clear
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="card p-0 border-zinc-800 bg-[#050810] shadow-2xl overflow-hidden font-mono text-xs">
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0a0f1d] border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="text-zinc-500 text-[11px] ml-2 font-semibold">
              commitflow-agent://stdout
            </span>
          </div>

          <div className="text-[11px] text-zinc-500">
            {filteredLogs.length} events logged
          </div>
        </div>

        {/* Terminal Output */}
        <div className="p-4 h-[600px] overflow-y-auto space-y-1 select-text scrollbar-thin scrollbar-thumb-zinc-800">
          {filteredLogs.length === 0 ? (
            <div className="text-zinc-600 italic py-10 text-center">
              No log messages received matching current filters.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const time = new Date(log.createdAt).toLocaleTimeString();

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-2.5 py-0.5 leading-relaxed hover:bg-white/[0.02] px-1 rounded transition-colors group"
                >
                  <span className="text-zinc-600 select-none text-[11px] shrink-0">
                    {time}
                  </span>

                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase shrink-0 border border-white/5 ${getLevelStyle(
                      log.level
                    )}`}
                  >
                    {log.level}
                  </span>

                  <span className="text-indigo-400/80 text-[11px] font-semibold shrink-0">
                    [{log.stage}]
                  </span>

                  <span className="text-zinc-300 break-all flex-1">
                    {log.message}
                  </span>
                </div>
              );
            })
          )}
          <div ref={consoleEndRef} />
        </div>
      </div>
    </div>
  );
}
