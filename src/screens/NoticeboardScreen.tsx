import React from 'react';
import type { AppState, Notice } from '../types';

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const catColors: Record<string, string> = {
  match: 'var(--orange)',
  training: 'var(--green)',
  admin: 'var(--blue)',
  social: 'var(--purple)',
};

const catLabels: Record<string, string> = {
  match: '🏆 Match',
  training: '⚽ Training',
  admin: '📋 Admin',
  social: '🎉 Social',
};

export default function NoticeboardScreen({ state, setState }: Props) {
  const markRead = (id: string) => {
    setState(prev => ({
      ...prev,
      notices: prev.notices.map(n => n.id === id ? { ...n, read: true } : n),
    }));
  };

  const shareNotice = (notice: Notice) => {
    const msg = `📌 Notice from ${notice.from}:\n\n"${notice.title}"\n\n${notice.body}`;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  };

  const unreadCount = state.notices.filter(n => !n.read).length;

  return (
    <div className="screen-wrapper">
      <div className="section-heading">
        Noticeboard
        {unreadCount > 0 && (
          <span className="pill pill-red" style={{ fontSize: 12, marginLeft: 10, verticalAlign: 'middle' }}>
            {unreadCount} unread
          </span>
        )}
      </div>

      {state.notices.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <div className="empty-title">No new messages</div>
            <div className="empty-sub">All quiet from the clubs and coaches.</div>
          </div>
        </div>
      ) : (
        state.notices.map(notice => (
          <div
            key={notice.id}
            className={`notice-card cat-${notice.category}`}
            onClick={() => markRead(notice.id)}
          >
            <div className="notice-meta">
              {!notice.read && <span className="unread-dot" />}
              <span className="notice-from">{notice.from}</span>
              <span className="notice-time">· {notice.timestamp}</span>
              <span className="pill" style={{
                fontSize: 11, padding: '1px 7px', marginLeft: 'auto',
                background: `${catColors[notice.category]}18`,
                color: catColors[notice.category],
              }}>
                {catLabels[notice.category]}
              </span>
              {notice.urgent && (
                <span className="pill pill-red" style={{ fontSize: 11, padding: '1px 7px' }}>Urgent</span>
              )}
            </div>
            <div className="notice-title">{notice.title}</div>
            <div className="notice-body">{notice.body}</div>
            <div className="notice-footer">
              {!notice.read && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={e => { e.stopPropagation(); markRead(notice.id); }}
                >
                  Mark as read
                </button>
              )}
              <button
                className="btn btn-whatsapp btn-sm"
                onClick={e => { e.stopPropagation(); shareNotice(notice); }}
              >
                📤 Share to WhatsApp
              </button>
            </div>
          </div>
        ))
      )}

      <div style={{ height: 16 }} />
    </div>
  );
}
