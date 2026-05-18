import { useState } from 'react';
import { createGroup, joinGroup, GROUP_TYPE_META } from '../lib/db';
import { supabase } from '../lib/supabase';

type Mode = 'choose' | 'create' | 'join' | 'created';

interface Props {
  userId: string;
  onComplete: (groupId: string) => void;
  onClose: () => void;
}

const GROUP_TYPES = ['family', 'sports', 'club', 'dance', 'school', 'work', 'friends', 'other'] as const;
const APP_URL = 'https://hometeam-family-logistics-app.vercel.app';

export default function GroupModal({ userId, onComplete, onClose }: Props) {
  const [mode, setMode]           = useState<Mode>('choose');
  const [name, setName]           = useState('');
  const [groupType, setGroupType] = useState('family');
  const [code, setCode]           = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [createdId, setCreatedId] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [createdName, setCreatedName] = useState('');
  const [copied, setCopied]       = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const finalName = name.trim() || GROUP_TYPE_META[groupType].label;
      const id = await createGroup(userId, finalName, groupType);
      const { data } = await supabase.from('families').select('join_code').eq('id', id).single();
      setCreatedId(id);
      setCreatedCode(data?.join_code ?? '------');
      setCreatedName(finalName);
      setMode('created');
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

  const shareText = `Join our ${createdName} on HomeTeam!\n\nEnter code: ${createdCode}\n${APP_URL}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join HomeTeam', text: shareText });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

      <div style={{ position: 'relative', background: 'var(--card)', borderRadius: '20px 20px 0 0', padding: '24px 20px 44px', maxHeight: '88dvh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />

        {/* ── Choose ── */}
        {mode === 'choose' && (
          <>
            <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 4 }}>Add a group</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Create a group for your family, team, club or dance troupe — then share a code so everyone can join and sort lifts together.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn btn-primary btn-full" onClick={() => { setMode('create'); setError(null); }}>
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

        {/* ── Create ── */}
        {mode === 'create' && (
          <form onSubmit={handleCreate}>
            <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 4 }}>Create a group</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Choose a type, give it a name, then share the join code with your members.
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>What kind of group?</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {GROUP_TYPES.map(t => {
                  const m = GROUP_TYPE_META[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setGroupType(t)}
                      style={{
                        padding: '8px 13px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                        background: groupType === t ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.05)',
                        borderColor: groupType === t ? '#60a5fa' : 'rgba(255,255,255,0.1)',
                        color: groupType === t ? '#60a5fa' : 'rgba(255,255,255,0.65)',
                        transition: 'all 0.12s',
                      }}
                    >
                      {m.icon} {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>Name (optional)</div>
              <input
                className="auth-input"
                type="text"
                placeholder={`e.g. The ${GROUP_TYPE_META[groupType].label}`}
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

        {/* ── Join ── */}
        {mode === 'join' && (
          <form onSubmit={handleJoin}>
            <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 4 }}>Join a group</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Enter the 6-character code from the group owner. Once you're in, you'll share lifts, kit and updates with the group.
            </div>

            <input
              className="auth-input"
              type="text"
              placeholder="A1B2C3"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              autoFocus
              style={{ textTransform: 'uppercase', letterSpacing: 6, fontSize: 22, textAlign: 'center', fontWeight: 700, marginBottom: 16 }}
            />

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

        {/* ── Created — share screen ── */}
        {mode === 'created' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>{createdName} created!</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Share this code with your {GROUP_TYPE_META[groupType]?.label.toLowerCase() ?? 'group'} members so they can join and sort lifts together.
            </div>

            {/* Big code display */}
            <div style={{ background: 'rgba(96,165,250,0.1)', border: '1.5px solid rgba(96,165,250,0.3)', borderRadius: 16, padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Join code</div>
              <div style={{ fontFamily: 'monospace', fontSize: 36, fontWeight: 800, letterSpacing: 10, color: '#60a5fa' }}>
                {createdCode}
              </div>
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={handleShare}
              style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {copied ? '✓ Copied!' : (typeof navigator.share === 'function' ? '📲 Share invite' : '📋 Copy invite')}
            </button>
            <button
              className="btn btn-full"
              onClick={() => onComplete(createdId)}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', borderRadius: 12, padding: '13px 0', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
