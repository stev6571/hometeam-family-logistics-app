import React from 'react';
import type { AppState, Driver, LiftRequest } from '../types';

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

function buildSuggestedPlan(liftRequests: LiftRequest[], drivers: Driver[]): string {
  const unassigned = liftRequests.filter(lr => !lr.assignedDriverId);
  if (unassigned.length === 0) return '';

  const plan: string[] = [];
  const driverLoad = drivers.map(d => ({ ...d, currentPassengers: [...d.passengers] }));

  unassigned.forEach(lr => {
    const available = driverLoad
      .filter(d => d.currentPassengers.length < d.seats)
      .sort((a, b) => a.currentPassengers.length - b.currentPassengers.length);
    if (available.length > 0) {
      available[0].currentPassengers.push(lr.childName);
    }
  });

  driverLoad.forEach(d => {
    const newOnes = d.currentPassengers.filter(p => !drivers.find(dr => dr.id === d.id)?.passengers.includes(p));
    if (newOnes.length > 0) {
      plan.push(`${d.name} takes ${newOnes.join(' + ')}`);
    }
  });

  return plan.join('. ');
}

function applySuggestedPlan(liftRequests: LiftRequest[], drivers: Driver[]): { newRequests: LiftRequest[]; newDrivers: Driver[] } {
  const unassigned = liftRequests.filter(lr => !lr.assignedDriverId);
  const newRequests = [...liftRequests];
  const newDrivers = drivers.map(d => ({ ...d, passengers: [...d.passengers] }));

  unassigned.forEach(lr => {
    const available = newDrivers
      .filter(d => d.passengers.length < d.seats)
      .sort((a, b) => a.passengers.length - b.passengers.length);
    if (available.length > 0) {
      available[0].passengers.push(lr.childId);
      const idx = newRequests.findIndex(r => r.id === lr.id);
      if (idx !== -1) {
        newRequests[idx] = { ...newRequests[idx], assignedDriverId: available[0].id };
      }
    }
  });

  return { newRequests, newDrivers };
}

