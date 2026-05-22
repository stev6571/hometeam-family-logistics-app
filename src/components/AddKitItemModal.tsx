import { useState } from 'react';
import type { FamilyMember, KitItem } from '../types';

const CATEGORIES = ['boots', 'clothing', 'protection', 'accessories', 'bag'] as const;
const CAT_LABELS: Record<string, string> = {
  boots: '👟 Boots', clothing: '👕 Clothing', protection: '🛡️ Protection',
  accessories: '🎒 Accessories', bag: '🧳 Bag',
};

interface Props {
  members: FamilyMember[];
  onSave: (item: KitItem) => void;
  onClose: () => void;
}

export default function AddKitItemModal({ members, onSave, onClose }: Props) {
  const [name, setName]         = useState('');
  const [memberId, setMemberId] = useState(members[0]?.id ?? '');
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('accessories');
  const [urgent, setUrgent]     = useState(false);

  const selectedMember = members.find(m => m.id === memberId);
  const canSave = name.trim() && memberId;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: `kit-${Date.now()}`,
      name: name.trim(),
      memberId,
      memberName: selectedMember?.name ?? '',
      sport: 'general',
      urgent,
      completed: false,
      category,
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: 'var(--card)', borderRadius: '20px 20px 0 0', padding: '24px 20px 44px', maxHeight: '88dvh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />
        <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 20 }}>Add kit item</div>

        {/* Who */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>For who</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {members.map(m => (
              <button key={m.id} type="button" onClick={() => setMemberId(m.id)} style={{
                padding: '7px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                background: memberId === m.id ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.05)',
                borderColor: memberId === m.id ? '#60a5fa' : 'rgba(255,255,255,0.1)',
                color: memberId === m.id ? '#60a5fa' : 'rgba(255,255,255,0.65)',
              }}>
                {m.avatar} {m.name}
              </button>
            ))}
          </div>
        </div>

        {/* Item name */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>Item</div>
          <input
            className="auth-input" type="text" placeholder="e.g. Football boots"
            value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
          />
        </div>

        {/* Category */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>Category</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIES.map(c => (
              <button key={c} type="button" onClick={() => setCategory(c)} style={{
                padding: '7px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                background: category === c ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.05)',
                borderColor: category === c ? '#60a5fa' : 'rgba(255,255,255,0.1)',
                color: category === c ? '#60a5fa' : 'rgba(255,255,255,0.65)',
              }}>
                {CAT_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        {/* Urgent */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Mark as urgent</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Flags this as a priority item</div>
          </div>
          <button type="button" onClick={() => setUrgent(u => !u)} style={{
            width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
            background: urgent ? '#f87171' : 'rgba(255,255,255,0.15)',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: 3, left: urgent ? 23 : 3,
              width: 22, height: 22, borderRadius: 11, background: 'white',
              transition: 'left 0.2s',
            }} />
          </button>
        </div>

        <button className="btn btn-primary btn-full" onClick={handleSave} disabled={!canSave}>
          Add item
        </button>
        <button type="button" className="auth-toggle-btn" style={{ display: 'block', margin: '12px auto 0', fontSize: 13 }} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
