import React, { useState } from 'react';
import type { AppState, KitItem } from '../types';
import AddKitItemModal from '../components/AddKitItemModal';

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const catLabel: Record<string, string> = {
  boots: '👟 Boots',
  clothing: '👕 Clothing',
  protection: '🛡️ Protection',
  accessories: '🎒 Accessories',
  bag: '🧳 Bag',
};

export default function KitScreen({ state, setState }: Props) {
  const [filter, setFilter]       = useState<'all' | 'urgent' | 'still needed'>('all');
  const [showAddKit, setShowAddKit] = useState(false);

  const handleAddKit = (item: KitItem) => {
    setState(prev => ({ ...prev, kitItems: [...prev.kitItems, item] }));
    setShowAddKit(false);
  };

  const toggleKit = (id: string) => {
    setState(prev => ({
      ...prev,
      kitItems: prev.kitItems.map(k => k.id === id ? { ...k, completed: !k.completed } : k),
      badges: checkKitBadge(prev.kitItems.map(k => k.id === id ? { ...k, completed: !k.completed } : k), prev.badges),
    }));
  };

  const checkKitBadge = (items: AppState['kitItems'], badges: AppState['badges']) => {
    const allDone = items.every(k => k.completed);
    return badges.map(b => b.id === 'b1' ? { ...b, earned: allDone } : b);
  };

  const toggleShop = (id: string) => {
    setState(prev => ({
      ...prev,
      shoppingItems: prev.shoppingItems.map(s => s.id === id ? { ...s, purchased: !s.purchased } : s),
    }));
  };

  const displayedKit = state.kitItems.filter(k => {
    if (filter === 'urgent') return k.urgent;
    if (filter === 'still needed') return !k.completed;
    return true;
  });

  const urgentMissing = state.kitItems.filter(k => k.urgent && !k.completed);
  const totalDone = state.kitItems.filter(k => k.completed).length;
  const totalItems = state.kitItems.length;

  const shareChecklist = () => {
    const lines = state.kitItems.map(k => `${k.completed ? '✅' : '❌'} ${k.memberName}: ${k.name}`);
    const msg = `📋 Sorted — Kit Checklist:\n${lines.join('\n')}\n\n${totalDone}/${totalItems} sorted.`;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  };

  // Group by member
  const members = [...new Set(state.kitItems.map(k => k.memberName))];

  return (
    <div className="screen-wrapper">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 4px' }}>
        <div className="section-heading" style={{ padding: 0, margin: 0 }}>Kit Checklist</div>
        <button onClick={() => setShowAddKit(true)} style={{
          background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)',
          borderRadius: 10, padding: '6px 14px', fontSize: 13, fontWeight: 700,
          color: '#60a5fa', cursor: 'pointer',
        }}>
          + Add item
        </button>
      </div>

      {/* Progress */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>{totalDone}/{totalItems}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>items sorted</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {urgentMissing.length > 0 ? (
              <span className="pill pill-red">{urgentMissing.length} urgent missing</span>
            ) : (
              <span className="pill pill-green">Nothing urgent missing</span>
            )}
          </div>
        </div>
        <div className="readiness-bar">
          <div
            className="readiness-fill"
            style={{
              width: `${totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0}%`,
              background: totalDone === totalItems ? 'var(--green)' : urgentMissing.length > 0 ? 'var(--red)' : 'var(--blue)',
            }}
          />
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px' }}>
        {(['all', 'urgent', 'still needed'] as const).map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(f)}
            style={{ textTransform: 'capitalize' }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Kit by member */}
      {members.map(memberName => {
        const items = displayedKit.filter(k => k.memberName === memberName);
        if (items.length === 0) return null;
        const event = state.events.find(e => {
          const m = state.familyMembers.find(fm => fm.name === memberName);
          return m && e.memberId === m.id;
        });

        return (
          <div key={memberName} className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>
                {memberName}
                {event && <span style={{ marginLeft: 6, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>· {event.sport}</span>}
              </div>
              {items.filter(k => k.urgent && !k.completed).length > 0 && (
                <span className="pill pill-red" style={{ fontSize: 11 }}>
                  {items.filter(k => k.urgent && !k.completed).length} urgent
                </span>
              )}
            </div>
            {items.map(kit => (
              <div key={kit.id} className="kit-row" onClick={() => toggleKit(kit.id)}>
                <div
                  className="kit-checkbox"
                  style={{
                    borderRadius: 6,
                    width: 22,
                    height: 22,
                    border: kit.completed ? 'none' : '2px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 13,
                    fontWeight: 700,
                    background: kit.completed ? 'var(--green)' : 'white',
                    color: 'white',
                  }}
                >
                  {kit.completed ? '✓' : ''}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      textDecoration: kit.completed ? 'line-through' : 'none',
                      color: kit.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                    }}
                  >
                    {kit.name}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  {kit.urgent && !kit.completed && (
                    <span className="pill pill-red" style={{ fontSize: 11, padding: '2px 7px' }}>Urgent</span>
                  )}
                  <span className={`pill cat-${kit.category}`} style={{ fontSize: 11, padding: '2px 7px' }}>
                    {catLabel[kit.category]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {displayedKit.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">{totalItems === 0 ? '⚽' : '✅'}</div>
            <div className="empty-title">{totalItems === 0 ? 'No kit items yet' : 'Nothing urgent missing'}</div>
            <div className="empty-sub">{totalItems === 0 ? 'Tap "+ Add item" to start your kit checklist.' : 'All urgent items are sorted.'}</div>
          </div>
        </div>
      )}

      {/* Shopping */}
      <div className="section-heading" style={{ fontSize: 16 }}>Still needed</div>
      <div className="card">
        {state.shoppingItems.filter(s => !s.purchased).length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛒</div>
            <div className="empty-title">Nothing urgent missing</div>
            <div className="empty-sub">All shopping done.</div>
          </div>
        ) : (
          state.shoppingItems.map(item => (
            <div key={item.id} className="shop-row" onClick={() => toggleShop(item.id)}>
              <div
                style={{
                  width: 22, height: 22, borderRadius: 6,
                  border: item.purchased ? 'none' : '2px solid var(--border)',
                  background: item.purchased ? 'var(--green)' : 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: 13, fontWeight: 700, color: 'white',
                }}
              >
                {item.purchased ? '✓' : ''}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: 600, fontSize: 14,
                  textDecoration: item.purchased ? 'line-through' : 'none',
                  color: item.purchased ? 'var(--text-muted)' : 'var(--text-primary)',
                }}>
                  {item.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>For {item.memberName}</div>
              </div>
              {item.urgent && !item.purchased && (
                <span className="pill pill-red" style={{ fontSize: 11 }}>Urgent</span>
              )}
            </div>
          ))
        )}
      </div>

      {/* WhatsApp Share */}
      <div style={{ margin: '0 16px 16px' }}>
        <button className="btn btn-whatsapp btn-full" onClick={shareChecklist}>
          📤 Share checklist to WhatsApp
        </button>
      </div>

      {showAddKit && (
        <AddKitItemModal
          members={state.familyMembers}
          onSave={handleAddKit}
          onClose={() => setShowAddKit(false)}
        />
      )}
    </div>
  );
}
