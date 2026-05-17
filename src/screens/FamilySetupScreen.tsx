import { useState } from 'react';
import { createFamily, joinFamily } from '../lib/db';

type Mode = 'choose' | 'create' | 'join';

interface Props {
  userId: string;
  onComplete: (familyId: string) => void;
}

export default function FamilySetupScreen({ userId, onComplete }: Props) {
  const [mode, setMode]       = useState<Mode>('choose');
  const [name, setName]       = useState('');
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const familyId = await createFamily(userId, name.trim() || 'My Family', 'family');
      onComplete(familyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const familyId = await joinFamily(userId, code);
      onComplete(familyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="app-header" style={{ flex: 'none' }}>
        <div className="header-top">
          <div className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/logo.svg" alt="" width="26" height="26" style={{ flexShrink: 0 }} />
            Home<span>Team</span>
          </div>
        </div>
        <div className="header-subtitle">Set up your family</div>
      </div>

      <div className="auth-body">
        <div className="auth-hero">
          <div className="auth-hero-icons">👨‍👩‍👧‍👦</div>
          <div className="auth-hero-title">
            {mode === 'choose' && 'One last step'}
            {mode === 'create' && 'Create your family'}
            {mode === 'join'   && 'Join your family'}
          </div>
          <div className="auth-hero-sub">
            {mode === 'choose' && 'Start a new family group or join one that\'s already set up'}
            {mode === 'create' && 'You\'ll get a code to share with your partner'}
            {mode === 'join'   && 'Enter the 6-character code from whoever set up the family'}
          </div>
        </div>

        <div className="auth-card">
          {mode === 'choose' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                className="btn btn-primary btn-full"
                onClick={() => { setMode('create'); setError(null); }}
              >
                🏠 Start a new family
              </button>
              <button
                className="btn btn-full"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', borderRadius: 12, padding: '14px 0', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
                onClick={() => { setMode('join'); setError(null); }}
              >
                🔗 Join an existing family
              </button>
            </div>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreate}>
              <div className="auth-field">
                <label className="auth-label">Family name</label>
                <input
                  className="auth-input"
                  type="text"
                  placeholder="e.g. The Thomas Family"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                />
              </div>
              {error && <div className="auth-error">{error}</div>}
              <button className="btn btn-primary btn-full auth-submit" type="submit" disabled={loading}>
                {loading ? 'Creating…' : 'Create family'}
              </button>
              <div className="auth-toggle">
                <button className="auth-toggle-btn" onClick={() => { setMode('choose'); setError(null); }}>
                  ← Back
                </button>
              </div>
            </form>
          )}

          {mode === 'join' && (
            <form onSubmit={handleJoin}>
              <div className="auth-field">
                <label className="auth-label">Family join code</label>
                <input
                  className="auth-input"
                  type="text"
                  placeholder="e.g. A1B2C3"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  autoFocus
                  style={{ textTransform: 'uppercase', letterSpacing: 4, fontSize: 20, textAlign: 'center' }}
                />
              </div>
              {error && <div className="auth-error">{error}</div>}
              <button className="btn btn-primary btn-full auth-submit" type="submit" disabled={loading || code.length < 6}>
                {loading ? 'Joining…' : 'Join family'}
              </button>
              <div className="auth-toggle">
                <button className="auth-toggle-btn" onClick={() => { setMode('choose'); setError(null); }}>
                  ← Back
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
