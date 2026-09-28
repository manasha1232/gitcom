import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { KeyRound, ShieldCheck, Sparkles, User, Github, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const { loginWithToken, loginAsPreconfigured, loading } = useAuth();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    setError(null);
    try {
      await loginWithToken(token.trim());
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate with GitHub Token');
    }
  };

  const handlePreconfiguredLogin = async (username: string) => {
    setError(null);
    try {
      await loginAsPreconfigured(username);
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800/80 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-4 shadow-lg shadow-emerald-500/10">
            <Sparkles size={28} />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
            CommitFlow AI
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Sign in to access your isolated developer dashboard
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <ShieldCheck size={14} className="text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1-Click Quick Accounts */}
        <div className="mb-6">
          <label className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-3 block">
            Select Developer Account
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => handlePreconfiguredLogin('manasha1232')}
              className="group flex flex-col items-center justify-center p-4 rounded-xl bg-slate-800/50 hover:bg-emerald-950/40 border border-slate-700/60 hover:border-emerald-500/50 transition-all text-left relative overflow-hidden"
            >
              <img
                src="https://avatars.githubusercontent.com/u/209326007?v=4"
                alt="manasha1232"
                className="w-10 h-10 rounded-full border border-emerald-500/40 mb-2 shadow-md"
              />
              <span className="font-semibold text-xs text-slate-200 group-hover:text-emerald-300">
                manasha
              </span>
              <span className="text-[10px] text-slate-400 font-mono">manasha1232</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handlePreconfiguredLogin('Vidhushaaa30')}
              className="group flex flex-col items-center justify-center p-4 rounded-xl bg-slate-800/50 hover:bg-emerald-950/40 border border-slate-700/60 hover:border-emerald-500/50 transition-all text-left relative overflow-hidden"
            >
              <img
                src="https://github.com/Vidhushaaa30.png"
                alt="Vidhushaaa30"
                className="w-10 h-10 rounded-full border border-teal-500/40 mb-2 shadow-md"
              />
              <span className="font-semibold text-xs text-slate-200 group-hover:text-emerald-300">
                vidhusha
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Vidhushaaa30</span>
            </button>
          </div>
        </div>

        <div className="relative my-6 flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[10px] text-slate-500 uppercase tracking-widest absolute">
            or connect token
          </span>
        </div>

        {/* Custom Token Login Form */}
        <form onSubmit={handleCustomLogin} className="space-y-4">
          <div>
            <label className="text-[11px] font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <KeyRound size={12} className="text-emerald-400" />
              GitHub Personal Access Token
            </label>
            <input
              type="password"
              placeholder="Paste your ghp_xxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 placeholder-slate-600 font-mono text-xs focus:outline-none focus:border-emerald-500/80 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 font-medium text-slate-950 text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Connect & Enter Dashboard</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1">
          <Github size={11} />
          <span>Each user gets a private, isolated dashboard</span>
        </div>
      </div>
    </div>
  );
};
