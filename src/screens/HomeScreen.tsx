import React from 'react';
import type { AppState, Tab } from '../types';
import type { Group } from '../lib/db';
import { GROUP_TYPE_META } from '../lib/db';

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  setTab: (tab: Tab) => void;
  onOpenVoice?: () => void;
  groups?: Group[];
  activeGroupId?: string | null;
  onGroupSwitch?: (id: string) => void;
  onGroupAdd?: () => void;
}

function calcReadiness(state: AppState): number {
  const factors: number[] = [];

  // Transport: what % of events have transport assigned
  if (state.events.length > 0) {
    const assigned = state.events.filter(e => e.transportAssigned).length;
    factors.push(assigned / state.events.length);
  }

  // Kit: what % of kit items completed
  if (state.kitItems.length > 0) {
    const done = state.kitItems.filter(k => k.completed).length;
    factors.push(done / state.kitItems.length);
  }

  // Urgent shopping resolved
  const urgentShop = state.shoppingItems.filter(s => s.urgent);
  if (urgentShop.length > 0) {
    const resolved = urgentShop.filter(s => s.purchased).length;
    factors.push(resolved / urgentShop.length);
  } else {
    factors.push(1);
  }

  // Chores done
  if (state.chores.length > 0) {
    const done = state.chores.filter(c => c.completed).length;
    factors.push(done / state.chores.length);
  }

  // Unread urgent notices (penalise each one)
  const urgentUnread = state.notices.filter(n => n.urgent && !n.read).length;
  factors.push(urgentUnread === 0 ? 1 : Math.max(0, 1 - urgentUnread * 0.3));

  if (factors.length === 0) return 0;
  return Math.round((factors.reduce((a, b) => a + b, 0) / factors.length) * 100);
}

function getReadinessStatus(score: number): { text: string; color: string } {
  if (score < 40) return { text: 'Still a bit of chaos', color: '#f87171' };
  if (score < 70) return { text: 'Getting there', color: '#fbbf24' };
  if (score < 90) return { text: 'Nearly ready', color: '#60a5fa' };
  return { text: 'HomeTeam ready 🎉', color: '#34d399' };
}

function buildAlerts(state: AppState) {
  const alerts: Array<{
    id: string;
    icon: string;
    text: string;
    sub: string;
    severity: 'red' | 'orange' | 'blue';
    tab: Tab;
  }> = [];

  // Urgent unread notices
  const urgentNotices = state.notices.filter(n => n.urgent && !n.read);
  urgentNotices.forEach(n => {
    alerts.push({
      id: `notice-${n.id}`,
      icon: '📢',
      text: `Unread urgent notice from ${n.from}`,
      sub: n.title,
      severity: 'red',
      tab: 'noticeboard',
    });
  });

  // Unassigned lifts
  const unassigned = state.liftRequests.filter(lr => !lr.assignedDriverId);
  unassigned.forEach(lr => {
    alerts.push({
      id: `lift-${lr.id}`,
      icon: '🚗',
      text: `${lr.childName} needs a lift to ${lr.eventTitle}`,
      sub: `${lr.time} — ${lr.location}`,
      severity: 'orange',
      tab: 'lifts',
    });
  });

  // Urgent kit items
  const urgentKit = state.kitItems.filter(k => k.urgent && !k.completed);
  if (urgentKit.length > 0) {
    const names = [...new Set(urgentKit.map(k => k.memberName))];
    alerts.push({
      id: 'urgent-kit',
      icon: '⚠️',
      text: `${urgentKit.length} urgent kit item${urgentKit.length > 1 ? 's' : ''} still needed`,
      sub: names.join(', '),
      severity: 'red',
      tab: 'kit',
    });
  }

  // Check weekend readiness
  const weekendEvents = state.events.filter(e => e.date === 'Saturday' || e.date === 'Sunday');
  if (weekendEvents.length > 0) {
    const ready = weekendEvents.filter(e => e.transportAssigned && e.kitChecked).length;
    const pct = Math.round((ready / weekendEvents.length) * 100);
    if (pct < 70) {
      alerts.push({
        id: 'weekend-ready',
        icon: '🏆',
        text: `Weekend is only ${pct}% sorted`,
        sub: `${weekendEvents.length - ready} of ${weekendEvents.length} events still need attention`,
        severity: 'orange',
        tab: 'weekend',
      });
    }
  }

  return alerts;
}

