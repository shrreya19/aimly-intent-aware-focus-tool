import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Flame,
  CheckCircle2,
  AlertTriangle,
  Clock,
  PlayCircle,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function Dashboard() {
  const { rewardsSummary, refreshRewards } = useAuth();
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [insights, setInsights] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buyingFreeze, setBuyingFreeze] = useState(false);
  const [freezeToast, setFreezeToast] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [rewardHistory, setRewardHistory] = useState([]);
  const navigate = useNavigate();

  // Refresh streak/rewards on window focus or visibility change (day rollover)
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        refreshRewards();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [refreshRewards]);

  const handleBuyFreeze = async () => {
    setBuyingFreeze(true);
    setFreezeToast('');
    try {
      const res = await api.rewards.buyFreeze();
      await refreshRewards();
      if (showHistory) {
        const hist = await api.rewards.getHistory({ limit: 15 }).catch(() => null);
        if (hist) setRewardHistory(hist.events || []);
      }
      setFreezeToast(res.message || 'Streak freeze acquired!');
      setTimeout(() => setFreezeToast(''), 4000);
    } catch (err) {
      setFreezeToast(err.message || 'Could not buy streak freeze');
      setTimeout(() => setFreezeToast(''), 4000);
    } finally {
      setBuyingFreeze(false);
    }
  };

  const toggleHistory = async () => {
    if (!showHistory) {
      try {
        const res = await api.rewards.getHistory({ limit: 15 });
        setRewardHistory(res.events || []);
      } catch (err) {
        console.warn('Could not load reward history:', err.message);
      }
    }
    setShowHistory(!showHistory);
  };

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const [statsRes, insightsRes, sessionsRes] = await Promise.all([
          api.analytics.getWeeklyStats().catch((e) => {
            console.warn('Weekly stats fetch skipped:', e.message);
            return null;
          }),
          api.analytics.getInsights().catch((e) => {
            console.warn('Insights fetch skipped:', e.message);
            return null;
          }),
          api.sessions.list({ limit: 5 }).catch((e) => {
            console.warn('Sessions list fetch skipped:', e.message);
            return null;
          }),
        ]);

        if (statsRes) setWeeklyStats(statsRes);
        if (insightsRes) setInsights(insightsRes);
        if (sessionsRes) setRecentSessions(sessionsRes.sessions || []);
      } catch (err) {
        console.warn('Dashboard general error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 rounded-card glass-panel" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-card glass-panel" />
          ))}
        </div>
        <div className="h-80 rounded-card glass-panel" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-card glass-panel text-center">
        <p className="text-sm font-bold text-ink">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2 rounded-full bg-primary text-ink text-xs font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  const summary = weeklyStats?.summary || {};
  const totalMins = summary.total_minutes || 0;
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;

  // Deep / Light / Drifted breakdown
  const deepMins = summary.deep_minutes || 0;
  const lightMins = summary.light_minutes || 0;
  const driftedMins = summary.drifted_minutes || 0;
  const splitTotal = Math.max(1, deepMins + lightMins + driftedMins);
  const deepPct = Math.round((deepMins / splitTotal) * 100);
  const lightPct = Math.round((lightMins / splitTotal) * 100);
  const driftedPct = Math.round((driftedMins / splitTotal) * 100);

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner & Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-ink">
            FOCUS DASHBOARD
          </h1>
          <p className="text-xs md:text-sm font-semibold text-ink-secondary mt-1">
            Real-time intent awareness & weekly focus analytics
          </p>
        </div>
        <button
          onClick={() => navigate('/start')}
          className="self-start md:self-auto px-6 py-3 rounded-full bg-primary text-ink font-extrabold text-sm hover:bg-primary-hover shadow-md flex items-center gap-2 transition-all hover:scale-105"
        >
          <PlayCircle className="w-5 h-5" />
          <span>Start Focus Session</span>
        </button>
      </div>

      {/* Compact Focus Rewards Card */}
      {rewardsSummary && rewardsSummary.rewards_enabled !== false && (
        <div className="glass-panel p-6 shadow-frosted border border-primary/20 space-y-4">
          {/* Gentle Streak-at-Risk Hint (non-blocking, encouraging) */}
          {rewardsSummary.streak_at_risk && (
            <div className="px-4 py-2.5 rounded-2xl bg-amber/20 border border-amber/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-primary shrink-0" />
                <p className="text-xs font-bold text-ink">
                  Your {rewardsSummary.current_streak}-day streak is waiting, one session keeps it alive.
                </p>
              </div>
              <button
                onClick={() => navigate('/start')}
                className="px-3 py-1 rounded-full bg-primary text-ink text-[11px] font-black hover:bg-primary-hover shrink-0"
              >
                Focus Now
              </button>
            </div>
          )}

          {freezeToast && (
            <div className="px-4 py-2 rounded-xl bg-soft-orange border border-primary/30 text-xs font-extrabold text-ink">
              {freezeToast}
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-ink/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-ink shadow-sm shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-widest text-ink-muted">
                    Focus Rewards
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-primary text-ink">
                    {rewardsSummary.level}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-soft-orange text-ink flex items-center gap-1">
                    <Flame className="w-3 h-3 text-primary" />
                    {rewardsSummary.current_streak}d streak
                  </span>
                </div>
                <p className="text-xs font-semibold text-ink-secondary mt-0.5">
                  {rewardsSummary.next_level
                    ? `${rewardsSummary.points_to_next} lifetime pts to ${rewardsSummary.next_level}`
                    : 'Maximum Zen Tier Achieved'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Spendable Balance */}
              <div className="px-3.5 py-2 rounded-2xl bg-white/75 border border-white flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-ink-muted">Balance:</span>
                <span className="text-sm font-black text-ink">{rewardsSummary.points_balance} pts</span>
              </div>

              {/* Streak Freezes Held & Buy Button */}
              <div
                className="px-3 py-2 rounded-2xl bg-white/75 border border-white flex items-center gap-1.5"
                title="Streak freezes automatically bridge 1 missed day so your streak survives"
              >
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-ink">
                  {rewardsSummary.streak_freezes}/2 Freezes
                </span>
              </div>

              <button
                onClick={handleBuyFreeze}
                disabled={
                  buyingFreeze ||
                  rewardsSummary.streak_freezes >= 2 ||
                  rewardsSummary.points_balance < 250
                }
                className="px-4 py-2 rounded-full bg-ink text-white hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed text-xs font-black transition-all"
                title={
                  rewardsSummary.streak_freezes >= 2
                    ? 'You already hold the maximum of 2 streak freezes'
                    : rewardsSummary.points_balance < 250
                    ? 'Need 250 points to purchase a streak freeze'
                    : 'Purchase 1 single-use streak freeze for 250 pts'
                }
              >
                {buyingFreeze ? 'Buying...' : 'Buy freeze (250)'}
              </button>
            </div>
          </div>

          {/* Progress Bars: Next Level & Daily Earning Cap */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-ink-secondary">
                  Level Progress ({rewardsSummary.lifetime_points} lifetime pts)
                </span>
                <span className="text-ink">{rewardsSummary.progress_to_next}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-black/5 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{ width: `${rewardsSummary.progress_to_next}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-ink-secondary">
                  Today&apos;s Earnings ({rewardsSummary.today_earned} / {rewardsSummary.daily_cap} pts cap)
                </span>
                <span className="text-ink">
                  {Math.min(100, Math.round((rewardsSummary.today_earned / rewardsSummary.daily_cap) * 100))}%
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-black/5 overflow-hidden">
                <div
                  className="h-full bg-amber transition-all duration-500 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((rewardsSummary.today_earned / rewardsSummary.daily_cap) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Inline Reward History Toggle */}
          <div className="pt-2 border-t border-ink/5">
            <button
              onClick={toggleHistory}
              className="flex items-center gap-1.5 text-xs font-extrabold text-ink hover:text-primary transition-colors"
            >
              <span>Recent Reward History</span>
              {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showHistory && (
              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                {rewardHistory.length === 0 ? (
                  <p className="text-xs font-semibold text-ink-muted py-2">
                    Complete a 10+ minute focus session to earn your first reward points.
                  </p>
                ) : (
                  rewardHistory.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-2.5 rounded-xl bg-white/50 border border-white/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-extrabold capitalize text-ink">
                          {evt.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-ink-muted text-[10px] ml-2">
                          {new Date(evt.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <span
                        className={`font-black ${
                          evt.points > 0
                            ? 'text-primary'
                            : evt.points < 0
                            ? 'text-ink'
                            : 'text-ink-muted'
                        }`}
                      >
                        {evt.points > 0 ? `+${evt.points}` : evt.points} pts
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hero Number & Deep/Light/Drifted Segment Bar */}
      <div className="glass-panel p-6 md:p-8 shadow-frosted">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-ink-muted">
              Weekly Focus Output
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-5xl md:text-7xl font-black text-ink tracking-tight">
                {hours}h {mins}m
              </span>
              <span className="text-sm font-bold text-ink-muted">past 7 days</span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-bold">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-primary" />
              <span>Deep ({deepPct}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-amber" />
              <span>Light ({lightPct}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-ink" />
              <span>Drifted ({driftedPct}%)</span>
            </div>
          </div>
        </div>

        {/* Segmented Progress Bar */}
        <div className="w-full h-4 rounded-full bg-black/5 overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${deepPct}%` }}
            className="h-full bg-primary transition-all duration-500"
            title={`Deep Focus: ${deepMins} mins`}
          />
          <div
            style={{ width: `${lightPct}%` }}
            className="h-full bg-amber transition-all duration-500"
            title={`Light Focus: ${lightMins} mins`}
          />
          <div
            style={{ width: `${driftedPct}%` }}
            className="h-full bg-ink transition-all duration-500"
            title={`Drifted: ${driftedMins} mins`}
          />
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Stat 1: Focus Score */}
        <div className="glass-panel p-5 shadow-frosted flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
            Focus Score
          </span>
          <div className="my-2">
            <span className="text-3xl md:text-4xl font-black text-ink">
              {summary.focus_score ?? 100}%
            </span>
          </div>
          <span className="text-[11px] font-semibold text-ink-secondary">
            Non-drifted page visits
          </span>
        </div>

        {/* Stat 2: Completed Sessions */}
        <div className="glass-panel p-5 shadow-frosted flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
            Completed
          </span>
          <div className="my-2">
            <span className="text-3xl md:text-4xl font-black text-ink">
              {summary.completed_sessions || 0}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-ink-secondary">
            {summary.discarded_sessions || 0} discarded
          </span>
        </div>

        {/* Stat 3: Drifts Prevented */}
        <div className="glass-panel p-5 shadow-frosted flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
            Drifts Flagged
          </span>
          <div className="my-2">
            <span className="text-3xl md:text-4xl font-black text-amber">
              {summary.total_drifts || 0}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-ink-secondary">
            Caught by intent engine
          </span>
        </div>

        {/* Stat 4: Streak */}
        <div className="glass-panel p-5 shadow-frosted flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
            Focus Streak
          </span>
          <div className="my-2 flex items-center gap-2">
            <span className="text-3xl md:text-4xl font-black text-primary">
              {insights?.current_streak || 0}
            </span>
            <Flame className="w-6 h-6 text-primary fill-primary" />
          </div>
          <span className="text-[11px] font-semibold text-ink-secondary">
            Consecutive active days
          </span>
        </div>
      </div>

      {/* Daily Bar Chart & Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Chart */}
        <div className="lg:col-span-2 glass-panel p-6 shadow-frosted flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-black uppercase tracking-wide text-ink">
              Daily Focus Minutes (Last 7 Days)
            </h2>
            <div className="flex items-center gap-2 text-xs font-bold text-ink-muted">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span>Minutes</span>
            </div>
          </div>

          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyStats?.days || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="day"
                  stroke="#757575"
                  fontSize={11}
                  fontWeight={700}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(30,30,30,0.1)' }}
                />
                <YAxis
                  stroke="#757575"
                  fontSize={11}
                  fontWeight={700}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(30,30,30,0.1)' }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 122, 33, 0.08)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="glass-panel p-3 text-xs shadow-md border border-white">
                          <p className="font-extrabold text-ink">{data.date} ({data.day})</p>
                          <p className="text-primary font-black mt-1">{data.minutes} mins focused</p>
                          <p className="text-ink-secondary font-semibold">
                            {data.completed} completed, {data.drift_count} drifts
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="minutes" radius={[8, 8, 0, 0]}>
                  {(weeklyStats?.days || []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.minutes > 45 ? '#FF7A21' : '#FFB422'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Insights Card */}
        <div className="glass-panel p-6 shadow-frosted flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-base font-black uppercase tracking-wide text-ink">
                Focus Insights
              </h2>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-white/50 border border-white/80">
                <span className="text-[10px] font-black uppercase text-ink-muted">
                  Peak Productivity Window
                </span>
                <p className="text-sm font-extrabold text-ink mt-0.5">
                  {insights?.best_focus_hour || '10:00 AM - 11:00 AM'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/50 border border-white/80">
                <span className="text-[10px] font-black uppercase text-ink-muted">
                  Weekly Output Trend
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-extrabold text-ink">
                    {insights?.weekly_trend_percent >= 0 ? '+' : ''}
                    {insights?.weekly_trend_percent || 0}%
                  </span>
                  <span className="text-[11px] font-semibold text-ink-muted">
                    vs previous 7 days
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/50 border border-white/80">
                <span className="text-[10px] font-black uppercase text-ink-muted">
                  Top Distracting Domains (30 Days)
                </span>
                {insights?.top_distracting_domains?.length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {insights.top_distracting_domains.slice(0, 3).map((item) => (
                      <li
                        key={item.domain}
                        className="flex items-center justify-between text-xs font-bold text-ink"
                      >
                        <span className="truncate">{item.domain}</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber/30 text-ink text-[10px]">
                          {item.count} drifts
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs font-semibold text-ink-secondary mt-1">
                    No major distractions detected. Great focus!
                  </p>
                )}
              </div>
            </div>
          </div>

          <Link
            to="/history"
            className="mt-6 flex items-center justify-between text-xs font-black text-ink hover:text-primary pt-4 border-t border-ink/10 transition-colors"
          >
            <span>View Full 12-Week Heatmap</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Recent Sessions List */}
      <div className="glass-panel p-6 md:p-8 shadow-frosted">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black uppercase tracking-tight text-ink">
            Recent Focus Sessions
          </h2>
          <Link
            to="/history"
            className="text-xs font-extrabold text-ink hover:underline"
          >
            View all
          </Link>
        </div>

        {recentSessions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm font-semibold text-ink-secondary">
              No sessions recorded yet. Start your first focus session!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-ink/10">
            {recentSessions.map((s) => (
              <div
                key={s.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/30 rounded-2xl px-3 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${s.status === 'completed'
                        ? 'bg-primary text-ink'
                        : s.status === 'discarded'
                          ? 'bg-amber/40 text-ink'
                          : 'bg-soft-orange text-ink animate-pulse'
                        }`}
                    >
                      {s.status}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${s.mode === 'strict' ? 'bg-ink text-white' : 'bg-amber text-ink'
                        }`}
                    >
                      {s.mode} mode
                    </span>
                    <span className="text-[11px] font-semibold text-ink-muted">
                      {new Date(s.started_at).toLocaleDateString()} at{' '}
                      {new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-ink">{s.goal}</h3>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs font-black text-ink">
                      {s.duration_minutes} mins
                    </span>
                  </div>
                  <button
                    onClick={() => navigate(`/report/${s.id}`)}
                    className="px-4 py-1.5 rounded-full bg-soft-orange hover:bg-primary text-ink text-xs font-bold transition-all"
                  >
                    View Report
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
