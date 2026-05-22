import { useState } from 'react';
import type { FamilyMember } from '../types';

const CHILD_AVATARS  = ['🧒', '👦', '👧', '🧑'];
const PARENT_AVATARS = ['👨', '👩', '🧑', '👴', '👵'];

interface Props {
  onSave: (member: FamilyMember, addAsDriver: boolean) => void;
  onClose: () => void;
}

export default function AddMemberModal({ onSave, onClose }: Props) {
  const [name, setName]   = useState('');
  const [role, setRole]   = useState<'child' | 'parent'>('child');
  const [avatar, setAvatar] = useState('🧒');

  const avatars = role === 'parent' ? PARENT_AVATARS : CHILD_AVATARS;

  const handleRoleChange = (r: 'child' | 'parent') => {
    setRole(r);
    setAvatar(r === 'parent' ? '👨' : '🧒');
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    onSave({ id, name: name.trim(), avatar, role }, role === 'parent');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: 'var(--card)', borderRadius: '20px 20px 0 0', padding: '24px 20px 44px', maxHeight: '88dvh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />
        <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 16 }}>Add a person</div>

        {/* Role */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['child', 'parent'] as const).map(r => (
            <button key={r} type="button" onClick={() => handleRoleChange(r)} style={{
              flex: 1, padding: '10px 0', borderRadius: 10, fontWeight: 600, fontSize: 14,
              border: '1.5px solid',
              borderColor: role === r ? '#60a5fa' : 'rgba(255,255,255,0.12)',
              background: role === r ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.05)',
              color: role === r ? '#60a5fa' : 'rgba(255,255,255,0.65)',
              cursor: 'pointer',
            }}>
              {r === 'child' ? '🧒 Child' : '👤 Parent / Carer'}
            </button>
          ))}
        </div>

        {/* Avatar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>Avatar</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {avatars.map(a => (
              <button key={a} type="button" onClick={() => setAvatar(a)} style={{
                width: 44, height: 44, fontSize: 24, borderRadius: 12, border: '2px solid',
                borderColor: avatar === a ? '#60a5fa' : 'rgba(255,255,255,0.12)',
                background: avatar === a ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.05)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>Name</div>
          <input
            className="auth-input" type="text"
            placeholder={role === 'child' ? 'e.g. Jack' : 'e.g. Sarah'}
            value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
          />
        </div>

        <button className="btn btn-primary btn-full" onClick={handleSave} disabled={!name.trim()}>
          Add {name.trim() || 'person'}
        </button>
        <button type="button" className="auth-toggle-btn" style={{ display: 'block', margin: '12px auto 0', fontSize: 13 }} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
