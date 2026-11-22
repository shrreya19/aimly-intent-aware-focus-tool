import React from 'react';
import { Link } from 'react-router-dom';
import { Target, ShieldCheck, Zap, ArrowRight, Activity, Cpu } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen text-ink px-4 py-8 md:py-16 max-w-6xl mx-auto flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="glass-panel px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-md">
            <div className="w-3.5 h-3.5 rounded-full bg-ink" />
          </div>
          <span className="text-xl font-black tracking-wider uppercase">AIMLY</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="text-sm font-bold text-ink hover:text-primary transition-colors px-3 py-2"
          >
            Log In
          </Link>
          <Link
            to="/signup"
            className="px-5 py-2.5 rounded-full bg-primary text-ink text-sm font-extrabold hover:bg-primary-hover shadow-sm transition-all"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="my-16 md:my-24 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-soft-orange text-ink text-xs font-bold mb-6 border border-ink/10 shadow-xs">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span>Next-Generation Semantic Focus Engine</span>
        </div>

        <h1 className="text-4xl md:text-7xl font-black tracking-tight leading-none uppercase mb-6">
          SET YOUR AIM. <br />
          <span className="text-primary">STAY ON IT.</span>
        </h1>

        <p className="text-lg md:text-xl text-ink-secondary font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
          Traditional blocklists are broken. Aimly uses real-time semantic intelligence to understand
          your one-line goal and keep you on track—without blocking the web.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/signup"
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-primary text-ink text-base font-extrabold hover:bg-primary-hover shadow-md flex items-center justify-center gap-2 transition-all hover:scale-105"
          >
            <span>Start Focusing Free</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-ink text-white text-base font-bold hover:bg-black shadow-md transition-all"
          >
            Log in to Account
          </Link>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
        <div className="glass-panel p-8 shadow-frosted flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center mb-6">
              <Cpu className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-black uppercase mb-3">Goal-Aware ML Scoring</h2>
            <p className="text-sm text-ink-secondary font-medium leading-relaxed">
              Every page is analyzed using sentence transformer embeddings. Watch a YouTube lecture
              for your algorithm class? Allowed. Binge standup comedy? Drift alert.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-ink/10 text-xs font-bold text-ink-muted uppercase">
            MiniLM-L6-v2 Embeddings
          </div>
        </div>

        <div className="glass-panel p-8 shadow-frosted flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber/20 flex items-center justify-center mb-6">
              <Activity className="w-6 h-6 text-amber" />
            </div>
            <h2 className="text-xl font-black uppercase mb-3">Adaptive Modes</h2>
            <p className="text-sm text-ink-secondary font-medium leading-relaxed">
              Choose Soft mode for gentle nudges and self-correction, or Strict mode to enforce deep
              immersion with mandatory tab closure.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-ink/10 text-xs font-bold text-ink-muted uppercase">
            Personalized Feedback Loop
          </div>
        </div>

        <div className="glass-panel p-8 shadow-frosted flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-soft-orange flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6 text-ink" />
            </div>
            <h2 className="text-xl font-black uppercase mb-3">Privacy First</h2>
            <p className="text-sm text-ink-secondary font-medium leading-relaxed">
              Aimly only inspects page titles and URLs during active focus sessions. Nothing is
              stored or tracked outside your session. GDPR export and one-click data wipe included.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-ink/10 text-xs font-bold text-ink-muted uppercase">
            Session-Only Telemetry
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 text-center text-xs text-ink-muted font-semibold flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-ink/10 pt-8">
        <div>AIMLY • Human-Computer Interaction Course Project</div>
        <div className="flex gap-4">
          <Link to="/login" className="hover:text-ink">Log In</Link>
          <Link to="/signup" className="hover:text-ink">Sign Up</Link>
        </div>
      </footer>
    </div>
  );
}
