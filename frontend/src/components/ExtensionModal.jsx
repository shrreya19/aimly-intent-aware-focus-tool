import React, { useState } from 'react';
import { Download, Check, Copy, Puzzle, ExternalLink, X, Shield, Sparkles } from 'lucide-react';

export default function ExtensionModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText('chrome://extensions');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="glass-panel max-w-lg w-full p-6 md:p-8 shadow-2xl bg-white/95 border border-white relative rounded-3xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-black/5 text-ink-muted hover:text-ink transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-soft-orange border-2 border-primary/30 flex items-center justify-center mx-auto mb-3">
            <Puzzle className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-2xl font-black uppercase text-ink">Aimly Chrome Extension</h2>
          <p className="text-xs font-semibold text-ink-secondary mt-1">
            Manifest V3 • Real-Time Semantic Intent Enforcement
          </p>
        </div>

        {/* Option Info Banner */}
        <div className="p-3.5 mb-6 rounded-2xl bg-amber/20 border border-amber/40 text-xs text-ink space-y-1">
          <p className="font-black flex items-center gap-1.5 text-ink">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Two Ways to Experience Aimly:
          </p>
          <p className="text-[11px] text-ink-secondary font-medium leading-relaxed">
            • <strong>No install needed:</strong> You can test the full AI semantic drift overlay using the <strong>Live Simulator</strong> on the Active Session page.
            <br />
            • <strong>Full browser enforcement:</strong> Install the extension below to monitor real external tabs (YouTube, LeetCode, Reddit, etc.).
          </p>
        </div>

        {/* Step-by-Step Installation */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-cream/60 border border-ink/5 text-xs">
            <span className="w-6 h-6 rounded-full bg-primary text-ink font-black flex items-center justify-center shrink-0 text-xs">
              1
            </span>
            <div className="flex-1">
              <p className="font-extrabold text-ink">Download & Unzip</p>
              <p className="text-[11px] text-ink-secondary mt-0.5">
                Download the extension package below and extract the folder to your computer.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-cream/60 border border-ink/5 text-xs">
            <span className="w-6 h-6 rounded-full bg-primary text-ink font-black flex items-center justify-center shrink-0 text-xs">
              2
            </span>
            <div className="flex-1">
              <p className="font-extrabold text-ink">Open Chrome Extensions</p>
              <p className="text-[11px] text-ink-secondary mt-0.5 mb-1.5">
                Navigate to <code className="bg-white/80 px-1.5 py-0.5 rounded font-mono text-[10px]">chrome://extensions</code> in a new tab and toggle <strong>Developer mode</strong> (top-right).
              </p>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-ink/10 text-[10px] font-bold text-ink hover:bg-soft-orange transition-all cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-ink-secondary" />}
                <span>{copied ? 'Copied URL' : 'Copy chrome://extensions'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-cream/60 border border-ink/5 text-xs">
            <span className="w-6 h-6 rounded-full bg-primary text-ink font-black flex items-center justify-center shrink-0 text-xs">
              3
            </span>
            <div className="flex-1">
              <p className="font-extrabold text-ink">Load Unpacked</p>
              <p className="text-[11px] text-ink-secondary mt-0.5">
                Click <strong>Load unpacked</strong> in the top-left and select the extracted folder.
              </p>
            </div>
          </div>
        </div>

        {/* Primary Download Button */}
        <a
          href="/aimly-extension.zip"
          download="aimly-extension.zip"
          className="w-full h-12 rounded-full bg-primary text-ink font-black text-sm uppercase tracking-wider hover:bg-primary-hover shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Download Extension (.zip)</span>
        </a>

        <div className="mt-4 text-center">
          <button
            onClick={onClose}
            className="text-xs font-bold text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            I'll use the in-browser simulator
          </button>
        </div>
      </div>
    </div>
  );
}
