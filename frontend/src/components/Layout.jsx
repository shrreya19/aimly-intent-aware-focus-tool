import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ExtensionModal from './ExtensionModal';
import {
  LayoutDashboard,
  PlayCircle,
  Clock,
  Flame,
  Settings as SettingsIcon,
  LogOut,
  Target,
  Sparkles,
  Puzzle,
} from 'lucide-react';

export default function Layout() {
  const { user, logout, activeSession, rewardsSummary } = useAuth();
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Start Session', path: '/start', icon: PlayCircle },
    ...(activeSession
      ? [{ name: 'Active Session', path: '/active', icon: Clock, badge: 'Live' }]
      : []),
    { name: 'Streak & History', path: '/history', icon: Flame },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <div className="relative min-h-screen flex flex-col md:flex-row text-ink selection:bg-primary-light selection:text-ink">
      {/* Ambient background glowing blobs */}
      <div
        className="fixed top-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full pointer-events-none -z-10"
        style={{
          background: 'radial-gradient(circle, rgba(255, 122, 33, 0.20) 0%, rgba(255, 180, 34, 0.08) 60%, transparent 80%)',
          filter: 'blur(70px)',
        }}
      />
      <div
        className="fixed bottom-[-150px] left-[-100px] w-[600px] h-[600px] rounded-full pointer-events-none -z-10"
        style={{
          background: 'radial-gradient(circle, rgba(255, 180, 34, 0.16) 0%, rgba(255, 227, 207, 0.25) 50%, transparent 75%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 md:min-h-screen p-4 md:p-6 flex flex-col justify-between shrink-0">
        <div className="glass-panel p-5 flex flex-col h-full shadow-frosted">
          {/* Brand Wordmark */}
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-md">
              <div className="w-4 h-4 rounded-full bg-ink" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-wider uppercase text-ink">AIMLY</span>
              <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-widest">
                Focus Engine
              </p>
            </div>
          </div>

          {/* Focus Rewards Level & Points Chip */}
          {rewardsSummary && rewardsSummary.rewards_enabled !== false && (
            <div className="mb-5 px-3 py-2 rounded-2xl bg-soft-orange/80 border border-primary/20 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs font-black text-ink truncate">{rewardsSummary.level}</span>
              </div>
              <span className="text-[11px] font-extrabold text-ink bg-white/80 px-2 py-0.5 rounded-full border border-primary/20 shrink-0">
                {rewardsSummary.points_balance} pts
              </span>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-4 py-3 rounded-full text-sm font-bold transition-all duration-200 ${isActive
                      ? 'bg-primary text-ink shadow-sm'
                      : 'text-ink hover:bg-soft-orange/60'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-extrabold rounded-full bg-amber text-ink animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Quick Active Session Widget if running */}
          {activeSession && location.pathname !== '/active' && (
            <div
              onClick={() => navigate('/active')}
              className="mt-4 p-3 rounded-2xl bg-amber/20 border border-amber/40 cursor-pointer hover:bg-amber/30 transition-all text-left"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-ink">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                <span>Session in progress</span>
              </div>
              <p className="text-xs font-semibold text-ink/80 truncate mt-1">
                {activeSession.goal}
              </p>
            </div>
          )}

          {/* Chrome Extension Button */}
          <button
            onClick={() => setIsExtensionModalOpen(true)}
            className="mt-3 w-full py-2.5 px-3 rounded-2xl bg-white/70 hover:bg-white border border-ink/10 flex items-center justify-between text-xs font-bold text-ink shadow-2xs transition-all hover:scale-[1.01] cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Puzzle className="w-4 h-4 text-primary" />
              <span>Chrome Extension</span>
            </div>
            <span className="text-[10px] bg-primary/20 text-ink px-2 py-0.5 rounded-full font-black">
              .ZIP
            </span>
          </button>

          {/* User Profile & Logout */}
          <div className="pt-6 mt-6 border-t border-ink/10 flex items-center justify-between px-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-ink text-white font-black text-xs flex items-center justify-center shrink-0">
                {user?.name
                  ? user.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                  : 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-ink truncate">{user?.name || 'User'}</p>
                <p className="text-[10px] text-ink-muted truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Log out"
              className="p-2 rounded-full hover:bg-soft-orange text-ink transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
        <Outlet />
      </main>

      {/* Chrome Extension Modal */}
      <ExtensionModal
        isOpen={isExtensionModalOpen}
        onClose={() => setIsExtensionModalOpen(false)}
      />
    </div>
  );
}
