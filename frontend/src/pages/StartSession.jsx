import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PlayCircle, RotateCcw, Shield, ShieldAlert, Sparkles } from 'lucide-react';

export default function StartSession() {
  const [goal, setGoal] = useState('');
  const [duration, setDuration] = useState(25);
  const [mode, setMode] = useState('soft');
  const [lastGoal, setLastGoal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { activeSession, refreshActiveSession } = useAuth();
  const navigate = useNavigate();

  // If there is already an active session, redirect to active session page
  useEffect(() => {
    if (activeSession) {
      navigate('/active');
    }
  }, [activeSession, navigate]);

  // Load last session goal for quick restart
  useEffect(() => {
    async function loadLastGoal() {
      try {
        const res = await api.sessions.getLastGoal();
        if (res.last_session) {
          setLastGoal(res.last_session);
        }
      } catch (err) {
        console.warn('Could not load last goal:', err.message);
      }
    }
    loadLastGoal();
  }, []);

  const handleStartSession = async (e) => {
    e?.preventDefault();
    if (goal.trim().length < 3) {
      setError('Please enter a goal with at least 3 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.sessions.start({
        goal: goal.trim(),
        duration_minutes: duration,
        mode,
      });
      await refreshActiveSession();
      navigate('/active');
    } catch (err) {
      setError(err.message || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeLastGoal = async () => {
    if (!lastGoal) return;
    setGoal(lastGoal.goal);
    setDuration(lastGoal.duration_minutes || 25);
    setMode(lastGoal.mode || 'soft');

    setLoading(true);
    setError('');

    try {
      await api.sessions.start({
        goal: lastGoal.goal,
        duration_minutes: lastGoal.duration_minutes || 25,
        mode: lastGoal.mode || 'soft',
      });
      await refreshActiveSession();
      navigate('/active');
    } catch (err) {
      setError(err.message || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const durations = [15, 25, 45, 60];

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-ink">
          SET YOUR AIM
        </h1>
        <p className="text-xs md:text-sm font-semibold text-ink-secondary mt-1">
          Define your focus intention. Aimly will safeguard your attention.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-amber/30 border border-amber/60 text-xs font-bold text-ink">
          {error}
        </div>
      )}

      {/* Main Start Form Card */}
      <div className="glass-panel p-6 md:p-8 shadow-frosted space-y-6">
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-ink mb-2">
            What is your aim for this session?
          </label>
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Study Graph Traversal Algorithms in DSA"
            maxLength={120}
            className="w-full h-14 px-5 rounded-full glass-input text-base font-bold text-ink placeholder:text-ink/40"
          />
          <div className="flex justify-between items-center mt-2 px-2 text-[11px] text-ink-muted font-semibold">
            <span>Keep it concise (3-120 characters)</span>
            <span>{goal.length}/120</span>
          </div>
        </div>

        {/* Duration Chips */}
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-ink mb-3">
            Session Duration
          </label>
          <div className="grid grid-cols-4 gap-3">
            {durations.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`h-12 rounded-full font-black text-sm transition-all ${
                  duration === d
                    ? 'bg-primary text-ink shadow-md scale-105'
                    : 'bg-soft-orange text-ink hover:bg-soft-orange/80'
                }`}
              >
                {d} min
              </button>
            ))}
          </div>
        </div>

        {/* Soft / Strict Mode Toggle */}
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-ink mb-3">
            Enforcement Mode
          </label>
          <div className="grid grid-cols-2 p-1.5 rounded-full bg-black/5 gap-2 border border-ink/10">
            <button
              type="button"
              onClick={() => setMode('soft')}
              className={`h-11 rounded-full font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                mode === 'soft'
                  ? 'bg-amber text-ink shadow-sm'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Soft Mode</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('strict')}
              className={`h-11 rounded-full font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                mode === 'strict'
                  ? 'bg-ink text-white shadow-sm'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Strict Mode</span>
            </button>
          </div>

          <div className="p-3 mt-3 rounded-2xl bg-white/60 border border-white text-xs font-semibold text-ink-secondary leading-relaxed">
            {mode === 'soft' ? (
              <span>
                <strong className="text-ink">Soft mode:</strong> You will be notified with a gentle
                drift card and can choose to continue or discard.
              </span>
            ) : (
              <span>
                <strong className="text-ink">Strict mode:</strong> Distracting tabs trigger a firm
                overlay with mandatory tab closure to ensure zero compromise.
              </span>
            )}
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartSession}
          disabled={loading || goal.trim().length < 3}
          className="w-full h-14 rounded-full bg-primary text-ink text-base font-black hover:bg-primary-hover shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02]"
        >
          {loading ? (
            <span>Initiating Session...</span>
          ) : (
            <>
              <PlayCircle className="w-6 h-6" />
              <span>Start Focus Session</span>
            </>
          )}
        </button>
      </div>

      {/* Resume Last Goal Card */}
      {lastGoal && (
        <div className="glass-panel p-6 shadow-frosted flex items-center justify-between gap-4">
          <div className="flex-1 truncate">
            <span className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
              Resume Previous Goal
            </span>
            <p className="text-sm font-extrabold text-ink truncate mt-0.5">
              {lastGoal.goal}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2.5 py-0.5 rounded-full bg-soft-orange text-ink text-[10px] font-extrabold">
                {lastGoal.duration_minutes || 25} min
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber text-ink text-[10px] font-extrabold uppercase">
                {lastGoal.mode || 'soft'}
              </span>
            </div>
          </div>

          <button
            onClick={handleResumeLastGoal}
            disabled={loading}
            className="w-12 h-12 rounded-full bg-primary hover:bg-primary-hover text-ink flex items-center justify-center shadow-md shrink-0 transition-transform hover:scale-110"
            title="Start with this goal"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
