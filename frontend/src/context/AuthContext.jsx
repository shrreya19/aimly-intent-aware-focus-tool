import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [rewardsSummary, setRewardsSummary] = useState(null);

  const refreshRewards = useCallback(async () => {
    const token = localStorage.getItem('aimly_token');
    if (!token) return null;
    try {
      const summary = await api.rewards.getSummary();
      setRewardsSummary(summary);
      return summary;
    } catch {
      return null;
    }
  }, []);

  // Load user on mount if token exists
  useEffect(() => {
    async function initAuth() {
      const token = localStorage.getItem('aimly_token');
      if (token) {
        try {
          const res = await api.auth.getMe();
          setUser(res.user);
          refreshRewards();
          // Check active session safely
          try {
            const activeRes = await api.sessions.getActive();
            setActiveSession(activeRes.session || null);
          } catch {
            setActiveSession(null);
          }
        } catch (err) {
          console.warn('Session expired or invalid token:', err.message);
          localStorage.removeItem('aimly_token');
          setUser(null);
        }
      }
      setLoading(false);
    }
    initAuth();
  }, [refreshRewards]);

  const login = async (email, password) => {
    const res = await api.auth.login({ email, password });
    localStorage.setItem('aimly_token', res.token);
    setUser(res.user);
    refreshRewards();
    // Refresh active session safely
    try {
      const activeRes = await api.sessions.getActive();
      setActiveSession(activeRes.session || null);
    } catch {
      setActiveSession(null);
    }
    return res;
  };

  const signup = async (name, email, password) => {
    const res = await api.auth.signup({ name, email, password });
    localStorage.setItem('aimly_token', res.token);
    setUser(res.user);
    refreshRewards();
    setActiveSession(null);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('aimly_token');
    setUser(null);
    setActiveSession(null);
    setRewardsSummary(null);
  };

  const refreshActiveSession = async () => {
    if (!user) return null;
    try {
      const res = await api.sessions.getActive();
      setActiveSession(res.session || null);
      return res.session;
    } catch {
      return null;
    }
  };

  const value = {
    user,
    setUser,
    loading,
    activeSession,
    setActiveSession,
    refreshActiveSession,
    rewardsSummary,
    setRewardsSummary,
    refreshRewards,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