function buildAssistantPrompts(state: AppState): string[] {
  const prompts: string[] = [];

  // Jack rugby alerts
  const jackUrgentKit = state.kitItems.filter(k => k.memberName === 'Jack' && k.urgent && !k.completed);
  if (jackUrgentKit.length > 0) {
    const rugbyEvent = state.events.find(e => e.memberId === 'jack');
    const time = rugbyEvent ? ` at ${rugbyEvent.time}` : '';
    const sport = rugbyEvent ? `${rugbyEvent.sport} training` : 'training';
    prompts.push(`Jack has ${sport}${time} and still needs ${jackUrgentKit.map(k => k.name.toLowerCase()).join(' and ')}.`);
  }

  // Unconfirmed lifts
  const unassigned = state.liftRequests.filter(lr => !lr.assignedDriverId);
  unassigned.forEach(lr => {
    prompts.push(`${lr.childName}'s ${lr.eventTitle.toLowerCase()} has no confirmed lift yet.`);
  });

  // Weekend busy
  const weekendCount = state.events.filter(e => e.date === 'Saturday' || e.date === 'Sunday').length;
  if (weekendCount >= 3) {
    prompts.push(`Saturday looks busy with ${weekendCount} events. Sort kit tonight to avoid morning chaos.`);
  }

  return prompts.slice(0, 3);
}

function WeatherKitCard({ weather }: { weather: AppState['weather'] }) {
  const config: Record<string, { icon: string; items: string[]; className: string }> = {
    rain: { icon: '🌧️', items: ['Towel', 'Waterproof jacket', 'Spare socks', 'Boot bag'], className: 'weather-rain' },
    cold: { icon: '🥶', items: ['Base layer', 'Gloves', 'Warm coat'], className: 'weather-cold' },
    sunny: { icon: '☀️', items: ['Water bottle', 'Sun cream', 'Cap'], className: 'weather-sunny' },
    mixed: { icon: '⛅', items: ['Waterproof', 'Water bottle', 'Layers'], className: 'weather-mixed' },
  };
  const w = config[weather.condition];

  return (
    <div className={`weather-card ${w.className}`}>
      <div className="weather-header">
        <span className="weather-icon">{w.icon}</span>
        <div>
          <div className="weather-desc">{weather.description}</div>
          <div className="weather-temp">{weather.temp}°C this weekend</div>
        </div>
      </div>
      <div className="weather-pills">
        {w.items.map(item => (
          <span key={item} className="weather-pill">{item}</span>
        ))}
      </div>
    </div>
  );
}

