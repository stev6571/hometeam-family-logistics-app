import { useState } from 'react';
import type { FamilyMember, Event } from '../types';

const SPORTS = ['football', 'rugby', 'swimming', 'tennis', 'athletics', 'hockey', 'cricket', 'gymnastics', 'dance', 'other'] as const;
const SPORT_ICONS: Record<string, string> = {
  football: '⚽', rugby: '🏉', swimming: '🏊', tennis: '🎾',
  athletics: '🏃', hockey: '🏑', cricket: '🏏', gymnastics: '🤸', dance: '💃', other: '🏅',
};

interface Props {
  members: FamilyMember[];
  onSave: (event: Event, needsLift: boolean) => void;
  onClose: () => void;
}

export default function AddEventModal({ members, onSave, onClose }: Props) {
  const children = members.filter(m => m.role === 'child');
  const [title, setTitle]       = useState('');
  const [memberId, setMemberId] = useState(children[0]?.id ?? members[0]?.id ?? '');
  const [date, setDate]         = useState('Saturday');
  const [time, setTime]         = useState('');
  const [location, setLocation] = useState('');
  const [sport, setSport]       = useState<typeof SPORTS[number]>('football');
  const [needsLift, setNeedsLift] = useState(true);

  const canSave = title.trim() && memberId && time;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: `evt-${Date.now()}`,
      title: title.trim(),
      memberId,
      date,
      time,
      location: location.trim() || 'TBC',
      sport,
      transportAssigned: !needsLift,
      kitChecked: false,
    }, needsLift);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: 'var(--card)', borderRadius: '20px 20px 0 0', padding: '24px 20px 44px', maxHeight: '90dvh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />
        <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 20 }}>Add an event</div>

        {/* Sport */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>Sport</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SPORTS.map(s => (
              <button key={s} type="button"
                onClick={() => {
                  setSport(s);
                  if (!title) setTitle(s.charAt(0).toUpperCase() + s.slice(1) + ' training');
                }}
                style={{
                  padding: '7px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                  background: sport === s ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.05)',
                  borderColor: sport === s ? '#60a5fa' : 'rgba(255,255,255,0.1)',
                  color: sport === s ? '#60a5fa' : 'rgba(255,255,255,0.65)',
                }}
              >
                {SPORT_ICONS[s]} {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>Event name</div>
          <input className="auth-input" type="text" placeholder="e.g. Football Training" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        </div>

        {/* Who */}
        {members.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>Who</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(children.length > 0 ? children : members).map(m => (
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
        )}

        {/* Day */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>Day</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['Saturday', 'Sunday', 'Weekday'].map(d => (
              <button key={d} type="button" onClick={() => setDate(d)} style={{
                flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                background: date === d ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.05)',
                borderColor: date === d ? '#60a5fa' : 'rgba(255,255,255,0.1)',
                color: date === d ? '#60a5fa' : 'rgba(255,255,255,0.65)',
              }}>
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Time + Location */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>Time</div>
            <input className="auth-input" type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
          <div style={{ flex: 2 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>Location</div>
            <input className="auth-input" type="text" placeholder="e.g. Sports Park" value={location} onChange={e => setLocation(e.target.value)} />
          </div>
        </div>

        {/* Needs lift toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Needs a lift?</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Adds this to the Lifts tab</div>
          </div>
          <button type="button" onClick={() => setNeedsLift(n => !n)} style={{
            width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
            background: needsLift ? '#60a5fa' : 'rgba(255,255,255,0.15)',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: 3, left: needsLift ? 23 : 3,
              width: 22, height: 22, borderRadius: 11, background: 'white',
              transition: 'left 0.2s',
            }} />
          </button>
        </div>

        <button className="btn btn-primary btn-full" onClick={handleSave} disabled={!canSave}>
          Add event
        </button>
        <button type="button" className="auth-toggle-btn" style={{ display: 'block', margin: '12px auto 0', fontSize: 13 }} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
