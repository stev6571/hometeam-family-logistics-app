import React from 'react';
import type { AppState } from '../types';

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const weatherConfig = {
  rain: { icon: '🌧️', items: ['Towel', 'Waterproof', 'Spare socks', 'Boot bag'], className: 'weather-rain' },
  cold: { icon: '🥶', items: ['Base layer', 'Gloves', 'Warm coat'], className: 'weather-cold' },
  sunny: { icon: '☀️', items: ['Water bottle', 'Sun cream', 'Cap'], className: 'weather-sunny' },
  mixed: { icon: '⛅', items: ['Waterproof', 'Water bottle', 'Layers'], className: 'weather-mixed' },
};

const sportColors: Record<string, string> = {
  rugby: 'var(--rugby)',
  football: 'var(--football)',
  swimming: 'var(--swimming)',
  tennis: 'var(--tennis)',
};

export default function WeekendScreen({ state, setState }: Props) {
  const saturdayEvents = state.events.filter(e => e.date === 'Saturday').sort((a, b) => a.time.localeCompare(b.time));
  const sundayEvents = state.events.filter(e => e.date === 'Sunday').sort((a, b) => a.time.localeCompare(b.time));

  const totalEvents = state.events.length;
  const readyEvents = state.events.filter(e => e.transportAssigned && e.kitChecked).length;
  const readinessPercent = totalEvents > 0 ? Math.round((readyEvents / totalEvents) * 100) : 0;

  const w = weatherConfig[state.weather.condition];

  const shareItinerary = () => {
    const lines = state.events.map(e => {
      const member = state.familyMembers.find(m => m.id === e.memberId);
      return `• ${e.date} ${e.time}: ${member?.name} - ${e.title} @ ${e.location}`;
    });
    const msg = `🏆 HomeTeam Weekend Itinerary:\n\n${lines.join('\n')}\n\nWeekend ready: ${readinessPercent}%`;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  };

  const toggleKitChecked = (eventId: string) => {
    setState(prev => ({
      ...prev,
      events: prev.events.map(e => e.id === eventId ? { ...e, kitChecked: !e.kitChecked } : e),
    }));
  };

  const EventBlock = ({ events, day }: { events: typeof saturdayEvents; day: string }) => {
    if (events.length === 0) return null;
    return (
      <>
        <div style={{ padding: '12px 16px 6px', fontSize: 14, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {day}
        </div>
        {events.map(ev => {
          const member = state.familyMembers.find(m => m.id === ev.memberId);
          const liftReq = state.liftRequests.find(lr => lr.eventId === ev.id);
          const driver = liftReq?.assignedDriverId
            ? state.drivers.find(d => d.id === liftReq.assignedDriverId)
            : null;

          return (
            <div key={ev.id} className="weekend-event">
              <div className="weekend-time-col">
                <div className="weekend-time">{ev.time}</div>
                <div className="weekend-day">{ev.date}</div>
              </div>
              <div className="weekend-detail">
                <div className="weekend-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span
                    style={{
                      display: 'inline-block', width: 9, height: 9, borderRadius: '50%',
                      background: sportColors[ev.sport] || '#999', flexShrink: 0,
                    }}
                  />
                  {ev.title}
                </div>
                <div className="weekend-meta">{member?.name} · {ev.location}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <span className={`pill pill-${ev.kitChecked ? 'green' : 'orange'}`} style={{ fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}
                    onClick={() => toggleKitChecked(ev.id)}>
                    {ev.kitChecked ? '✓ Kit sorted' : 'Kit needed'}
                  </span>
                  <span className={`pill pill-${ev.transportAssigned ? 'green' : 'red'}`} style={{ fontSize: 11, padding: '2px 8px' }}>
                    {ev.transportAssigned
                      ? `🚗 ${driver?.name || 'Sorted'}`
                      : 'Needs a lift'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div className="screen-wrapper">
      <div className="section-heading">Weekend Ready</div>

      {/* Readiness Bar */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 22 }}>{readinessPercent}%</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {readyEvents} of {totalEvents} events fully sorted
            </div>
          </div>
          <span className={`pill pill-${readinessPercent >= 70 ? 'green' : readinessPercent >= 40 ? 'orange' : 'red'}`}>
            {readinessPercent >= 90 ? 'HomeTeam ready 🎉' : readinessPercent >= 70 ? 'Nearly ready' : readinessPercent >= 40 ? 'Getting there' : 'Needs work'}
          </span>
        </div>
        <div className="readiness-bar">
          <div
            className="readiness-fill"
            style={{
              width: `${readinessPercent}%`,
              background: readinessPercent >= 70 ? 'var(--green)' : readinessPercent >= 40 ? 'var(--yellow)' : 'var(--red)',
            }}
          />
        </div>
      </div>

      {/* Weather */}
      <div className={`weather-card ${w.className}`}>
        <div className="weather-header">
          <span className="weather-icon">{w.icon}</span>
          <div>
            <div className="weather-desc">{state.weather.description}</div>
            <div className="weather-temp">{state.weather.temp}°C · Bring extra kit</div>
          </div>
        </div>
        <div className="weather-pills">
          {w.items.map(item => <span key={item} className="weather-pill">{item}</span>)}
        </div>
      </div>

      {/* Events */}
      {saturdayEvents.length === 0 && sundayEvents.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <div className="empty-title">No events this weekend</div>
            <div className="empty-sub">Enjoy the break!</div>
          </div>
        </div>
      ) : (
        <>
          <EventBlock events={saturdayEvents} day="Saturday" />
          <EventBlock events={sundayEvents} day="Sunday" />
        </>
      )}

      {/* All Badges */}
      <div className="card" style={{ marginTop: 4 }}>
        <div className="card-title">Family wins</div>
        <div className="badge-grid">
          {state.badges.map(b => (
            <div key={b.id} className={`badge-item ${b.earned ? 'earned' : ''}`}>
              <span className="badge-icon">{b.icon}</span>
              <div className="badge-name">{b.name}</div>
              {b.earned && b.earnedBy && (
                <div style={{ fontSize: 10, color: '#b45309' }}>{b.earnedBy}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* WhatsApp Share */}
      <div style={{ margin: '0 16px 16px' }}>
        <button className="btn btn-whatsapp btn-full" onClick={shareItinerary}>
          📤 Share weekend itinerary to WhatsApp
        </button>
      </div>
    </div>
  );
}
