import { useState } from 'react';
import { createGroup, joinGroup, GROUP_TYPE_META } from '../lib/db';

type Mode = 'choose' | 'create' | 'join';

interface Props {
  userId: string;
  onComplete: (groupId: string) => void;
  onClose: () => void;
}

const GROUP_TYPES = ['family', 'sports', 'school', 'work', 'friends', 'other'] as const;

export default function GroupModal({ userId, onComplete, onClose }: Props) {
  const [mode, setMode]         = useState<Mode>('choose');
  const [name, setName]         = useState('');
  const [groupType, setGroupType] = useState('family');
  const [code, setCode]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const id = await createGroup(userId, name.trim() || GROUP_TYPE_META[groupType].label, groupType);
      onComplete(id);
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
      const id = await joinGroup(userId, code);
      onComplete(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

      {/* Sheet */}
      <div style={{ position: 'relative', background: 'var(--card)', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', maxHeight: '85dvh', overflowY: 'auto' }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />

        {mode === 'choose' && (
          <>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Add a group</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Create a new group or join one with a code</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="btn btn-primary btn-full"
                onClick={() => { setMode('create'); setError(null); }}
              >
                ✨ Create a new group
              </button>
              <button
                onClick={() => { setMode('join'); setError(null); }}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', borderRadius: 12, padding: '14px 0', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
              >
                🔗 Join with a code
              </button>
            </div>
          </>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Create a group</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>You'll get a code to share with others</div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Group type</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {GROUP_TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setGroupType(t)}
                    style={{
                      padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                      background: groupType === t ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.05)',
                      borderColor: groupType === t ? '#60a5fa' : 'rgba(255,255,255,0.1)',
                      color: groupType === t ? '#60a5fa' : 'rgba(255,255,255,0.7)',
                    }}
                  >
                    {GROUP_TYPE_META[t].icon} {GROUP_TYPE_META[t].label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Name (optional)</div>
              <input
                className="auth-input"
                type="text"
                placeholder={`e.g. ${GROUP_TYPE_META[groupType].label}`}
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>

            {error && <div className="auth-error" style={{ marginBottom: 12 }}>{error}</div>}
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? 'Creating…' : `Create ${GROUP_TYPE_META[groupType].label}`}
            </button>
            <button type="button" className="auth-toggle-btn" style={{ display: 'block', margin: '12px auto 0', fontSize: 13 }}
              onClick={() => { setMode('choose'); setError(null); }}>
              ← Back
            </button>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Join a group</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Enter the 6-character code from the group owner</div>

            <div style={{ marginBottom: 16 }}>
              <input
                className="auth-input"
                type="text"
                placeholder="A1B2C3"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                autoFocus
                style={{ textTransform: 'uppercase', letterSpacing: 6, fontSize: 22, textAlign: 'center', fontWeight: 700 }}
              />
            </div>

            {error && <div className="auth-error" style={{ marginBottom: 12 }}>{error}</div>}
            <button className="btn btn-primary btn-full" type="submit" disabled={loading || code.length < 6}>
              {loading ? 'Joining…' : 'Join group'}
            </button>
            <button type="button" className="auth-toggle-btn" style={{ display: 'block', margin: '12px auto 0', fontSize: 13 }}
              onClick={() => { setMode('choose'); setError(null); }}>
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
