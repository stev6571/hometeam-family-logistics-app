import { useState, useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import './index.css';
import type { Tab, AppState } from './types';
import { initialState } from './mockData';
import { supabase, supabaseMisconfigured } from './lib/supabase';
import { getGroupsForUser, getJoinCode, loadUserState, saveUserState, createPersonalGroup } from './lib/db';
import type { Group } from './lib/db';
import AuthScreen from './components/AuthScreen';
import GroupModal from './components/GroupModal';
import HomeScreen from './screens/HomeScreen';
import LiftsScreen from './screens/LiftsScreen';
import KitScreen from './screens/KitScreen';
import NoticeboardScreen from './screens/NoticeboardScreen';
import WeekendScreen from './screens/WeekendScreen';
import VoiceAssistant from './components/VoiceAssistant';

// ─── Types ────────────────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Loading screen ───────────────────────────────────────────────────────────

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="loading-screen">
      <img src="/logo.svg" alt="HomeTeam" width="56" height="56" style={{ marginBottom: 4 }} />
      <div className="loading-logo">Home<span>Team</span></div>
      <div className="loading-spinner" />
      <div className="loading-sub">{message}</div>
    </div>
  );
}

// ─── User menu ────────────────────────────────────────────────────────────────

function UserMenu({ email, joinCode, onSignOut }: { email: string; joinCode: string; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(joinCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const initial = email.charAt(0).toUpperCase();

  return (
    <div className="user-menu" ref={ref}>
      <button className="user-avatar-btn" onClick={() => setOpen(o => !o)}>
        {initial}
      </button>
      {open && (
        <div className="user-dropdown">
          <div className="user-dropdown-email">{email}</div>
          {joinCode && joinCode !== '------' && (
            <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Group join code</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, letterSpacing: 4, color: '#60a5fa' }}>
                  {joinCode}
                </span>
                <button
                  onClick={handleCopy}
                  style={{ background: 'rgba(96,165,250,0.15)', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, color: '#60a5fa', cursor: 'pointer', fontWeight: 600 }}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4 }}>Share to invite someone to this group</div>
            </div>
          )}
          <button
            className="user-dropdown-item danger"
            onClick={() => { setOpen(false); onSignOut(); }}
          >
            🚪 Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [session, setSession]           = useState<Session | null>(null);
  const [authLoading, setAuthLoading]   = useState(true);
  const [groups, setGroups]             = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [dataLoading, setDataLoading]   = useState(false);
  const [joinCode, setJoinCode]         = useState('------');
  const [showGroupModal, setShowGroupModal] = useState(false);

  const [activeTab, setActiveTab]   = useState<Tab>('home');
  const [state, setState]           = useState<AppState>(initialState);
  const [voiceOpen, setVoiceOpen]   = useState(false);
  const [driveMode, setDriveMode]   = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // ── Auth state listener ────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    }).catch(() => {
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setGroups([]);
        setActiveGroupId(null);
        setJoinCode('------');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Load all groups when session starts ───────────────────────────────────
  useEffect(() => {
    if (!session) return;

    setGroupsLoading(true);
    getGroupsForUser(session.user.id).then(async loaded => {
      if (loaded.length === 0) {
        // First sign-in — auto-create personal space
        const id = await createPersonalGroup(session.user.id);
        const refreshed = await getGroupsForUser(session.user.id);
        setGroups(refreshed);
        setActiveGroupId(id);
      } else {
        setGroups(loaded);
        // Restore last active group from localStorage, fall back to first
        const saved = localStorage.getItem('ht-active-group');
        const match = loaded.find(g => g.id === saved);
        setActiveGroupId(match ? match.id : loaded[0].id);
      }
    }).finally(() => setGroupsLoading(false));
  }, [session]);

  // ── Load app state when active group changes ──────────────────────────────
  useEffect(() => {
    if (!activeGroupId) return;

    localStorage.setItem('ht-active-group', activeGroupId);
    setDataLoading(true);
    Promise.all([
      loadUserState(activeGroupId),
      getJoinCode(activeGroupId),
    ]).then(([appState, code]) => {
      setState(appState);
      setJoinCode(code);
    }).finally(() => setDataLoading(false));
  }, [activeGroupId]);

  // ── Debounced save whenever state changes ─────────────────────────────────
  useEffect(() => {
    if (!activeGroupId || dataLoading) return;

    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        await saveUserState(activeGroupId, state);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sign out ──────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setState(initialState);
    setActiveTab('home');
    setVoiceOpen(false);
  };

  // ── Group added ───────────────────────────────────────────────────────────
  const handleGroupAdded = async (newGroupId: string) => {
    setShowGroupModal(false);
    if (!session) return;
    const refreshed = await getGroupsForUser(session.user.id);
    setGroups(refreshed);
    setActiveGroupId(newGroupId);
  };

  // ── Derived badge counts ──────────────────────────────────────────────────
  const unreadNotices   = state.notices.filter(n => !n.read).length;
  const urgentKitCount  = state.kitItems.filter(k => k.urgent && !k.completed).length;
  const unassignedLifts = state.liftRequests.filter(lr => !lr.assignedDriverId).length;

  const getBadge = (tab: Tab) => {
    if (tab === 'noticeboard') return unreadNotices;
    if (tab === 'kit')         return urgentKitCount;
    if (tab === 'lifts')       return unassignedLifts;
    return 0;
  };

  // ── Render gates ──────────────────────────────────────────────────────────
  if (supabaseMisconfigured) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', padding: 32, fontFamily: 'sans-serif', textAlign: 'center', background: '#1a2744', color: 'white', gap: 16 }}>
      <img src="/logo.svg" width="56" height="56" alt="" />
      <div style={{ fontSize: 20, fontWeight: 700 }}>Supabase not configured</div>
      <div style={{ fontSize: 14, opacity: 0.7, maxWidth: 320 }}>
        Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your Vercel environment variables, then redeploy.
      </div>
    </div>
  );
  if (authLoading || groupsLoading) return <LoadingScreen message="Starting up…" />;
  if (!session) return <AuthScreen />;
  if (dataLoading) return <LoadingScreen message="Loading…" />;

  const screenProps = { state, setState, setTab: setActiveTab };
  const activeGroup = groups.find(g => g.id === activeGroupId) ?? null;

  return (
    <div id="root" style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      {/* ── Header ── */}
      <div className="app-header">
        <div className="header-top">
          <div className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/logo.svg" alt="" width="28" height="28" style={{ flexShrink: 0 }} />
            Home<span>Team</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              className={`save-dot ${saveStatus === 'saving' ? 'saving' : saveStatus === 'saved' ? 'saved' : saveStatus === 'error' ? 'error' : ''}`}
              title={saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Save failed' : ''}
            />
            <button
              onClick={() => { setDriveMode(true); setVoiceOpen(true); }}
              style={{
                background: 'rgba(255,255,255,0.12)', border: 'none',
                borderRadius: 8, padding: '5px 10px', fontSize: 12,
                fontWeight: 700, color: 'rgba(255,255,255,0.8)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              🚘 Drive
            </button>
            <button
              onClick={() => setShowGroupModal(true)}
              style={{
                background: 'rgba(255,255,255,0.12)', border: 'none',
                borderRadius: 8, padding: '5px 10px', fontSize: 12,
                fontWeight: 700, color: 'rgba(255,255,255,0.8)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              👥 Groups
            </button>
            <UserMenu
              email={session.user.email ?? '?'}
              joinCode={activeGroup?.is_personal ? '' : joinCode}
              onSignOut={handleSignOut}
            />
          </div>
        </div>
        <div className="header-subtitle">{tabTitles[activeTab]}</div>
      </div>

      {/* ── Screen content ── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 'calc(var(--nav-height) + 8px)' }}>
        {activeTab === 'home' && (
          <HomeScreen
            {...screenProps}
            onOpenVoice={() => setVoiceOpen(true)}
            groups={groups}
            activeGroupId={activeGroupId}
            onGroupSwitch={id => setActiveGroupId(id)}
            onGroupAdd={() => setShowGroupModal(true)}
          />
        )}
        {activeTab === 'lifts'       && <LiftsScreen state={state} setState={setState} />}
        {activeTab === 'kit'         && <KitScreen state={state} setState={setState} />}
        {activeTab === 'noticeboard' && <NoticeboardScreen state={state} setState={setState} />}
        {activeTab === 'weekend'     && <WeekendScreen state={state} setState={setState} />}
      </div>

      {/* ── Floating mic ── */}
      <button className="fab-mic" onClick={() => setVoiceOpen(true)} aria-label="Talk to HomeTeam">
        🎙
      </button>

      {/* ── Bottom nav ── */}
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

      {/* ── Voice assistant ── */}
      {voiceOpen && (
        <VoiceAssistant
          state={state}
          setState={setState}
          driveMode={driveMode}
          onClose={() => { setVoiceOpen(false); setDriveMode(false); }}
        />
      )}

      {/* ── Group modal ── */}
      {showGroupModal && session && (
        <GroupModal
          userId={session.user.id}
          onComplete={handleGroupAdded}
          onClose={() => setShowGroupModal(false)}
        />
      )}
    </div>
  );
}