export default function LiftsScreen({ state, setState }: Props) {
  const unassigned = state.liftRequests.filter(lr => !lr.assignedDriverId);
  const assigned = state.liftRequests.filter(lr => lr.assignedDriverId);
  const suggestedText = buildSuggestedPlan(state.liftRequests, state.drivers);

  const handleApplySuggested = () => {
    const { newRequests, newDrivers } = applySuggestedPlan(state.liftRequests, state.drivers);
    setState(prev => ({
      ...prev,
      liftRequests: newRequests,
      drivers: newDrivers,
      events: prev.events.map(e => {
        const req = newRequests.find(r => r.eventId === e.id);
        if (req && req.assignedDriverId) return { ...e, transportAssigned: true };
        return e;
      }),
    }));
  };

  const handleAssign = (requestId: string, driverId: string) => {
    setState(prev => {
      const req = prev.liftRequests.find(r => r.id === requestId);
      if (!req) return prev;

      const newRequests = prev.liftRequests.map(r =>
        r.id === requestId ? { ...r, assignedDriverId: driverId || null } : r
      );

      const newDrivers = prev.drivers.map(d => {
        let passengers = d.passengers.filter(p => p !== req.childId);
        if (driverId === d.id) passengers = [...passengers, req.childId];
        return { ...d, passengers };
      });

      const newEvents = prev.events.map(e => {
        const assigned = newRequests.filter(r => r.eventId === e.id && r.assignedDriverId);
        const total = newRequests.filter(r => r.eventId === e.id);
        if (total.length > 0 && assigned.length === total.length) return { ...e, transportAssigned: true };
        if (e.id === req.eventId && !driverId) return { ...e, transportAssigned: false };
        return e;
      });

      return { ...prev, liftRequests: newRequests, drivers: newDrivers, events: newEvents };
    });
  };

  const shareLiftsWhatsApp = () => {
    const lines = state.liftRequests.map(lr => {
      const driver = lr.assignedDriverId
        ? state.drivers.find(d => d.id === lr.assignedDriverId)?.name
        : 'Not sorted yet';
      return `• ${lr.childName} (${lr.eventTitle} ${lr.time}) → ${driver}`;
    });
    const msg = `🚗 Sorted — Lifts Plan:\n${lines.join('\n')}`;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  };

  const requestLiftWhatsApp = (lr: LiftRequest) => {
    const msg = `Hi! Can anyone give ${lr.childName} a lift to ${lr.eventTitle} at ${lr.time} (${lr.location})? 🙏`;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  };

  return (
    <div className="screen-wrapper">
      <div className="section-heading">Lifts</div>

      {/* Suggested Plan */}
      {unassigned.length > 0 && suggestedText && (
        <div style={{ margin: '0 16px 12px' }}>
          <div className="suggested-card">
            <div className="suggested-label">💡 Suggested plan</div>
            <div className="suggested-text">{suggestedText}.</div>
            <button className="btn btn-full" onClick={handleApplySuggested}
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1.5px solid rgba(255,255,255,0.4)' }}>
              Apply suggested plan
            </button>
          </div>
        </div>
      )}

      {/* Needs a Lift */}
      <div className="card">
        <div className="card-title">Needs a lift</div>
        {unassigned.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎉</div>
            <div className="empty-title">All lifts sorted — nice work</div>
            <div className="empty-sub">Every child has a confirmed ride.</div>
          </div>
        ) : (
          unassigned.map(lr => (
            <div key={lr.id} style={{ marginBottom: 10 }}>
              <div className="lift-row unassigned">
                <div className="lift-info">
                  <div className="lift-name">{lr.childName}</div>
                  <div className="lift-detail">{lr.eventTitle} · {lr.time} · {lr.location}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, padding: '4px 0 2px' }}>
                <select
                  style={{ flex: 1 }}
                  value=""
                  onChange={e => e.target.value && handleAssign(lr.id, e.target.value)}
                >
                  <option value="">Assign a driver…</option>
                  {state.drivers
                    .filter(d => d.passengers.length < d.seats)
                    .map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.seats - d.passengers.length} seat{d.seats - d.passengers.length !== 1 ? 's' : ''} free)
                      </option>
                    ))}
                </select>
                <button className="btn btn-whatsapp btn-sm" onClick={() => requestLiftWhatsApp(lr)}>
                  Ask in WhatsApp
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirmed Lifts */}
      {assigned.length > 0 && (
        <div className="card">
          <div className="card-title">Sorted ✓</div>
          {assigned.map(lr => {
            const driver = state.drivers.find(d => d.id === lr.assignedDriverId);
            return (
              <div key={lr.id} style={{ marginBottom: 8 }}>
                <div className="lift-row assigned">
                  <div className="lift-info">
                    <div className="lift-name">{lr.childName}</div>
                    <div className="lift-detail">{lr.eventTitle} · {lr.time}</div>
                  </div>
                  <span className="pill pill-green" style={{ fontSize: 12 }}>
                    🚗 {driver?.name}
                  </span>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: 4 }}
                  onClick={() => handleAssign(lr.id, '')}
                >
                  Change driver
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Drivers */}
      <div className="card">
        <div className="card-title">Drivers this weekend</div>
        {state.drivers.map(driver => {
          const passengerNames = driver.passengers.map(pid => {
            const m = state.familyMembers.find(fm => fm.id === pid);
            return m?.name || pid;
          });
          const seatsLeft = driver.seats - driver.passengers.length;
          return (
            <div key={driver.id} className="driver-card">
              <div className="driver-header">
                <div className="driver-name">🚗 {driver.name}</div>
                <div className="driver-seats">{seatsLeft} seat{seatsLeft !== 1 ? 's' : ''} free</div>
              </div>
              {passengerNames.length > 0 ? (
                <div className="passenger-chips">
                  {passengerNames.map(n => (
                    <span key={n} className="passenger-chip">{n}</span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No passengers yet</div>
              )}
            </div>
          );
        })}
      </div>

      {/* WhatsApp Share */}
      <div style={{ margin: '0 16px 16px' }}>
        <button className="btn btn-whatsapp btn-full" onClick={shareLiftsWhatsApp}>
          📤 Share lifts plan to WhatsApp
        </button>
      </div>
    </div>
  );
}
