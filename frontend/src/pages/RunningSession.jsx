import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ExtensionModal from '../components/ExtensionModal';
import SemanticDriftOverlay from '../components/SemanticDriftOverlay';
import confetti from 'canvas-confetti';
import {
  Play,
  Pause,
  StopCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  ExternalLink,
  Flame,
  Coffee,
  Puzzle,
  Zap,
  ArrowRight,
  Download,
} from 'lucide-react';

export default function RunningSession() {
  const { activeSession, setActiveSession, refreshActiveSession, rewardsSummary, refreshRewards } = useAuth();
  const [session, setSession] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [visitedPages, setVisitedPages] = useState([]);
  const [driftsCount, setDriftsCount] = useState(0);
  const [onGoalStreak, setOnGoalStreak] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [breakEndsAt, setBreakEndsAt] = useState(null);
  const [breakRemainingSecs, setBreakRemainingSecs] = useState(0);
  const [breaksUsed, setBreaksUsed] = useState(0);
  const [redeemingBreak, setRedeemingBreak] = useState(false);
  const [breakToast, setBreakToast] = useState('');

  // Simulator & Extension state
  const [testOption, setTestOption] = useState('simulator'); // 'simulator' | 'extension'
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [driftOverlayData, setDriftOverlayData] = useState(null);
  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [simToast, setSimToast] = useState(null);

  const navigate = useNavigate();
  const pollTimerRef = useRef(null);

  // Break countdown timer ticker
  useEffect(() => {
    if (!breakEndsAt) {
      setBreakRemainingSecs(0);
      return;
    }
    const tick = () => {
      const diff = Math.max(0, Math.round((new Date(breakEndsAt).getTime() - Date.now()) / 1000));
      setBreakRemainingSecs(diff);
      if (diff <= 0) {
        setBreakEndsAt(null);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [breakEndsAt]);

  const handleRedeemBreak = async () => {
    if (!session?.id) return;
    setRedeemingBreak(true);
    setBreakToast('');
    try {
      const res = await api.rewards.redeemBreak(session.id);
      setBreakEndsAt(res.break_ends_at);
      setBreaksUsed(res.breaks_used);
      if (refreshRewards) await refreshRewards();
      setBreakToast(res.message || '5-minute break activated!');
      setTimeout(() => setBreakToast(''), 4000);
    } catch (err) {
      setBreakToast(err.message || 'Could not redeem break');
      setTimeout(() => setBreakToast(''), 4000);
    } finally {
      setRedeemingBreak(false);
    }
  };

  // Derive remaining seconds accurately from timestamps
  const calculateRemaining = (s) => {
    if (!s) return 0;
    const totalDurationSecs = (s.duration_minutes || 25) * 60;
    const startedAt = new Date(s.started_at).getTime();
    const now = Date.now();

    let pausedSecs = s.total_paused_seconds || 0;
    if (s.status === 'paused' && s.paused_at) {
      const pausedAt = new Date(s.paused_at).getTime();
      pausedSecs += Math.round((now - pausedAt) / 1000);
    }

    const elapsedTotal = Math.max(0, Math.round((now - startedAt) / 1000) - pausedSecs);
    return Math.max(0, totalDurationSecs - elapsedTotal);
  };

  // Initial session load
  useEffect(() => {
    async function loadActive() {
      try {
        const res = await api.sessions.getActive();
        if (!res.session) {
          navigate('/start');
          return;
        }
        setSession(res.session);
        setIsPaused(res.session.status === 'paused');
        setSecondsRemaining(calculateRemaining(res.session));
        if (res.active_break?.break_ends_at) {
          setBreakEndsAt(res.active_break.break_ends_at);
        }
        if (typeof res.breaks_used === 'number') {
          setBreaksUsed(res.breaks_used);
        }

        // Load visits for report/feed
        const reportRes = await api.sessions.getReport(res.session.id).catch(() => null);
        if (reportRes) {
          setVisitedPages(reportRes.drift_timeline || []);
          setDriftsCount(reportRes.drift_count || 0);
          computeOnGoalStreak(reportRes.drift_timeline || []);
        }
      } catch (err) {
        setError(err.message || 'Failed to load active session');
      } finally {
        setLoading(false);
      }
    }
    loadActive();
  }, [navigate]);

  // Compute on-goal streak from visits
  const computeOnGoalStreak = (visits) => {
    let streak = 0;
    for (let i = visits.length - 1; i >= 0; i--) {
      if (!visits[i].is_drift) {
        streak++;
      } else {
        break;
      }
    }
    setOnGoalStreak(streak);
  };

  // Poll for new visited pages every 5 seconds
  useEffect(() => {
    if (!session?.id) return;

    pollTimerRef.current = setInterval(async () => {
      try {
        const reportRes = await api.sessions.getReport(session.id);
        if (reportRes) {
          setVisitedPages(reportRes.drift_timeline || []);
          setDriftsCount(reportRes.drift_count || 0);
          computeOnGoalStreak(reportRes.drift_timeline || []);
        }
      } catch {
        // Soft fail polling silently
      }
    }, 5000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [session?.id]);

  // Local Countdown Ticker
  useEffect(() => {
    if (!session || isPaused) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session, isPaused]);

  // Auto-complete when timer hits zero
  const handleTimeExpired = async () => {
    if (!session) return;
    try {
      await api.sessions.end(session.id, 'completed');
      setActiveSession(null);
      if (refreshRewards) await refreshRewards();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      navigate(`/report/${session.id}`);
    } catch (err) {
      console.error('Failed to auto-complete session:', err);
    }
  };

  // Pause / Resume
  const handleTogglePause = async () => {
    if (!session) return;
    try {
      if (isPaused) {
        const res = await api.sessions.resume(session.id);
        setSession(res.session);
        setIsPaused(false);
      } else {
        const res = await api.sessions.pause(session.id);
        setSession(res.session);
        setIsPaused(true);
      }
      refreshActiveSession();
    } catch (err) {
      setError(err.message || 'Failed to update session state');
    }
  };

  // End Session (Completed or Discarded)
  const handleEndSession = async (status) => {
    if (!session) return;
    try {
      await api.sessions.end(session.id, status);
      setActiveSession(null);
      if (status === 'completed') {
        if (refreshRewards) await refreshRewards();
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
        });
      }
      navigate(`/report/${session.id}`);
    } catch (err) {
      setError(err.message || 'Failed to end session');
    }
  };

  // Run Semantic Simulation
  const handleRunSimulation = async (simUrlToUse, simTitleToUse) => {
    if (!session?.id) return;
    const targetUrl = simUrlToUse || customUrl || 'https://www.youtube.com/watch?v=lifestyle-vlog';
    const targetTitle = simTitleToUse || customTitle || 'Daily Lifestyle Vlog - What I Eat in a Day';

    setSimulating(true);
    setSimToast(null);
    try {
      const res = await api.relevance.check({
        session_id: session.id,
        url: targetUrl,
        title: targetTitle,
        description: targetTitle,
      });

      // Refresh report data
      const reportRes = await api.sessions.getReport(session.id).catch(() => null);
      if (reportRes) {
        setVisitedPages(reportRes.drift_timeline || []);
        setDriftsCount(reportRes.drift_count || 0);
        computeOnGoalStreak(reportRes.drift_timeline || []);
      }

      if (res.is_drift) {
        let domain = 'unknown';
        try {
          domain = new URL(targetUrl).hostname.replace(/^www\./, '');
        } catch {}
        setDriftOverlayData({
          goal: session.goal,
          score: res.score,
          mode: session.mode,
          domain,
          pageTitle: targetTitle,
          pageVisitId: res.page_visit_id,
        });
      } else {
        setSimToast({
          type: 'success',
          text: `✅ Aligned with goal! Match: ${Math.round(res.score * 100)}% ("${targetTitle}")`,
        });
        setTimeout(() => setSimToast(null), 5000);
      }
    } catch (err) {
      setSimToast({
        type: 'error',
        text: `Simulation error: ${err.message}`,
      });
      setTimeout(() => setSimToast(null), 5000);
    } finally {
      setSimulating(false);
    }
  };

  // Feedback Submission for model learning
  const handleFeedback = async (pageVisitId, domain, label) => {
    try {
      await api.relevance.feedback({ page_visit_id: pageVisitId, domain, label });
      setDriftOverlayData(null);
      setSimToast({
        type: 'success',
        text: `Feedback submitted: Domain "${domain}" updated in user profile!`,
      });
      setTimeout(() => setSimToast(null), 4000);
    } catch (err) {
      console.warn('Feedback failed:', err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-bold text-ink">Synchronizing session state...</p>
        </div>
      </div>
    );
  }

  // Format mm:ss
  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // SVG ring progress calculations
  const totalSeconds = (session?.duration_minutes || 25) * 60;
  const progressFraction = Math.max(0, Math.min(1, secondsRemaining / totalSeconds));
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progressFraction * circumference;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Session Header Card */}
      <div className="glass-panel p-6 md:p-8 shadow-frosted text-center relative overflow-hidden">
        {/* Chips at top */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${session?.mode === 'strict' ? 'bg-ink text-white' : 'bg-amber text-ink'
              }`}
          >
            {session?.mode} Mode
          </span>

          <span className="px-3 py-1 rounded-full bg-soft-orange text-ink text-xs font-extrabold flex items-center gap-1.5 border border-ink/10">
            <AlertTriangle className="w-3.5 h-3.5 text-amber" />
            <span>{driftsCount} {driftsCount === 1 ? 'drift' : 'drifts'}</span>
          </span>

          {isPaused && (
            <span className="px-3 py-1 rounded-full bg-amber text-ink text-xs font-extrabold uppercase animate-pulse">
              Paused
            </span>
          )}
        </div>

        {/* Goal Title */}
        <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-ink max-w-2xl mx-auto mb-8">
          {session?.goal}
        </h1>

        {/* 240px Circular Countdown Ring */}
        <div className="relative w-64 h-64 mx-auto flex items-center justify-center my-4">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 240 240">
            {/* Background Track Ring */}
            <circle
              cx="120"
              cy="120"
              r={radius}
              stroke="rgba(30, 30, 30, 0.08)"
              strokeWidth="14"
              fill="transparent"
            />
            {/* Dynamic Countdown Ring */}
            <circle
              cx="120"
              cy="120"
              r={radius}
              stroke={isPaused ? '#FFB422' : '#FF7A21'}
              strokeWidth="14"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>

          {/* Big Digital Countdown Numerals */}
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-5xl font-black tracking-tight text-ink tabular-nums">
              {timeFormatted}
            </span>
            <span className="text-[11px] font-black uppercase tracking-widest text-ink-muted mt-1">
              {isPaused ? 'Timer Paused' : 'Time Remaining'}
            </span>
          </div>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={handleTogglePause}
            className={`px-8 py-3.5 rounded-full font-black text-sm flex items-center gap-2 transition-all shadow-sm ${isPaused
              ? 'bg-amber text-ink hover:bg-amber-hover'
              : 'bg-white border-2 border-ink text-ink hover:bg-black/5'
              }`}
          >
            {isPaused ? <Play className="w-4 h-4 fill-ink" /> : <Pause className="w-4 h-4" />}
            <span>{isPaused ? 'Resume Focus' : 'Pause'}</span>
          </button>

          <button
            onClick={() => setShowConfirmModal(true)}
            className="px-8 py-3.5 rounded-full bg-ink text-white hover:bg-black font-black text-sm flex items-center gap-2 transition-all shadow-md"
          >
            <StopCircle className="w-4 h-4" />
            <span>End Session</span>
          </button>
        </div>

        {/* Earn-a-Break Action & Active Countdown */}
        {rewardsSummary && rewardsSummary.rewards_enabled !== false && (
          <div className="mt-6 flex flex-col items-center">
            {breakRemainingSecs > 0 ? (
              <div className="px-6 py-2.5 rounded-full bg-soft-orange border border-primary/30 flex items-center gap-2 text-xs font-black text-ink animate-pulse shadow-sm">
                <Coffee className="w-4 h-4 text-primary" />
                <span>
                  Break Active: {Math.floor(breakRemainingSecs / 60)}:
                  {String(breakRemainingSecs % 60).padStart(2, '0')} remaining (Drift checks paused)
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={handleRedeemBreak}
                  disabled={
                    redeemingBreak ||
                    isPaused ||
                    breaksUsed >= 2 ||
                    (rewardsSummary?.points_balance || 0) < 100
                  }
                  className="px-6 py-2.5 rounded-full bg-soft-orange hover:bg-primary border border-primary/30 text-ink font-extrabold text-xs flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  title={
                    isPaused
                      ? 'Resume session to take a break'
                      : breaksUsed >= 2
                      ? 'Max 2 breaks used this session'
                      : (rewardsSummary?.points_balance || 0) < 100
                      ? 'Requires 100 points'
                      : 'Take a guilt-free 5-minute break (drift warnings paused)'
                  }
                >
                  <Coffee className="w-4 h-4 text-primary" />
                  <span>
                    {redeemingBreak
                      ? 'Activating...'
                      : `Take a 5-min break (100 pts) • ${breaksUsed}/2 used`}
                  </span>
                </button>
                {breakToast && (
                  <span className="text-[11px] font-bold text-ink mt-1">{breakToast}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Intent-Aware Semantic Enforcement Options (In-Browser Simulator vs Chrome Extension) */}
      <div className="glass-panel p-6 shadow-frosted space-y-5">
        {/* Header and Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-base font-black uppercase tracking-wide text-ink">
                Test Intent Engine (Choose Option)
              </h2>
            </div>
            <p className="text-xs text-ink-secondary font-medium mt-0.5">
              Experience the core ML semantic drift detection without leaving your browser, or install the Chrome Extension.
            </p>
          </div>

          <div className="flex items-center bg-soft-orange/50 p-1 rounded-full border border-primary/20 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setTestOption('simulator')}
              className={`px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                testOption === 'simulator'
                  ? 'bg-primary text-ink shadow-xs'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              ⚡ Live Simulator (Instant)
            </button>
            <button
              onClick={() => setTestOption('extension')}
              className={`px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                testOption === 'extension'
                  ? 'bg-primary text-ink shadow-xs'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              🧩 Chrome Extension (.zip)
            </button>
          </div>
        </div>

        {/* Option 1: In-Browser Simulator */}
        {testOption === 'simulator' && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-cream/70 border border-ink/5 flex items-start gap-2.5 text-xs text-ink">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Professor / Evaluator Quick Test:</strong> Click any preset below to simulate visiting that page while focusing on <strong>"{session?.goal}"</strong>. The live backend will evaluate semantic relevance in real-time!
              </p>
            </div>

            {/* Quick Test Preset Buttons */}
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-ink-muted mb-2">
                1-Click Preset Simulations:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={simulating}
                  onClick={() =>
                    handleRunSimulation(
                      'https://www.youtube.com/watch?v=daily-vlog',
                      'Daily Lifestyle Vlog: Weekend in NYC'
                    )
                  }
                  className="p-3 rounded-2xl bg-white/70 hover:bg-white border border-amber/50 hover:border-amber text-left flex items-center justify-between text-xs font-bold text-ink shadow-2xs transition-all hover:scale-[1.01] cursor-pointer"
                >
                  <div className="truncate">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black mr-2">
                      Off-Intent (Drift)
                    </span>
                    <span className="truncate">📺 YouTube: Lifestyle Vlog</span>
                  </div>
                  <span className="text-[10px] font-black text-amber shrink-0 ml-2">Simulate →</span>
                </button>

                <button
                  type="button"
                  disabled={simulating}
                  onClick={() =>
                    handleRunSimulation(
                      'https://leetcode.com/problems/binary-tree-inorder-traversal',
                      'Binary Tree Inorder Traversal - LeetCode'
                    )
                  }
                  className="p-3 rounded-2xl bg-white/70 hover:bg-white border border-emerald-300 hover:border-emerald-500 text-left flex items-center justify-between text-xs font-bold text-ink shadow-2xs transition-all hover:scale-[1.01] cursor-pointer"
                >
                  <div className="truncate">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black mr-2">
                      On-Intent (Focus)
                    </span>
                    <span className="truncate">💻 LeetCode: Binary Tree</span>
                  </div>
                  <span className="text-[10px] font-black text-emerald-600 shrink-0 ml-2">Simulate →</span>
                </button>

                <button
                  type="button"
                  disabled={simulating}
                  onClick={() =>
                    handleRunSimulation(
                      'https://www.instagram.com/reels/comedy-trending',
                      'Viral Comedy Shorts & Memes - Instagram Reels'
                    )
                  }
                  className="p-3 rounded-2xl bg-white/70 hover:bg-white border border-amber/50 hover:border-amber text-left flex items-center justify-between text-xs font-bold text-ink shadow-2xs transition-all hover:scale-[1.01] cursor-pointer"
                >
                  <div className="truncate">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black mr-2">
                      Off-Intent (Drift)
                    </span>
                    <span className="truncate">📸 Instagram: Funny Reels</span>
                  </div>
                  <span className="text-[10px] font-black text-amber shrink-0 ml-2">Simulate →</span>
                </button>

                <button
                  type="button"
                  disabled={simulating}
                  onClick={() =>
                    handleRunSimulation(
                      'https://www.geeksforgeeks.org/dijkstras-shortest-path-algorithm-greedy-algo-7',
                      "Dijkstra's Shortest Path Algorithm - GeeksforGeeks"
                    )
                  }
                  className="p-3 rounded-2xl bg-white/70 hover:bg-white border border-emerald-300 hover:border-emerald-500 text-left flex items-center justify-between text-xs font-bold text-ink shadow-2xs transition-all hover:scale-[1.01] cursor-pointer"
                >
                  <div className="truncate">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black mr-2">
                      On-Intent (Focus)
                    </span>
                    <span className="truncate">📚 GeeksforGeeks: Dijkstra</span>
                  </div>
                  <span className="text-[10px] font-black text-emerald-600 shrink-0 ml-2">Simulate →</span>
                </button>
              </div>
            </div>

            {/* Custom URL and Title Simulation */}
            <div className="pt-2 border-t border-ink/5">
              <p className="text-[11px] font-black uppercase tracking-wider text-ink-muted mb-2">
                Or Test Any Custom Page:
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="URL (e.g. reddit.com/r/gaming)"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="flex-1 h-10 px-3.5 rounded-full glass-input text-xs font-semibold text-ink"
                />
                <input
                  type="text"
                  placeholder="Page Title (e.g. Top PC Games of 2026)"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="flex-1 h-10 px-3.5 rounded-full glass-input text-xs font-semibold text-ink"
                />
                <button
                  type="button"
                  disabled={simulating || (!customUrl && !customTitle)}
                  onClick={() => handleRunSimulation(customUrl, customTitle)}
                  className="h-10 px-6 rounded-full bg-ink text-white hover:bg-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shrink-0"
                >
                  {simulating ? 'Analyzing...' : 'Test Visit'}
                </button>
              </div>
            </div>

            {/* Simulation Toast Notification */}
            {simToast && (
              <div
                className={`p-3 rounded-2xl text-xs font-bold ${
                  simToast.type === 'error'
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                } animate-fadeIn`}
              >
                {simToast.text}
              </div>
            )}
          </div>
        )}

        {/* Option 2: Chrome Extension Setup */}
        {testOption === 'extension' && (
          <div className="p-4 rounded-2xl bg-white/70 border border-ink/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-ink uppercase flex items-center gap-2">
                <Puzzle className="w-4 h-4 text-primary" />
                Aimly Chrome Extension (Manifest V3)
              </h3>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Monitors active tabs across your browser in real time and automatically injects the drift overlay on distracting websites (like YouTube, Reddit, Instagram).
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="/aimly-extension.zip"
                download="aimly-extension.zip"
                className="h-10 px-5 rounded-full bg-primary text-ink text-xs font-black uppercase tracking-wider hover:bg-primary-hover shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download .zip</span>
              </a>
              <button
                type="button"
                onClick={() => setIsExtensionModalOpen(true)}
                className="h-10 px-4 rounded-full bg-white border border-ink/20 text-ink text-xs font-extrabold hover:bg-black/5 transition-all cursor-pointer"
              >
                Setup Guide
              </button>
            </div>
          </div>
        )}
      </div>

      {/* On-Goal Streak & Real-time Live Feed */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* On-Goal Streak Card */}
        <div className="glass-panel p-6 shadow-frosted flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-primary" />
              <h2 className="text-xs font-black uppercase tracking-widest text-ink-muted">
                On-Goal Streak
              </h2>
            </div>
            <div className="my-4">
              <span className="text-5xl font-black text-ink">{onGoalStreak}</span>
              <p className="text-xs font-semibold text-ink-secondary mt-1">
                consecutive on-topic page visits
              </p>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-white/50 border border-white text-xs font-semibold text-ink-secondary">
            {onGoalStreak > 3 ? 'Outstanding focus immersion!' : 'Stay disciplined to grow your streak.'}
          </div>
        </div>

        {/* Live Visited Pages Feed */}
        <div className="md:col-span-2 glass-panel p-6 shadow-frosted flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
              <h2 className="text-base font-black uppercase tracking-wide text-ink">
                Live Intent Feed
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-ink-muted">
              Auto-updating every 5s
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-72 space-y-2.5 pr-1">
            {visitedPages.length === 0 ? (
              <div className="text-center py-10">
                <Clock className="w-8 h-8 text-ink/30 mx-auto mb-2" />
                <p className="text-xs font-semibold text-ink-secondary">
                  Browse pages in Chrome with the extension active to see live ML intent evaluations here.
                </p>
              </div>
            ) : (
              visitedPages.map((page) => (
                <div
                  key={page.id}
                  className="p-3 rounded-2xl bg-white/60 border border-white/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex-1 truncate">
                    <p className="font-extrabold text-ink truncate">
                      {page.title || page.domain}
                    </p>
                    <p className="text-[10px] text-ink-muted truncate">{page.url}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold text-ink-muted">
                      {Math.round(page.relevance_score * 100)}% match
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${page.is_drift
                        ? 'bg-amber text-ink'
                        : 'bg-primary text-ink'
                        }`}
                    >
                      {page.is_drift ? 'Drifting' : 'Relevant'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Ending Session */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="glass-panel max-w-md w-full p-6 shadow-2xl bg-white/95 border border-white">
            <h3 className="text-xl font-black uppercase text-ink mb-2">
              End Focus Session?
            </h3>
            <p className="text-xs font-semibold text-ink-secondary leading-relaxed mb-6">
              Would you like to save this session as completed or discard it from your analytics?
            </p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                onClick={() => handleEndSession('completed')}
                className="h-12 rounded-full bg-primary text-ink font-extrabold text-xs uppercase tracking-wider hover:bg-primary-hover shadow-md transition-all"
              >
                Mark Complete
              </button>

              <button
                onClick={() => handleEndSession('discarded')}
                className="h-12 rounded-full bg-white border-2 border-ink text-ink font-extrabold text-xs uppercase tracking-wider hover:bg-black/5 transition-all"
              >
                Discard Session
              </button>
            </div>

            <button
              onClick={() => setShowConfirmModal(false)}
              className="w-full py-2 text-xs font-bold text-ink-muted hover:text-ink transition-colors cursor-pointer"
            >
              Resume Focusing
            </button>
          </div>
        </div>
      )}

      {/* Semantic Drift Warning Overlay (In-Browser Experience) */}
      <SemanticDriftOverlay
        isOpen={!!driftOverlayData}
        onClose={() => setDriftOverlayData(null)}
        goal={driftOverlayData?.goal}
        score={driftOverlayData?.score}
        mode={driftOverlayData?.mode}
        domain={driftOverlayData?.domain}
        pageTitle={driftOverlayData?.pageTitle}
        pageVisitId={driftOverlayData?.pageVisitId}
        onFeedback={handleFeedback}
        onRedeemBreak={handleRedeemBreak}
        onDiscardSession={() => handleEndSession('discarded')}
        rewardsSummary={rewardsSummary}
      />

      {/* Extension Setup Modal */}
      <ExtensionModal
        isOpen={isExtensionModalOpen}
        onClose={() => setIsExtensionModalOpen(false)}
      />
    </div>
  );
}