export default function HomeScreen({ state, setState, setTab, onOpenVoice, groups = [], activeGroupId, onGroupSwitch, onGroupAdd }: Props) {
  const score = calcReadiness(state);
  const { text: statusText, color: fillColor } = getReadinessStatus(score);
  const alerts = buildAlerts(state);
  const prompts = buildAssistantPrompts(state);
  const earnedBadges = state.badges.filter(b => b.earned);

  const toggleChore = (id: string) => {
    setState(prev => ({
      ...prev,
      chores: prev.chores.map(c => c.id === id ? { ...c, completed: !c.completed } : c),
    }));
  };

  return (
    <div className="screen-wrapper">
      {/* Groups row */}
      {groups.length > 0 && (
        <div style={{ overflowX: 'auto', paddingBottom: 4, marginBottom: 4 }}>
          <div style={{ display: 'flex', gap: 8, padding: '0 16px', width: 'max-content' }}>
            {groups.map(g => {
              const meta = GROUP_TYPE_META[g.group_type] ?? GROUP_TYPE_META.other;
              const isActive = g.id === activeGroupId;
              return (
                <button
                  key={g.id}
                  onClick={() => onGroupSwitch?.(g.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 20, border: '1.5px solid',
                    borderColor: isActive ? '#60a5fa' : 'rgba(255,255,255,0.12)',
                    background: isActive ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.05)',
                    color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.75)',
                    fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    whiteSpace: 'nowrap', transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 15 }}>{meta.icon}</span>
                  <span>{g.is_personal ? 'My Space' : g.name}</span>
                </button>
              );
            })}
            <button
              onClick={() => onGroupAdd?.()}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '8px 14px', borderRadius: 20,
                border: '1.5px dashed rgba(255,255,255,0.2)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              <span>+</span>
              <span>Add group</span>
            </button>
          </div>
        </div>
      )}

      {/* Readiness Score */}
      <div className="readiness-card fade-up">
        <div className="readiness-row">
          <div>
            <div className="readiness-label">Family Ready</div>
            <div className="readiness-score">
              {score}<span className="readiness-pct">%</span>
            </div>
            <div className="readiness-status">{statusText}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 40, marginBottom: 4 }}>
              {score >= 90 ? '🎉' : score >= 70 ? '💪' : score >= 40 ? '🔄' : '😅'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
              {state.events.length} events this weekend
            </div>
          </div>
        </div>
        <div className="readiness-bar">
          <div
            className="readiness-fill"
            style={{ width: `${score}%`, background: fillColor }}
          />
        </div>
        <div className="score-factors">
          {[
            { label: 'Transport', done: state.events.filter(e => e.transportAssigned).length, total: state.events.length },
            { label: 'Kit', done: state.kitItems.filter(k => k.completed).length, total: state.kitItems.length },
            { label: 'Chores', done: state.chores.filter(c => c.completed).length, total: state.chores.length },
          ].map(f => (
            <div key={f.label} className="score-factor">
              <span>{f.label} {f.done}/{f.total}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Talk & Go card */}
      <div className="talk-card fade-up">
        <div className="talk-card-text">
          <div className="talk-card-title">🎙 Talk &amp; Go</div>
          <div className="talk-card-sub">Say it once. HomeTeam sorts it.</div>
          <div className="talk-card-chips">
            {["Who needs a lift?", "What's missing?", "Urgent notices"].map(chip => (
              <span key={chip} className="talk-chip">{chip}</span>
            ))}
          </div>
        </div>
        <button className="talk-card-btn" onClick={() => onOpenVoice?.()}>
          🎙 Talk now
        </button>
      </div>

      {/* Smart Alerts */}
      {alerts.length > 0 ? (
        <div className="card fade-up">
          <div className="card-title">Needs attention</div>
          {alerts.map(alert => (
            <div key={alert.id} className="alert-item" onClick={() => setTab(alert.tab)}>
              <div
                className="alert-icon"
                style={{
                  background: alert.severity === 'red' ? 'var(--red-light)'
                    : alert.severity === 'orange' ? 'var(--orange-light)'
                    : 'var(--blue-light)',
                }}
              >
                {alert.icon}
              </div>
              <div className="alert-body">
                <div className="alert-text">{alert.text}</div>
                <div className="alert-sub">{alert.sub}</div>
              </div>
              <div className="alert-chevron">›</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card fade-up">
          <div className="card-title">Needs attention</div>
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <div className="empty-title">All good!</div>
            <div className="empty-sub">No urgent items right now.</div>
          </div>
        </div>
      )}

      {/* Weather Kit Card */}
      <WeatherKitCard weather={state.weather} />

      {/* Assistant Card */}
      {prompts.length > 0 && (
        <div className="assistant-card fade-up">
          <div className="assistant-header">
            <div className="assistant-icon">🤖</div>
            <div>
              <div className="assistant-title">HomeTeam Assistant</div>
              <div className="assistant-subtitle">Heads-up for the weekend</div>
            </div>
          </div>
          {prompts.map((p, i) => (
            <div key={i} className="assistant-prompt">
              <span className="assistant-prompt-icon">→</span>
              <span>{p}</span>
            </div>
          ))}
        </div>
      )}

      {/* Today's Events */}
      <div className="card fade-up">
        <div className="card-title">This weekend</div>
        {state.events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <div className="empty-title">Nothing on this weekend</div>
            <div className="empty-sub">Enjoy the rest!</div>
          </div>
        ) : (
          state.events.map(ev => {
            const member = state.familyMembers.find(m => m.id === ev.memberId);
            return (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span className={`sport-dot dot-${ev.sport}`} style={{ width: 10, height: 10, borderRadius: '50%', display: 'block', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{ev.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {member?.name} · {ev.date} {ev.time}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <span className={`pill pill-${ev.transportAssigned ? 'green' : 'red'}`} style={{ fontSize: 11, padding: '2px 7px' }}>
                    {ev.transportAssigned ? 'Sorted' : 'Needs a lift'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Family Wins / Badges */}
      {earnedBadges.length > 0 && (
        <div className="card fade-up">
          <div className="card-title">Family wins 🏅</div>
          <div className="wins-row">
            {earnedBadges.map(b => (
              <div key={b.id} className="win-pill">
                <span className="win-icon">{b.icon}</span>
                <div>
                  <div className="win-name">{b.name}</div>
                  {b.earnedBy && <div className="win-by">{b.earnedBy}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chores */}
      <div className="card fade-up">
        <div className="card-title">Chores</div>
        {state.chores.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏠</div>
            <div className="empty-title">House is in good shape</div>
            <div className="empty-sub">No chores outstanding.</div>
          </div>
        ) : (
          state.chores.map(chore => (
            <div key={chore.id} className="chore-row" onClick={() => toggleChore(chore.id)}>
              <div className="kit-checkbox" style={{ borderRadius: 6, width: 22, height: 22, border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, ...(chore.completed ? { background: 'var(--green)', borderColor: 'var(--green)', color: 'white' } : {}) }}>
                {chore.completed ? '✓' : ''}
              </div>
              <div className="chore-name" style={chore.completed ? { textDecoration: 'line-through', color: 'var(--text-muted)', flex: 1, fontSize: 14, fontWeight: 600 } : { flex: 1, fontSize: 14, fontWeight: 600 }}>
                {chore.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 8 }}>
                {chore.assignedName}
              </div>
              <span className="points-badge">{chore.points}pts</span>
            </div>
          ))
        )}
      </div>

      <div style={{ height: 8 }} />
    </div>
  );
}
