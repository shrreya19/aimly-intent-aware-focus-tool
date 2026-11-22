import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
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
          <h1 className="text-2xl font-black uppercase mt-4 text-ink">Log In to Focus</h1>
          <p className="text-xs font-semibold text-ink-secondary mt-1">
            Pick up right where you left off
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
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-12 px-4 rounded-full glass-input text-sm font-semibold text-ink"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-2 text-ink">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 pl-4 pr-11 rounded-full glass-input text-sm font-semibold text-ink"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-secondary hover:text-ink cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-4 rounded-full bg-primary text-ink text-sm font-black hover:bg-primary-hover shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Logging in...</span>
              ) : (
                <>
                  <span>Log In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('demo@aimly.app');
                setPassword('demo1234');
              }}
              className="w-full h-10 mt-2 rounded-full bg-soft-orange/60 border border-primary/20 text-ink text-xs font-bold hover:bg-soft-orange flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Quick Demo: demo@aimly.app</span>
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-ink/10 text-center">
            <p className="text-xs font-medium text-ink-secondary">
              Don't have an account yet?{' '}
              <Link to="/signup" className="font-extrabold text-ink hover:underline">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
