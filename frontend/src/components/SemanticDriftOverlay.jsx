import React from 'react';
import { AlertTriangle, Coffee, ArrowRight, XCircle, CheckCircle, Flame } from 'lucide-react';

export default function SemanticDriftOverlay({
  isOpen,
  onClose,
  goal,
  score,
  mode,
  domain,
  pageTitle,
  pageVisitId,
  onFeedback,
  onRedeemBreak,
  onDiscardSession,
  rewardsSummary,
}) {
  if (!isOpen) return null;

  const matchPct = Math.round((score || 0) * 100);
  const isStrict = mode === 'strict';

  return (
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="glass-panel max-w-md w-full p-8 shadow-2xl bg-white/95 border border-white text-center rounded-3xl relative animate-slideUp">
        {/* Warning Icon Badge */}
        <div className="w-16 h-16 rounded-full bg-amber/20 border-2 border-amber flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-amber" />
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-black uppercase text-ink tracking-tight mb-2">
          You're Drifting From Your Aim
        </h2>

        {/* Aim Chip */}
        <div className="inline-block bg-soft-orange text-ink px-4 py-1.5 rounded-full text-xs font-black border border-primary/20 max-w-full truncate mb-3">
          Aim: {goal || 'Your Focus Goal'}
        </div>

        {/* Relevance Score & Page Details */}
        <div className="mb-6 space-y-1.5">
          <div>
            <span className="inline-block bg-amber/30 text-ink px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide">
              Semantic Relevance: {matchPct}%
            </span>
          </div>
          {(pageTitle || domain) && (
            <p className="text-xs font-semibold text-ink-muted truncate px-4">
              Detected on: <span className="text-ink font-bold">{pageTitle || domain}</span>
            </p>
          )}
        </div>

        {isStrict ? (
          <div className="space-y-4">
            <p className="text-xs font-bold text-ink-secondary bg-red-50 p-3 rounded-2xl border border-red-200">
              Strict Mode is active. Stay focused on your primary aim to maintain your streak and earn points!
            </p>
            <button
              onClick={onClose}
              className="w-full h-12 rounded-full bg-ink text-white font-black text-xs uppercase tracking-wider hover:bg-black transition-all shadow-md cursor-pointer"
            >
              Return to Aim
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Soft Mode Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onClose}
                className="h-12 rounded-full bg-primary text-ink font-black text-xs uppercase tracking-wider hover:bg-primary-hover transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Stay on Goal</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onDiscardSession}
                className="h-12 rounded-full bg-white border-2 border-ink/20 hover:border-ink text-ink font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Discard Session
              </button>
            </div>

            {/* Break option if rewards enabled */}
            {rewardsSummary && rewardsSummary.rewards_enabled !== false && onRedeemBreak && (
              <button
                onClick={onRedeemBreak}
                className="w-full py-2.5 px-4 rounded-full bg-soft-orange/80 hover:bg-soft-orange text-ink font-extrabold text-xs flex items-center justify-center gap-2 border border-primary/20 transition-all cursor-pointer"
              >
                <Coffee className="w-4 h-4 text-primary" />
                <span>Take Guilt-Free Break (100 pts)</span>
              </button>
            )}

            {/* Teaching feedback */}
            {onFeedback && (
              <div className="pt-2">
                <button
                  onClick={() => onFeedback(pageVisitId, domain, 'relevant')}
                  className="text-[11px] font-bold text-ink-muted hover:text-ink underline transition-colors cursor-pointer"
                >
                  This page is actually relevant to my goal
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
