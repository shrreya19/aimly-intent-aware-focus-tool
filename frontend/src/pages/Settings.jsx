import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Sliders,
  Shield,
  Clock,
  Globe,
  Download,
  Trash2,
  RotateCcw,
  Plus,
  X,
  CheckCircle,
} from 'lucide-react';

export default function Settings() {
  const { user, refreshRewards } = useAuth();
  const [settings, setSettings] = useState({
    default_mode: 'soft',
    default_duration: 25,
    sensitivity: 'medium',
    tracking_enabled: true,
    rewards_enabled: true,
    allowed_domains: [],
  });
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.settings.get();
        if (res.settings) {
          setSettings(res.settings);
        }
      } catch (err) {
        console.warn('Failed to load settings:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (updated) => {
    const toSave = updated || settings;
    setSaving(true);
    setFeedbackMsg('');
    try {
      const res = await api.settings.update(toSave);
      setSettings(res.settings);
      setFeedbackMsg('Settings saved successfully');
      setTimeout(() => setFeedbackMsg(''), 3000);
    } catch (err) {
      setFeedbackMsg(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDomain = (e) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    let clean = newDomain.trim().toLowerCase();
    try {
      if (clean.startsWith('http://') || clean.startsWith('https://')) {
        clean = new URL(clean).hostname;
      }
      if (clean.startsWith('www.')) {
        clean = clean.substring(4);
      }
    } catch { }

    if (!settings.allowed_domains.includes(clean)) {
      const updatedDomains = [...settings.allowed_domains, clean];
      const updatedSettings = { ...settings, allowed_domains: updatedDomains };
      setSettings(updatedSettings);
      handleSave(updatedSettings);
      setNewDomain('');
    }
  };

  const handleRemoveDomain = (domainToRemove) => {
    const updatedDomains = settings.allowed_domains.filter((d) => d !== domainToRemove);
    const updatedSettings = { ...settings, allowed_domains: updatedDomains };
    setSettings(updatedSettings);
    handleSave(updatedSettings);
  };

  const handleExportData = async () => {
    try {
      const data = await api.privacy.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aimly-export-${user?.name || 'user'}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to export data: ' + err.message);
    }
  };

  const handleDeleteData = async () => {
    try {
      await api.privacy.deleteData();
      setShowDeleteModal(false);
      alert('All personal focus sessions and browsing telemetry have been permanently deleted.');
      window.location.reload();
    } catch (err) {
      alert('Failed to delete data: ' + err.message);
    }
  };

  const handleResetDemo = async () => {
    if (window.confirm('Reset demo account with 3 weeks of realistic sample data?')) {
      try {
        await api.demo.reset();
        alert('Demo account successfully seeded with 3 weeks of historical focus data.');
        window.location.reload();
      } catch (err) {
        alert('Failed to reset demo: ' + err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-ink">
            SETTINGS
          </h1>
          <p className="text-xs md:text-sm font-semibold text-ink-secondary mt-1">
            Configure intent sensitivity, privacy preferences, and defaults
          </p>
        </div>
        {feedbackMsg && (
          <div className="px-4 py-2 rounded-full bg-primary text-ink text-xs font-black shadow-sm flex items-center gap-1.5 animate-bounce">
            <CheckCircle className="w-4 h-4" />
            <span>{feedbackMsg}</span>
          </div>
        )}
      </div>

      {/* 1. Sensitivity Slider */}
      <div className="glass-panel p-6 md:p-8 shadow-frosted space-y-6">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-primary" />
          <h2 className="text-base font-black uppercase tracking-wide text-ink">
            ML Intent Sensitivity
          </h2>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-ink">
              Current Sensitivity:{' '}
              <strong className="uppercase text-primary font-black">
                {settings.sensitivity}
              </strong>
            </span>
            <span className="text-xs font-bold text-ink-muted">
              Cosine Cutoff: {settings.sensitivity === 'low' ? '0.20' : settings.sensitivity === 'high' ? '0.40' : '0.30'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {['low', 'medium', 'high'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => {
                  const updated = { ...settings, sensitivity: lvl };
                  setSettings(updated);
                  handleSave(updated);
                }}
                className={`h-12 rounded-full font-black text-xs uppercase tracking-wider transition-all ${settings.sensitivity === lvl
                  ? 'bg-primary text-ink shadow-md scale-105'
                  : 'bg-soft-orange text-ink hover:bg-soft-orange/80'
                  }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <p className="text-xs text-ink-secondary font-medium mt-3 leading-relaxed">
            {settings.sensitivity === 'low' && 'Low (0.20): Tolerates tangential reading and general research. Flags only obvious distractions.'}
            {settings.sensitivity === 'medium' && 'Medium (0.30): Balanced academic setting. Nudges you when wandering away from the main goal.'}
            {settings.sensitivity === 'high' && 'High (0.40): Strict laser focus. Demands high semantic relevance between every tab and goal.'}
          </p>
        </div>
      </div>

      {/* 2. Session Defaults */}
      <div className="glass-panel p-6 md:p-8 shadow-frosted space-y-6">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-base font-black uppercase tracking-wide text-ink">
            Session Defaults
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-ink mb-2">
              Default Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const updated = { ...settings, default_mode: 'soft' };
                  setSettings(updated);
                  handleSave(updated);
                }}
                className={`h-11 rounded-full font-black text-xs uppercase ${settings.default_mode === 'soft'
                  ? 'bg-amber text-ink shadow-sm'
                  : 'bg-white border border-ink/20 text-ink'
                  }`}
              >
                Soft
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = { ...settings, default_mode: 'strict' };
                  setSettings(updated);
                  handleSave(updated);
                }}
                className={`h-11 rounded-full font-black text-xs uppercase ${settings.default_mode === 'strict'
                  ? 'bg-ink text-white shadow-sm'
                  : 'bg-white border border-ink/20 text-ink'
                  }`}
              >
                Strict
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-ink mb-2">
              Default Duration (Minutes)
            </label>
            <input
              type="number"
              min={5}
              max={180}
              value={settings.default_duration}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10) || 25;
                setSettings({ ...settings, default_duration: val });
              }}
              onBlur={() => handleSave()}
              className="w-full h-11 px-4 rounded-full glass-input text-sm font-bold text-ink"
            />
          </div>
        </div>

        {/* Tracking Toggle */}
        <div className="pt-4 border-t border-ink/10 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black uppercase text-ink">Session Tracking Active</h3>
            <p className="text-[11px] font-semibold text-ink-secondary">
              When toggled off, extension pauses all tab intent evaluations
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const updated = { ...settings, tracking_enabled: !settings.tracking_enabled };
              setSettings(updated);
              handleSave(updated);
            }}
            className={`w-14 h-8 rounded-full p-1 transition-colors ${settings.tracking_enabled ? 'bg-primary' : 'bg-ink/20'
              }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-white shadow-sm transform transition-transform ${settings.tracking_enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
            />
          </button>
        </div>

        {/* Focus Rewards Toggle */}
        <div className="pt-4 border-t border-ink/10 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black uppercase text-ink">Show Rewards</h3>
            <p className="text-[11px] font-semibold text-ink-secondary">
              Enable focus points, levels, streak freezes, and earn-a-break
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const updated = { ...settings, rewards_enabled: settings.rewards_enabled === false };
              setSettings(updated);
              await handleSave(updated);
              if (refreshRewards) await refreshRewards();
            }}
            className={`w-14 h-8 rounded-full p-1 transition-colors ${
              settings.rewards_enabled !== false ? 'bg-primary' : 'bg-ink/20'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-white shadow-sm transform transition-transform ${
                settings.rewards_enabled !== false ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 3. Allowed Domains Whitelist */}
      <div className="glass-panel p-6 md:p-8 shadow-frosted space-y-6">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          <h2 className="text-base font-black uppercase tracking-wide text-ink">
            Allowed Domains (Bypass ML Check)
          </h2>
        </div>

        <form onSubmit={handleAddDomain} className="flex gap-3">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="e.g. stackoverflow.com"
            className="flex-1 h-11 px-4 rounded-full glass-input text-xs font-semibold text-ink"
          />
          <button
            type="submit"
            className="px-5 h-11 rounded-full bg-primary text-ink text-xs font-black hover:bg-primary-hover shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </form>

        <div className="flex flex-wrap gap-2 pt-2">
          {settings.allowed_domains?.length === 0 ? (
            <p className="text-xs font-semibold text-ink-muted">
              No allowed domains configured.
            </p>
          ) : (
            settings.allowed_domains.map((dom) => (
              <span
                key={dom}
                className="px-3 py-1.5 rounded-full bg-white/70 border border-white text-xs font-bold text-ink flex items-center gap-2 shadow-xs"
              >
                <span>{dom}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveDomain(dom)}
                  className="hover:text-amber transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* 4. Privacy & GDPR Compliance */}
      <div className="glass-panel p-6 md:p-8 shadow-frosted space-y-4">
        <h2 className="text-base font-black uppercase tracking-wide text-ink mb-2">
          Privacy & Data Governance
        </h2>
        <p className="text-xs font-semibold text-ink-secondary leading-relaxed">
          Aimly believes in complete transparency and student privacy. You retain full ownership of
          your telemetry data.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportData}
            className="px-5 py-3 rounded-full bg-white border border-ink/20 hover:bg-black/5 text-xs font-extrabold text-ink flex items-center justify-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export My Data (JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="px-5 py-3 rounded-full bg-amber/20 hover:bg-amber/40 border border-amber/40 text-xs font-extrabold text-ink flex items-center justify-center gap-2 transition-all"
          >
            <Trash2 className="w-4 h-4 text-amber" />
            <span>Delete All Personal Data</span>
          </button>
        </div>
      </div>

      {/* 5. Demo Tools */}
      <div className="glass-panel p-6 md:p-8 shadow-frosted flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-black uppercase text-ink">Demo Reset Tool</h2>
          <p className="text-xs font-semibold text-ink-secondary mt-0.5">
            Reset demo account with 3 weeks of varied sessions for course presentation
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetDemo}
          className="px-5 py-2.5 rounded-full bg-primary text-ink text-xs font-black hover:bg-primary-hover shadow-sm flex items-center gap-2 shrink-0 transition-all hover:scale-105"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Demo Data</span>
        </button>
      </div>

      {/* Confirmation Modal for Data Wipe */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="glass-panel max-w-md w-full p-6 bg-white/95 border border-white shadow-2xl">
            <h3 className="text-lg font-black uppercase text-ink mb-2">
              Permanently Delete Your Data?
            </h3>
            <p className="text-xs font-semibold text-ink-secondary leading-relaxed mb-6">
              This action will permanently delete all your sessions, page visits, and feedback.
              This cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleDeleteData}
                className="h-11 rounded-full bg-ink text-white font-black text-xs uppercase"
              >
                Yes, Delete Everything
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="h-11 rounded-full bg-white border border-ink/20 text-ink font-bold text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
