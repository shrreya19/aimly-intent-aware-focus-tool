import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!consentGiven) {
      setError('You must accept the privacy tracking consent to create an account.');
      return;
    }

    setLoading(true);
    try {
      await signup(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-md">
              <div className="w-4 h-4 rounded-full bg-ink" />
            </div>
            <span className="text-2xl font-black tracking-wider uppercase text-ink">AIMLY</span>
          </Link>
          <h1 className="text-2xl font-black uppercase mt-4 text-ink">Create Your Account</h1>
          <p className="text-xs font-semibold text-ink-secondary mt-1">
            Focus with clarity and intelligent intent boundaries
          </p>
        </div>

        {/* Form Panel */}
        <div className="glass-panel p-8 shadow-frosted">
          {error && (
            <div className="p-3 mb-6 rounded-2xl bg-amber/30 border border-amber/60 text-xs font-bold text-ink">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-2 text-ink">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Morgan"
                className="w-full h-12 px-4 rounded-full glass-input text-sm font-semibold text-ink"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-2 text-ink">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                className="w-full h-12 px-4 rounded-full glass-input text-sm font-semibold text-ink"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-2 text-ink">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 px-4 rounded-full glass-input text-sm font-semibold text-ink"
              />
            </div>

            {/* Privacy Consent Checkbox (Course Specification) */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  required
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-ink/30 text-primary focus:ring-ink"
                />
                <span className="text-xs text-ink font-medium leading-relaxed">
                  <span className="font-bold">Required privacy consent:</span> Aimly analyzes page
                  titles and URLs only during active focus sessions. Nothing is tracked outside a
                  session.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-4 rounded-full bg-primary text-ink text-sm font-black hover:bg-primary-hover shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>Creating account...</span>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-ink/10 text-center">
            <p className="text-xs font-medium text-ink-secondary">
              Already have an account?{' '}
              <Link to="/login" className="font-extrabold text-ink hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
