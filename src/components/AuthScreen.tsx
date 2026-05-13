import { useState } from 'react';
import { supabase } from '../lib/supabase';

type Mode = 'signin' | 'signup';

const FRIENDLY_ERRORS: Record<string, string> = {
  'Invalid login credentials':     'Wrong email or password. Try again.',
  'Email not confirmed':            'Check your inbox — you need to confirm your email first.',
  'User already registered':        'An account with that email already exists. Sign in instead.',
  'Password should be at least 6 characters': 'Password must be at least 6 characters.',
  'Unable to validate email address: invalid format': 'That doesn\'t look like a valid email.',
};

function friendlyError(msg: string): string {
  for (const [key, val] of Object.entries(FRIENDLY_ERRORS)) {
    if (msg.includes(key)) return val;
  }
  return msg;
}

export default function AuthScreen() {
  const [mode, setMode]         = useState<Mode>('signin');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(friendlyError(error.message));
      } else {
        setSuccess('Account created! Check your email to confirm, then sign in.');
        setMode('signin');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(friendlyError(error.message));
      // On success, App.tsx's onAuthStateChange fires and switches view automatically
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">
      {/* Header */}
      <div className="app-header" style={{ flex: 'none' }}>
        <div className="header-top">
          <div className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/logo.svg" alt="" width="26" height="26" style={{ flexShrink: 0 }} />
            Home<span>Team</span>
          </div>
        </div>
        <div className="header-subtitle">Family sports logistics, sorted</div>
      </div>

      <div className="auth-body">
        {/* Hero */}
        <div className="auth-hero">
          <div className="auth-hero-icons">🏉 ⚽ 🏊 🚗</div>
          <div className="auth-hero-title">
            {mode === 'signup' ? 'Set up your family' : 'Welcome back'}
          </div>
          <div className="auth-hero-sub">
            {mode === 'signup'
              ? 'Track lifts, kit and plans for the whole family'
              : 'Pick up where you left off'}
          </div>
        </div>

        {/* Card */}
        <div className="auth-card">
          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input
                className="auth-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">Password</label>
              <input
                className="auth-input"
                type="password"
                placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </div>

            {error && (
              <div className="auth-error">{error}</div>
            )}
            {success && (
              <div className="auth-success">{success}</div>
            )}

            <button
              className="btn btn-primary btn-full auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? (mode === 'signup' ? 'Creating account…' : 'Signing in…')
                : (mode === 'signup' ? 'Create family account' : 'Sign in')}
            </button>
          </form>

          <div className="auth-toggle">
            {mode === 'signin' ? (
              <>
                New to HomeTeam?{' '}
                <button className="auth-toggle-btn" onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}>
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button className="auth-toggle-btn" onClick={() => { setMode('signin'); setError(null); setSuccess(null); }}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        {/* Feature list */}
        <div className="auth-features">
          {[
            { icon: '🚗', text: 'Organise lifts across the family' },
            { icon: '⚽', text: 'Track kit for every child and sport' },
            { icon: '🎙️', text: 'Talk & Go voice assistant' },
            { icon: '🏆', text: 'Weekend readiness score' },
          ].map(f => (
            <div key={f.icon} className="auth-feature">
              <span className="auth-feature-icon">{f.icon}</span>
              <span className="auth-feature-text">{f.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
