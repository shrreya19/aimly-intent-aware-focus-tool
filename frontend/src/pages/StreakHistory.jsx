import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Flame, Award, Calendar, CheckCircle2, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

export default function StreakHistory() {
  const [streakData, setStreakData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // Load streak and heatmap
  useEffect(() => {
    async function loadStreak() {
      try {
        const res = await api.analytics.getStreak();
        setStreakData(res);
      } catch (err) {
        console.warn('Failed to load streak:', err.message);
      }
    }
    loadStreak();
  }, []);

  // Load paginated sessions
  useEffect(() => {
    async function loadSessions() {
      setLoading(true);
      try {
        const res = await api.sessions.list({
          page,
          limit: 8,
          status: statusFilter || undefined,
          mode: modeFilter || undefined,
        });
        setSessions(res.sessions || []);
        setTotalSessions(res.total || 0);
      } catch (err) {
        console.warn('Failed to load sessions:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadSessions();
  }, [page, statusFilter, modeFilter]);

  const currentStreak = streakData?.current_streak || 0;
  const longestStreak = streakData?.longest_streak || 0;
  const heatmap = streakData?.heatmap || [];

  // Heatmap intensity helper (0 -> cream, up to primary orange)
  const getCellColor = (minutes) => {
    if (!minutes || minutes === 0) return 'bg-white/40 border border-white/60';
    if (minutes < 30) return 'bg-soft-orange border border-primary/20';
    if (minutes < 60) return 'bg-amber border border-amber';
    return 'bg-primary border border-primary text-ink';
  };

  const totalPages = Math.max(1, Math.ceil(totalSessions / 8));

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-ink">
          STREAK & HISTORY
        </h1>
        <p className="text-xs md:text-sm font-semibold text-ink-secondary mt-1">
          Track your focus momentum and celebrate milestones
        </p>
      </div>

      {/* Streak Hero Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 md:p-8 shadow-frosted flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
              Current Active Streak
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-5xl md:text-6xl font-black text-primary">
                {currentStreak}
              </span>
              <span className="text-sm font-bold text-ink">Days in a row</span>
            </div>
            <p className="text-xs font-semibold text-ink-secondary mt-2">
              Focus today to keep your streak alive!
            </p>
          </div>
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Flame className="w-8 h-8 text-primary fill-primary" />
          </div>
        </div>

        <div className="glass-panel p-6 md:p-8 shadow-frosted flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-ink-muted">
              All-Time Longest Streak
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-5xl md:text-6xl font-black text-ink">
                {longestStreak}
              </span>
              <span className="text-sm font-bold text-ink">Days</span>
            </div>
            <p className="text-xs font-semibold text-ink-secondary mt-2">
              Your highest focus discipline record
            </p>
          </div>
          <div className="w-16 h-16 rounded-full bg-amber/20 flex items-center justify-center shrink-0">
            <Award className="w-8 h-8 text-amber" />
          </div>
        </div>
      </div>

      {/* 12-Week Heatmap */}
      <div className="glass-panel p-6 md:p-8 shadow-frosted">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-base font-black uppercase tracking-wide text-ink">
              12-Week Focus Heatmap (84 Days)
            </h2>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-2 text-[10px] font-bold text-ink-muted">
            <span>Less</span>
            <span className="w-3 h-3 rounded bg-white/40 border border-white/60" />
            <span className="w-3 h-3 rounded bg-soft-orange" />
            <span className="w-3 h-3 rounded bg-amber" />
            <span className="w-3 h-3 rounded bg-primary" />
            <span>More</span>
          </div>
        </div>

        {/* Heatmap Grid: 12 columns of 7 days */}
        <div className="overflow-x-auto pb-2">
          <div className="grid grid-flow-col grid-rows-7 gap-1.5 w-max">
            {heatmap.map((day) => (
              <div
                key={day.date}
                title={`${day.date}: ${day.minutes} mins focused (${day.sessions_count} sessions)`}
                className={`w-4 h-4 md:w-5 md:h-5 rounded-md transition-all cursor-pointer hover:scale-125 ${getCellColor(
                  day.minutes
                )}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Milestone Badges */}
      <div className="glass-panel p-6 md:p-8 shadow-frosted">
        <h2 className="text-base font-black uppercase tracking-wide text-ink mb-6">
          Milestone Achievements
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-2xl border text-center ${currentStreak >= 3 ? 'bg-white/80 border-primary/40' : 'bg-white/30 border-ink/10 opacity-60'}`}>
            <div className="w-10 h-10 rounded-full bg-soft-orange mx-auto flex items-center justify-center mb-2">
              <Award className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-xs font-black uppercase text-ink">3-Day Habit</h3>
            <p className="text-[10px] text-ink-secondary mt-1">Focus 3 days in a row</p>
            {currentStreak >= 3 && <span className="inline-block mt-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-primary text-ink">Unlocked</span>}
          </div>

          <div className={`p-4 rounded-2xl border text-center ${currentStreak >= 7 ? 'bg-white/80 border-primary/40' : 'bg-white/30 border-ink/10 opacity-60'}`}>
            <div className="w-10 h-10 rounded-full bg-amber/20 mx-auto flex items-center justify-center mb-2">
              <Flame className="w-5 h-5 text-amber fill-amber" />
            </div>
            <h3 className="text-xs font-black uppercase text-ink">7-Day Consistency</h3>
            <p className="text-[10px] text-ink-secondary mt-1">Full week of focus</p>
            {currentStreak >= 7 && <span className="inline-block mt-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber text-ink">Unlocked</span>}
          </div>

          <div className="p-4 rounded-2xl border bg-white/80 border-primary/40 text-center">
            <div className="w-10 h-10 rounded-full bg-primary/20 mx-auto flex items-center justify-center mb-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-xs font-black uppercase text-ink">Deep Work Prodigy</h3>
            <p className="text-[10px] text-ink-secondary mt-1">Completed a 45m+ session</p>
            <span className="inline-block mt-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-primary text-ink">Unlocked</span>
          </div>

          <div className="p-4 rounded-2xl border bg-white/80 border-primary/40 text-center">
            <div className="w-10 h-10 rounded-full bg-amber/20 mx-auto flex items-center justify-center mb-2">
              <Award className="w-5 h-5 text-amber" />
            </div>
            <h3 className="text-xs font-black uppercase text-ink">Zero Drift Master</h3>
            <p className="text-[10px] text-ink-secondary mt-1">100% on-goal session</p>
            <span className="inline-block mt-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber text-ink">Unlocked</span>
          </div>
        </div>
      </div>

      {/* Session History Table with Filters */}
      <div className="glass-panel p-6 md:p-8 shadow-frosted">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-base font-black uppercase tracking-wide text-ink">
            Focus Session History ({totalSessions})
          </h2>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-9 px-3 rounded-full text-xs font-bold glass-input text-ink"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="discarded">Discarded</option>
            </select>

            <select
              value={modeFilter}
              onChange={(e) => { setModeFilter(e.target.value); setPage(1); }}
              className="h-9 px-3 rounded-full text-xs font-bold glass-input text-ink"
            >
              <option value="">All Modes</option>
              <option value="soft">Soft</option>
              <option value="strict">Strict</option>
            </select>
          </div>
        </div>

        {sessions.length === 0 ? (
          <p className="text-xs font-semibold text-ink-secondary text-center py-8">
            No sessions match the selected filters.
          </p>
        ) : (
          <div className="divide-y divide-ink/10">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/30 rounded-2xl px-3 transition-colors"
              >
                <div className="flex-1 truncate">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        s.status === 'completed'
                          ? 'bg-primary text-ink'
                          : 'bg-amber/40 text-ink'
                      }`}
                    >
                      {s.status}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        s.mode === 'strict' ? 'bg-ink text-white' : 'bg-amber text-ink'
                      }`}
                    >
                      {s.mode}
                    </span>
                    <span className="text-[11px] font-semibold text-ink-muted">
                      {new Date(s.started_at).toLocaleDateString()} • {s.duration_minutes} mins
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-ink truncate">{s.goal}</h3>
                </div>

                <button
                  onClick={() => navigate(`/report/${s.id}`)}
                  className="self-start md:self-auto px-4 py-1.5 rounded-full bg-soft-orange hover:bg-primary text-ink text-xs font-bold transition-all shrink-0"
                >
                  View Report
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-ink/10 text-xs font-bold">
            <span className="text-ink-muted">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-full bg-white border border-ink/20 disabled:opacity-30"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-full bg-white border border-ink/20 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
