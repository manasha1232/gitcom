import React, { useEffect, useState } from 'react';
import { settingsApi, githubApi } from '../api/client';
import type { SystemSettings } from '../api/client';
import {
  Settings2, Github, Cpu, Clock, Save, CheckCircle2,
  AlertCircle, Loader2, Key, Zap, Eye, EyeOff, Mail, GitCommit, User
} from 'lucide-react';
import { clsx } from 'clsx';

export default function Settings() {
  const [settings, setSettings] = useState<Partial<SystemSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ghToken, setGhToken] = useState('');
  const [ghConnecting, setGhConnecting] = useState(false);
  const [ghStatus, setGhStatus] = useState<{ connected: boolean; username?: string } | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [localApiKey, setLocalApiKey] = useState('');
  const [speedMs, setSpeedMs] = useState(2500);

  useEffect(() => {
    Promise.all([
      settingsApi.get().then((r) => {
        setSettings(r.data);
        setSpeedMs(r.data.executionSpeedMs ?? 2500);
      }),
      githubApi.status().then((r) => setGhStatus(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await settingsApi.update({
        aiProvider: settings.aiProvider,
        aiModel: settings.aiModel,
        autoPushOnCommit: settings.autoPushOnCommit,
        executionSpeedMs: speedMs,
        gitAuthorName: settings.gitAuthorName,
        gitAuthorEmail: settings.gitAuthorEmail,
        ...(localApiKey ? { aiApiKey: localApiKey } : {}),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConnectGitHub = async () => {
    if (!ghToken.trim()) return;
    setGhConnecting(true);
    setError(null);
    try {
      const res = await githubApi.connect({ githubToken: ghToken });
      setGhStatus({ connected: true, username: res.data.username });
      setGhToken('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGhConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  const speedLabel = speedMs < 1000 ? `${speedMs}ms (Ultra Fast)` :
    speedMs < 3000 ? `${speedMs}ms (Fast)` :
    speedMs < 8000 ? `${(speedMs / 1000).toFixed(1)}s (Normal)` :
    `${(speedMs / 1000).toFixed(0)}s (Slow / Realistic)`;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Configure GitHub integration, AI provider, and execution parameters</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* GitHub Section */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Github size={16} className="text-zinc-300" />
          <h2 className="text-sm font-semibold text-zinc-200">GitHub Integration</h2>
        </div>

        {ghStatus?.connected ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <div>
              <div className="text-sm text-emerald-300 font-medium">Connected</div>
              <div className="text-xs text-zinc-500">@{ghStatus.username}</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/60 border border-zinc-700 mb-4">
            <div className="w-2 h-2 rounded-full bg-zinc-500" />
            <div className="text-sm text-zinc-400">Not connected</div>
          </div>
        )}

        <div className="space-y-3">
          <label className="label flex items-center gap-2"><Key size={11} />Personal Access Token</label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              className="input pr-10 font-mono"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={ghToken}
              onChange={(e) => setGhToken(e.target.value)}
            />
            <button
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <div className="text-[10px] text-zinc-600">Required scopes: <span className="font-mono text-zinc-500">repo, workflow</span></div>
          <button
            onClick={handleConnectGitHub}
            disabled={ghConnecting || !ghToken.trim()}
            className="btn-primary flex items-center gap-2"
          >
            {ghConnecting ? <Loader2 size={14} className="animate-spin" /> : <Github size={14} />}
            {ghStatus?.connected ? 'Reconnect GitHub' : 'Connect GitHub'}
          </button>
        </div>
      </div>

      {/* Git Author & Contribution Identity Section */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <GitCommit size={16} className="text-emerald-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Git Commit Author & Contributions</h2>
        </div>

        <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
          GitHub uses your <span className="text-emerald-400 font-medium">Git Author Email</span> to attribute commits to your account and turn your GitHub contribution graph green. Make sure this matches a verified email in your GitHub account.
        </p>

        <div className="space-y-4">
          <div>
            <label className="label flex items-center gap-2"><User size={11} />Git Author Name</label>
            <input
              type="text"
              className="input font-mono"
              placeholder="e.g. Vidhushaaa30"
              value={settings.gitAuthorName ?? ''}
              onChange={(e) => setSettings((s) => ({ ...s, gitAuthorName: e.target.value }))}
            />
          </div>

          <div>
            <label className="label flex items-center gap-2"><Mail size={11} />Git Author Email (GitHub Contribution Email)</label>
            <input
              type="email"
              className="input font-mono"
              placeholder="e.g. vidhushanagarajan30@gmail.com"
              value={settings.gitAuthorEmail ?? ''}
              onChange={(e) => setSettings((s) => ({ ...s, gitAuthorEmail: e.target.value }))}
            />
            <div className="text-[10px] text-emerald-500/80 mt-1 flex items-center gap-1">
              <CheckCircle2 size={11} /> Commits will appear on GitHub as your contributions.
            </div>
          </div>
        </div>
      </div>

      {/* AI Section */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Cpu size={16} className="text-zinc-300" />
          <h2 className="text-sm font-semibold text-zinc-200">AI Planning Engine</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Provider</label>
            <select
              className="input"
              value={settings.aiProvider || 'autonomous_builtin'}
              onChange={(e) => setSettings((s) => ({ ...s, aiProvider: e.target.value as any }))}
            >
              <option value="autonomous_builtin">Autonomous Built-in (No API key needed)</option>
              <option value="gemini">Google Gemini (Enhanced plans)</option>
            </select>
          </div>

          {settings.aiProvider === 'gemini' && (
            <>
              <div>
                <label className="label flex items-center gap-2"><Key size={11} />Gemini API Key</label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    className="input pr-10 font-mono"
                    placeholder="AIza..."
                    value={localApiKey}
                    onChange={(e) => setLocalApiKey(e.target.value)}
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Model</label>
                <select
                  className="input"
                  value={settings.aiModel || 'gemini-2.0-flash'}
                  onChange={(e) => setSettings((s) => ({ ...s, aiModel: e.target.value }))}
                >
                  <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                  <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Execution Section */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} className="text-zinc-300" />
          <h2 className="text-sm font-semibold text-zinc-200">Execution Settings</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Task Execution Speed — {speedLabel}</label>
            <input
              type="range"
              min={500}
              max={30000}
              step={500}
              value={speedMs}
              onChange={(e) => setSpeedMs(parseInt(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
              <span>500ms (Ultra Fast)</span>
              <span>30s (Realistic)</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900">
            <div>
              <div className="text-sm text-zinc-300">Auto Push on Commit</div>
              <div className="text-xs text-zinc-600">Automatically push each commit to GitHub</div>
            </div>
            <button
              onClick={() => setSettings((s) => ({ ...s, autoPushOnCommit: !s.autoPushOnCommit }))}
              className={clsx(
                'relative w-10 h-5.5 rounded-full transition-colors',
                settings.autoPushOnCommit ? 'bg-indigo-600' : 'bg-zinc-700'
              )}
              style={{ height: '22px' }}
            >
              <div className={clsx(
                'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
                settings.autoPushOnCommit ? 'left-5' : 'left-0.5'
              )} />
            </button>
          </div>
        </div>
      </div>

      {/* Save */}
      <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 w-full justify-center py-3">
        {saving ? (
          <><Loader2 size={16} className="animate-spin" /> Saving...</>
        ) : saved ? (
          <><CheckCircle2 size={16} /> Saved!</>
        ) : (
          <><Save size={16} /> Save Settings</>
        )}
      </button>
    </div>
  );
}
