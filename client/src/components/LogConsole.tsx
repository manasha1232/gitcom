import React, { useEffect, useRef } from 'react';
import type { ExecutionLog } from '../api/client';
import { Terminal, X, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
  logs: ExecutionLog[];
  onClear?: () => void;
  maxHeight?: string;
  title?: string;
}

const levelColor: Record<string, string> = {
  INFO: 'text-zinc-400',
  SUCCESS: 'text-emerald-400',
  WARN: 'text-amber-400',
  ERROR: 'text-rose-400',
  AGENT: 'text-indigo-400',
};

const stepColor: Record<string, string> = {
  ANALYZE: 'text-cyan-500',
  SELECT_TASK: 'text-purple-400',
  GENERATE_CODE: 'text-blue-400',
  TEST: 'text-emerald-500',
  COMMIT: 'text-indigo-400',
  PUSH: 'text-violet-400',
  SYSTEM: 'text-zinc-500',
};

const levelPrefix: Record<string, string> = {
  INFO: '●',
  SUCCESS: '✓',
  WARN: '⚠',
  ERROR: '✗',
  AGENT: '→',
};

function formatTs(ts?: string) {
  if (!ts) return new Date().toLocaleTimeString('en-US', { hour12: false });
  try {
    return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
  } catch {
    return '--:--:--';
  }
}

export default function LogConsole({ logs, onClear, maxHeight = '400px', title = 'Execution Console' }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  return (
    <div className="card overflow-hidden flex flex-col" style={{ maxHeight }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2a3d] bg-[#0a0f1a]">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-indigo-400" />
          <span className="text-xs font-medium text-zinc-300">{title}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono">{logs.length} lines</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Traffic lights */}
          <div className="flex gap-1.5 mr-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
          </div>
          {onClear && (
            <button onClick={onClear} className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Console body */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs bg-[#050810] space-y-0.5">
        {logs.length === 0 ? (
          <div className="text-zinc-600 text-center py-8">
            <Terminal size={24} className="mx-auto mb-2 opacity-30" />
            <div>Waiting for agent output...</div>
          </div>
        ) : (
          logs.map((log, i) => {
            const stepName = log.stage || log.step || 'INFO';
            const logTs = log.createdAt || log.timestamp;
            return (
              <div key={log.id || i} className="flex gap-2 group hover:bg-white/[0.02] px-1 py-0.5 rounded">
                <span className="text-zinc-600 flex-shrink-0 select-none">[{formatTs(logTs)}]</span>
                <span className={clsx('flex-shrink-0 select-none', stepColor[stepName] || 'text-zinc-500')}>
                  [{stepName}]
                </span>
                <span className={clsx('flex-shrink-0', levelColor[log.level] || 'text-zinc-400')}>
                  {levelPrefix[log.level] || '·'}
                </span>
                <span className={clsx(levelColor[log.level] || 'text-zinc-300')}>{log.message}</span>
                {log.details && <span className="text-zinc-600 ml-1 truncate">{log.details}</span>}
              </div>
            );
          })
        )}

        {/* Blinking cursor */}
        {logs.length > 0 && (
          <div className="flex gap-2 px-1 py-0.5">
            <span className="text-zinc-600 select-none">[{formatTs(new Date().toISOString())}]</span>
            <span className="text-indigo-500 animate-blink">█</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
