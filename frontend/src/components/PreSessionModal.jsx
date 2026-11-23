import React from 'react';
import { Zap, Puzzle, Download, ArrowRight, ShieldCheck, AlertCircle, X, Sparkles } from 'lucide-react';

export default function PreSessionModal({
  isOpen,
  onClose,
  onConfirmStart,
  goal,
  duration,
  mode,
  onOpenExtensionGuide,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="glass-panel max-w-xl w-full p-6 md:p-8 shadow-2xl bg-white/95 border border-white rounded-3xl relative text-left">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-black/5 text-ink-muted hover:text-ink transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-soft-orange border border-primary/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
              Professor & Evaluator Guide
            </span>
            <h2 className="text-xl md:text-2xl font-black uppercase text-ink mt-0.5">
              How to Test Semantic Drift
            </h2>
          </div>
        </div>

        {/* Target Session Chip */}
        <div className="p-3 mb-4 rounded-2xl bg-cream/70 border border-ink/5 flex items-center justify-between gap-3 text-xs">
          <div className="truncate">
            <span className="text-[10px] font-black uppercase tracking-wider text-ink-muted block">
              Active Focus Aim:
            </span>
            <p className="font-extrabold text-ink truncate text-sm">
              "{goal}"
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-primary/20 text-ink text-[11px] font-black uppercase shrink-0">
            {duration} min • {mode} mode
          </span>
        </div>

        {/* Browser Security Notice */}
        <div className="p-3.5 mb-5 rounded-2xl bg-amber/20 border border-amber/40 text-xs text-ink flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber shrink-0 mt-0.5" />
          <p className="text-[11px] font-medium leading-relaxed">
            <strong>Browser Security Architecture:</strong> Under standard browser security (Same-Origin Policy), a website alone cannot see your external tabs (like YouTube or LeetCode) without an extension. Aimly gives you <strong>two flexible ways to grade the intent engine:</strong>
          </p>
        </div>

        {/* 2 Options Cards */}
        <div className="space-y-3 mb-6">
          {/* Option 1: In-Browser AI Simulator */}
          <div
            onClick={onConfirmStart}
            className="p-4 rounded-2xl bg-white border-2 border-primary hover:bg-soft-orange/20 cursor-pointer transition-all shadow-xs hover:scale-[1.01] group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-xs font-black uppercase tracking-wider text-ink">
                  Option 1: In-Browser AI Simulator
                </span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Instant • 0 Install
              </span>
            </div>
            <p className="text-xs text-ink-secondary font-medium leading-relaxed mb-3">
              Start this session now and test drift directly inside the web app using 1-click presets (YouTube vlog, LeetCode, Instagram). The full-screen frosted drift overlay triggers automatically!
            </p>
            <button
              type="button"
              className="w-full h-11 rounded-full bg-primary text-ink font-black text-xs uppercase tracking-wider group-hover:bg-primary-hover shadow-sm flex items-center justify-center gap-2 transition-all pointer-events-none"
            >
              <span>Start Session with In-Browser Simulator</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Option 2: Chrome Extension (.zip) */}
          <div className="p-4 rounded-2xl bg-white border border-ink/15 hover:border-ink/30 transition-all shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Puzzle className="w-4 h-4 text-ink-muted" />
                <span className="text-xs font-black uppercase tracking-wider text-ink">
                  Option 2: Chrome Extension (.zip)
                </span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-ink/10 text-ink px-2 py-0.5 rounded-full">
                Live Tab Enforcement
              </span>
            </div>
            <p className="text-xs text-ink-secondary font-medium leading-relaxed mb-3">
              If you want Aimly to monitor your real browser tabs and block YouTube when you visit it in another tab, download our Manifest V3 extension.
            </p>
            <div className="flex items-center gap-2">
              <a
                href="/aimly-extension.zip"
                download="aimly-extension.zip"
                className="flex-1 h-10 rounded-full bg-white border-2 border-ink text-ink font-black text-xs uppercase tracking-wider hover:bg-black/5 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .zip</span>
              </a>
              <button
                type="button"
                onClick={onOpenExtensionGuide}
                className="px-4 h-10 rounded-full bg-cream border border-ink/10 text-ink font-extrabold text-xs hover:bg-soft-orange transition-all cursor-pointer"
              >
                Setup Guide
              </button>
            </div>
          </div>
        </div>

        {/* Footer cancel */}
        <div className="text-center">
          <button
            onClick={onClose}
            className="text-xs font-bold text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            Go back to edit aim
          </button>
        </div>
      </div>
    </div>
  );
}
