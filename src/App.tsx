import { useState, useEffect } from 'react';
import './index.css';
import type { Tab, AppState } from './types';
import { initialState } from './mockData';
import HomeScreen from './screens/HomeScreen';
import LiftsScreen from './screens/LiftsScreen';
import KitScreen from './screens/KitScreen';
import NoticeboardScreen from './screens/NoticeboardScreen';
import WeekendScreen from './screens/WeekendScreen';
import VoiceAssistant from './components/VoiceAssistant';

const STORAGE_KEY = 'hometeam-state-v2';

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch {}
  return initialState;
}

function saveState(s: AppState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

const tabs: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'home',        label: 'Home',     icon: '🏠' },
  { id: 'lifts',       label: 'Lifts',    icon: '🚗' },
  { id: 'kit',         label: 'Kit',      icon: '⚽' },
  { id: 'noticeboard', label: 'Messages', icon: '📢' },
  { id: 'weekend',     label: 'Weekend',  icon: '🏆' },
];

const tabTitles: Record<Tab, string> = {
  home:        'Ready for the weekend?',
  lifts:       "Who's driving?",
  kit:         'Got everything?',
  noticeboard: 'Club updates',
  weekend:     'Weekend plan',
};

export default function App() {
  const [activeTab, setActiveTab]   = useState<Tab>('home');
  const [state, setState]           = useState<AppState>(loadState);
  const [voiceOpen, setVoiceOpen]   = useState(false);
  const [driveMode, setDriveMode]   = useState(false);

  useEffect(() => { saveState(state); }, [state]);

  const unreadNotices  = state.notices.filter(n => !n.read).length;
  const urgentKitCount = state.kitItems.filter(k => k.urgent && !k.completed).length;
  const unassignedLifts = state.liftRequests.filter(lr => !lr.assignedDriverId).length;

  const getBadge = (tab: Tab) => {
    if (tab === 'noticeboard') return unreadNotices;
    if (tab === 'kit')         return urgentKitCount;
    if (tab === 'lifts')       return unassignedLifts;
    return 0;
  };

  const screenProps = { state, setState, setTab: setActiveTab };

  const openVoice = () => setVoiceOpen(true);

  return (
    <div id="root" style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      {/* Header */}
      <div className="app-header">
        <div className="header-top">
          <div className="header-logo">Home<span>Team</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Drive Mode button */}
            <button
              onClick={() => { setDriveMode(true); setVoiceOpen(true); }}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: 'none',
                borderRadius: 8,
                padding: '5px 10px',
                fontSize: 12,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.8)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              🚘 Drive
            </button>
            <span style={{ fontSize: 18 }}>{tabs.find(t => t.id === activeTab)?.icon}</span>
          </div>
        </div>
        <div className="header-subtitle">{tabTitles[activeTab]}</div>
      </div>

      {/* Screen content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 'calc(var(--nav-height) + 8px)' }}>
        {activeTab === 'home'        && <HomeScreen {...screenProps} onOpenVoice={openVoice} />}
        {activeTab === 'lifts'       && <LiftsScreen state={state} setState={setState} />}
        {activeTab === 'kit'         && <KitScreen state={state} setState={setState} />}
        {activeTab === 'noticeboard' && <NoticeboardScreen state={state} setState={setState} />}
        {activeTab === 'weekend'     && <WeekendScreen state={state} setState={setState} />}
      </div>

      {/* Floating mic button */}
      <button
        className="fab-mic"
        onClick={openVoice}
        aria-label="Talk to HomeTeam"
      >
        🎙
      </button>

      {/* Bottom navigation */}
      <nav className="bottom-nav">
        {tabs.map(tab => {
          const count = getBadge(tab.id);
          return (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="nav-icon">{tab.icon}</span>
              <span className="nav-label">{tab.label}</span>
              {count > 0 && <span className="nav-badge">{count}</span>}
            </button>
          );
        })}
      </nav>

      {/* Voice assistant modal */}
      {voiceOpen && (
        <VoiceAssistant
          state={state}
          setState={setState}
          driveMode={driveMode}
          onClose={() => { setVoiceOpen(false); setDriveMode(false); }}
        />
      )}
    </div>
  );
}
