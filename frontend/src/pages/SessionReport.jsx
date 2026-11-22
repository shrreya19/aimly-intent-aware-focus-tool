import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Flame,
  Globe,
  Share2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

function AnimatedPoints({ target }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!target || target <= 0) {
      setCount(0);
      return;
    }
    let current = 0;
    const steps = 40;
    const increment = target / steps;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.round(current));
      }
    }, 25);
    return () => clearInterval(timer);
  }, [target]);

  return <span>+{count}</span>;
}

export default function SessionReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadReport() {
      setLoading(true);
      try {
        const data = await api.sessions.getReport(id);
        setReport(data);
      } catch (err) {
        setError(err.message || 'Failed to load session report');
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="glass-panel p-8 text-center max-w-md mx-auto">
        <p className="text-sm font-bold text-ink mb-4">{error || 'Report not found'}</p>
        <Link to="/dashboard" className="px-6 py-2.5 rounded-full bg-primary text-ink text-xs font-bold">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const { session, drift_timeline, drift_count, focus_score, longest_on_goal_stretch_minutes, top_distracting_domains } = report;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 text-xs font-extrabold text-ink hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex gap-3">
          <Link
            to="/start"
            className="px-5 py-2.5 rounded-full bg-primary text-ink text-xs font-extrabold hover:bg-primary-hover shadow-sm transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Focus Again</span>
          </Link>
        </div>
      </div>

      {/* Hero Session Summary Card */}
      <div className="glass-panel p-6 md:p-8 shadow-frosted">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${session.status === 'completed' ? 'bg-primary text-ink' : 'bg-amber/40 text-ink'
              }`}
          >
            {session.status}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${session.mode === 'strict' ? 'bg-ink text-white' : 'bg-amber text-ink'
              }`}
          >
            {session.mode} mode
          </span>
          <span className="text-xs font-semibold text-ink-muted">
            {new Date(session.started_at).toLocaleDateString()} • {session.duration_minutes} minutes
          </span>
        </div>

        <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-ink mb-6">
          {session.goal}
        </h1>

        {/* 3 Metric Hero Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-ink/10">
          <div className="p-4 rounded-2xl bg-white/50 border border-white flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
              Focus Score
            </span>
            <div className="my-2">
              <span className="text-4xl font-black text-ink">{focus_score}%</span>
            </div>
            <span className="text-[11px] font-semibold text-ink-secondary">
              Proportion of on-target browsing
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/50 border border-white flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
              Longest Focused Stretch
            </span>
            <div className="my-2 flex items-center gap-2">
              <span className="text-4xl font-black text-primary">
                {longest_on_goal_stretch_minutes}
              </span>
              <span className="text-lg font-bold text-ink">mins</span>
            </div>
            <span className="text-[11px] font-semibold text-ink-secondary">
              Zero interruptions or drifts
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/50 border border-white flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
              Drifts Flagged
            </span>
            <div className="my-2">
              <span className="text-4xl font-black text-amber">{drift_count}</span>
            </div>
            <span className="text-[11px] font-semibold text-ink-secondary">
              Interventions by Aimly engine
            </span>
          </div>
        </div>

        {/* Points Earned Card with Animated Count-Up & Full Breakdown */}
        {report.reward && (
          <div className="mt-6 pt-6 border-t border-ink/10">
            <div className="p-5 rounded-2xl bg-soft-orange/60 border border-primary/20">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-ink shadow-sm shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
                      Points Earned
                    </span>
                    <div className="text-3xl md:text-4xl font-black text-ink">
                      <AnimatedPoints target={report.reward.points} /> pts
                    </div>
                  </div>
                </div>

                {report.reward.breakdown?.comeback && (
                  <div className="px-4 py-2 rounded-2xl bg-white/85 border border-amber/40 text-xs font-bold text-ink">
                    {report.reward.breakdown.encouraging_copy || 'Welcome back! Fresh start.'} (+
                    {report.reward.breakdown.comeback_bonus} comeback pts)
                  </div>
                )}
              </div>

              {report.reward.breakdown && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-3 border-t border-ink/10">
                  <div className="p-2.5 rounded-xl bg-white/60">
                    <span className="text-[10px] font-black uppercase text-ink-muted block">
                      Base Earned
                    </span>
                    <span className="font-black text-ink">
                      +{report.reward.breakdown.base_points} pts (
                      {report.reward.breakdown.on_topic_minutes}m)
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/60">
                    <span className="text-[10px] font-black uppercase text-ink-muted block">
                      Multipliers
                    </span>
                    <span className="font-black text-ink">
                      x{report.reward.breakdown.combined_multiplier} (Focus x
                      {report.reward.breakdown.focus_multiplier}, Streak x
                      {report.reward.breakdown.streak_multiplier})
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/60">
                    <span className="text-[10px] font-black uppercase text-ink-muted block">
                      Deep Stretch
                    </span>
                    <span className="font-black text-ink">
                      {report.reward.breakdown.deep_stretch_bonus > 0
                        ? `+${report.reward.breakdown.deep_stretch_bonus} pts`
                        : '0 pts'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/60">
                    <span className="text-[10px] font-black uppercase text-ink-muted block">
                      Bonuses & Cap
                    </span>
                    <span className="font-black text-ink">
                      {report.reward.breakdown.milestone_bonus > 0
                        ? `+${report.reward.breakdown.milestone_bonus} Milestone`
                        : report.reward.breakdown.comeback_bonus > 0
                        ? `+${report.reward.breakdown.comeback_bonus} Comeback`
                        : report.reward.breakdown.was_clamped
                        ? `Clamped (${report.reward.breakdown.daily_cap} daily cap)`
                        : 'Within daily cap'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Top Distracting Domains */}
      {top_distracting_domains && top_distracting_domains.length > 0 && (
        <div className="glass-panel p-6 shadow-frosted">
          <h2 className="text-sm font-black uppercase tracking-wider text-ink mb-4">
            Distracting Domains Flagged in this Session
          </h2>
          <div className="flex flex-wrap gap-3">
            {top_distracting_domains.map((item) => (
              <div
                key={item.domain}
                className="px-4 py-2 rounded-2xl bg-white/60 border border-white flex items-center gap-2 text-xs font-bold"
              >
                <Globe className="w-3.5 h-3.5 text-amber" />
                <span className="text-ink">{item.domain}</span>
                <span className="px-2 py-0.5 rounded-full bg-amber/30 text-ink text-[10px] font-black">
                  {item.count} {item.count === 1 ? 'drift' : 'drifts'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drift Timeline List */}
      <div className="glass-panel p-6 md:p-8 shadow-frosted">
        <h2 className="text-lg font-black uppercase tracking-tight text-ink mb-6">
          Browsing Intent Timeline ({drift_timeline?.length || 0} visits)
        </h2>

        {drift_timeline?.length === 0 ? (
          <p className="text-xs font-semibold text-ink-secondary text-center py-8">
            No browsing activity recorded during this session.
          </p>
        ) : (
          <div className="space-y-3">
            {drift_timeline.map((visit, idx) => (
              <div
                key={visit.id || idx}
                className="p-4 rounded-2xl bg-white/60 border border-white/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex-1 truncate">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${visit.is_drift ? 'bg-amber text-ink' : 'bg-primary text-ink'
                        }`}
                    >
                      {visit.is_drift ? 'Drift Flagged' : 'Relevant'}
                    </span>
                    <span className="text-[10px] font-bold text-ink-muted">
                      via {visit.method} • {new Date(visit.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="font-extrabold text-ink truncate text-sm">
                    {visit.title || visit.domain}
                  </p>
                  <p className="text-[10px] text-ink-muted truncate mt-0.5">{visit.url}</p>
                </div>

                <div className="sm:text-right shrink-0">
                  <span className="text-sm font-black text-ink">
                    {Math.round(visit.relevance_score * 100)}%
                  </span>
                  <p className="text-[10px] font-semibold text-ink-muted">relevance match</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
