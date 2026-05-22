import { useState, useRef, useEffect, useCallback } from 'react';
import type { AppState } from '../types';
import { parseVoiceCommand, generateWhatsAppMessage, WEATHER_ITEMS } from '../voice/commandParser';
import type { CommandIntent } from '../voice/commandParser';

// ─── Types ───────────────────────────────────────────────────────────────────

type AssistantStatus =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'confirming'
  | 'completed'
  | 'error';

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onClose: () => void;
  driveMode?: boolean;
}

// ─── Example prompts ─────────────────────────────────────────────────────────

const EXAMPLES = [
  "Jack's rugby is Saturday at 9:30 and he still hasn't got a lift — can someone sort it?",
  "What's still not sorted for this weekend?",
  "Liam's football kit still needs washing",
  "Message the rugby parents — Jack needs a lift to Manor Fields by 9",
  "Read the urgent club notice",
  "Mark Jack's gum shield as packed",
  "Who can take Alfie to football training Saturday at 10?",
  "What time does Noah swim on Sunday?",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSpeechRecognition(): SpeechRecognition | null {
  const SR = (typeof window !== 'undefined' && (window.SpeechRecognition ?? window.webkitSpeechRecognition)) as (new () => SpeechRecognition) | undefined;
  return SR ? new SR() : null;
}

const isSpeechSupported = typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

// ─── Action executor ──────────────────────────────────────────────────────────

function executeIntent(intent: CommandIntent, setState: Props['setState']): string {
  switch (intent.type) {
    case 'ADD_KIT': {
      if (!intent.childName || !intent.itemName) return "Not sure who to add that for.";
      const newItem = {
        id: `kit-voice-${Date.now()}`,
        name: intent.itemName,
        memberId: intent.childId ?? intent.childName.toLowerCase(),
        memberName: intent.childName,
        sport: intent.sport ?? 'general',
        urgent: intent.urgent ?? false,
        completed: false,
        category: 'accessories' as const,
      };
      setState(prev => ({ ...prev, kitItems: [...prev.kitItems, newItem] }));
      return `Done — ${intent.itemName} added to ${intent.childName}'s kit.${intent.urgent ? ' Marked urgent.' : ''} ✅`;
    }

    case 'COMPLETE_KIT': {
      if (!intent.childName || !intent.itemName) return "Couldn't find that kit item.";
      let found = false;
      setState(prev => {
        const lower = intent.itemName!.toLowerCase();
        const newItems = prev.kitItems.map(k => {
          if (k.memberName === intent.childName && k.name.toLowerCase().includes(lower) && !k.completed) {
            found = true;
            return { ...k, completed: true };
          }
          return k;
        });
        const allDone = newItems.every(k => k.completed);
        const newBadges = prev.badges.map(b => b.id === 'b1' ? { ...b, earned: allDone } : b);
        return { ...prev, kitItems: newItems, badges: newBadges };
      });
      return found || true ? `Done — ${intent.childName}'s ${intent.itemName.toLowerCase()} marked as sorted. ✅` : `Couldn't find that item for ${intent.childName}.`;
    }

    case 'REQUEST_LIFT': {
      if (!intent.childName) return "Who needs the lift?";
      setState(prev => ({
        ...prev,
        events: prev.events.map(e =>
          e.memberId === intent.childId ? { ...e, transportAssigned: false } : e
        ),
      }));
      return `${intent.childName} added to the lifts list. Check the Lifts tab to assign a driver. 🚗`;
    }

    case 'ASSIGN_DRIVER': {
      if (!intent.driverId || !intent.childId) return "I need both a driver and a child to assign.";
      setState(prev => {
        const newRequests = prev.liftRequests.map(lr =>
          lr.childId === intent.childId ? { ...lr, assignedDriverId: intent.driverId! } : lr
        );
        const newDrivers = prev.drivers.map(d => {
          if (d.id !== intent.driverId) return d;
          if (d.passengers.includes(intent.childId!)) return d;
          return { ...d, passengers: [...d.passengers, intent.childId!] };
        });
        const newEvents = prev.events.map(e =>
          e.memberId === intent.childId ? { ...e, transportAssigned: true } : e
        );
        const badge = newDrivers.find(d => d.id === intent.driverId);
        const newBadges = prev.badges.map(b =>
          b.id === 'b2' ? { ...b, earned: true, earnedBy: badge?.name } : b
        );
        return { ...prev, liftRequests: newRequests, drivers: newDrivers, events: newEvents, badges: newBadges };
      });
      return `${intent.driverName} assigned to drive ${intent.childName ?? 'this weekend'}. Weekend plan updated. 🚗✅`;
    }

    case 'ADD_WEATHER_KIT': {
      setState(prev => {
        const childId = intent.childId;
        const childName = intent.childName ?? 'Jack';
        const memberId = childId ?? 'jack';
        const existing = new Set(prev.kitItems.map(k => `${k.memberId}-${k.name.toLowerCase()}`));
        const newItems = WEATHER_ITEMS
          .filter(w => !existing.has(`${memberId}-${w.name.toLowerCase()}`))
          .map(w => ({
            id: `weather-${Date.now()}-${w.name}`,
            name: w.name,
            memberId,
            memberName: childName,
            sport: 'general',
            urgent: w.urgent,
            completed: false,
            category: w.category,
          }));
        return { ...prev, kitItems: [...prev.kitItems, ...newItems] };
      });
      return `Rain kit added — towel, waterproof jacket, spare socks and boot bag. Good thinking! ☂️✅`;
    }

    case 'ADD_CHORE': {
      if (!intent.itemName) return "What should I add?";
      const newChore = {
        id: `chore-voice-${Date.now()}`,
        title: intent.itemName,
        assignedTo: intent.childId ?? 'family',
        assignedName: intent.childName ?? 'Family',
        points: 10,
        completed: false,
        dueDate: 'Saturday',
      };
      setState(prev => ({ ...prev, chores: [...prev.chores, newChore] }));
      return `"${intent.itemName}" added to the chores list. ✅`;
    }

    case 'COMPLETE_CHORE': {
      if (!intent.itemName) return "Which chore?";
      const lower = intent.itemName.toLowerCase();
      setState(prev => ({
        ...prev,
        chores: prev.chores.map(c =>
          c.title.toLowerCase().includes(lower) ? { ...c, completed: true } : c
        ),
      }));
      return `"${intent.itemName}" marked as done. ✅`;
    }

    case 'DRAFT_MESSAGE': {
      // WhatsApp open handled in the confirm handler
      return 'Message shared to WhatsApp. 📤';
    }

    default:
      return intent.reply;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VoiceAssistant({ state, setState, onClose, driveMode = false }: Props) {
  const [status, setStatus]     = useState<AssistantStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim]   = useState('');
  const [intent, setIntent]     = useState<CommandIntent | null>(null);
  const [result, setResult]     = useState('');
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(!isSpeechSupported);

  const srRef = useRef<SpeechRecognition | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Clean up speech on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      srRef.current?.abort();
    };
  }, []);

  // ── Start listening ────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!isSpeechSupported) { setShowTextInput(true); return; }

    const sr = getSpeechRecognition();
    if (!sr) return;

    srRef.current = sr;
    sr.continuous = false;
    sr.interimResults = true;
    sr.lang = 'en-GB';

    sr.onstart = () => setStatus('listening');

    sr.onresult = (e: SpeechRecognitionEvent) => {
      let final = '';
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const alt = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += alt;
        else interimText += alt;
      }
      if (interimText) setInterim(interimText);
      if (final) {
        setTranscript(final.trim());
        setInterim('');
        handleTranscript(final.trim());
      }
    };

    sr.onerror = () => {
      setStatus('error');
      setResult("Microphone not available. Type your command instead.");
      setShowTextInput(true);
    };

    sr.onend = () => {
      if (status === 'listening') setStatus('idle');
    };

    try {
      sr.start();
    } catch {
      setStatus('error');
      setShowTextInput(true);
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Process transcript ─────────────────────────────────────────────────────
  const handleTranscript = useCallback((text: string) => {
    setStatus('processing');
    // Small delay so "Working that out…" flashes visibly
    setTimeout(() => {
      const parsed = parseVoiceCommand(text, state);
      setIntent(parsed);
      if (parsed.confirmationRequired) {
        setStatus('confirming');
      } else {
        // Read-only answers — show immediately
        setResult(parsed.reply);
        setStatus('completed');
      }
    }, 500);
  }, [state]);

  // ── Submit text input ──────────────────────────────────────────────────────
  const handleTextSubmit = () => {
    const text = textInput.trim();
    if (!text) return;
    setTranscript(text);
    setTextInput('');
    handleTranscript(text);
  };

  // ── Confirm action ─────────────────────────────────────────────────────────
  const handleConfirm = () => {
    if (!intent) return;

    if (intent.type === 'DRAFT_MESSAGE') {
      const msg = generateWhatsAppMessage(intent, state);
      window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
      setResult('Message opened in WhatsApp. 📤');
    } else {
      const msg = executeIntent(intent, setState);
      setResult(msg);
    }
    setStatus('completed');
  };

  // ── Cancel ─────────────────────────────────────────────────────────────────
  const handleCancel = () => {
    setStatus('idle');
    setTranscript('');
    setIntent(null);
    setInterim('');
  };

  // ── Reset for another command ──────────────────────────────────────────────
  const handleAnother = () => {
    setStatus('idle');
    setTranscript('');
    setIntent(null);
    setResult('');
    setInterim('');
  };

  // ── Use example ───────────────────────────────────────────────────────────
  const useExample = (ex: string) => {
    setTranscript(ex);
    handleTranscript(ex);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (driveMode) {
    return <DriveLayout
      status={status} transcript={transcript} interim={interim}
      intent={intent} result={result}
      onStart={startListening} onConfirm={handleConfirm}
      onCancel={handleCancel} onAnother={handleAnother} onClose={onClose}
    />;
  }

  return (
    <div className="va-backdrop" onClick={onClose}>
      <div className="va-sheet" onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div className="va-handle" />

        {/* Header */}
        <div className="va-header">
          <div className="va-header-left">
            <div className="va-header-icon">🎙️</div>
            <div>
              <div className="va-title">Talk to HomeTeam</div>
              <div className="va-subtitle">
                {status === 'idle'       ? 'Say what you need sorted' :
                 status === 'listening'  ? 'Listening…'               :
                 status === 'processing' ? 'Working that out…'        :
                 status === 'confirming' ? 'Just checking before I change it' :
                 status === 'completed'  ? 'Done!'                    :
                                          'Try again?'}
              </div>
            </div>
          </div>
          <button className="va-close" onClick={onClose}>✕</button>
        </div>

        {/* Main content */}
        <div className="va-body">

          {/* IDLE — show mic + examples */}
          {status === 'idle' && (
            <>
              <button className="va-mic-btn" onClick={startListening}>
                <span className="va-mic-icon">🎙</span>
              </button>
              <div className="va-or">or try an example</div>
              <div className="va-examples">
                {EXAMPLES.map(ex => (
                  <button key={ex} className="va-example-chip" onClick={() => useExample(ex)}>
                    {ex}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* LISTENING */}
          {status === 'listening' && (
            <div className="va-listening-state">
              <div className="va-pulse-ring" />
              <div className="va-mic-listening">🎙</div>
              <div className="va-listening-label">Listening…</div>
              {interim && <div className="va-interim">"{interim}"</div>}
            </div>
          )}

          {/* PROCESSING */}
          {status === 'processing' && (
            <div className="va-listening-state">
              <div className="va-processing-dots">
                <span /><span /><span />
              </div>
              <div className="va-listening-label">Working that out…</div>
              {transcript && <div className="va-transcript-bubble">"{transcript}"</div>}
            </div>
          )}

          {/* CONFIRMING */}
          {status === 'confirming' && intent && (
            <div className="va-confirm-state">
              {transcript && (
                <div className="va-transcript-bubble">"{transcript}"</div>
              )}
              <div className="va-reply-card">
                <div className="va-reply-icon">
                  {intent.type === 'ADD_KIT'       ? '⚽' :
                   intent.type === 'COMPLETE_KIT'  ? '✅' :
                   intent.type === 'REQUEST_LIFT'  ? '🚗' :
                   intent.type === 'ASSIGN_DRIVER' ? '🚗' :
                   intent.type === 'DRAFT_MESSAGE' ? '📱' :
                   intent.type === 'ADD_WEATHER_KIT' ? '☂️' :
                   intent.type === 'ADD_CHORE'     ? '📋' :
                   intent.type === 'COMPLETE_CHORE'? '✅' : '💬'}
                </div>
                <div className="va-reply-text">{intent.reply}</div>
              </div>
              <div className="va-confirm-btns">
                <button className="btn btn-success va-confirm-btn" onClick={handleConfirm}>
                  Confirm ✓
                </button>
                <button className="btn btn-ghost va-confirm-btn" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* COMPLETED */}
          {status === 'completed' && (
            <div className="va-done-state">
              <div className="va-done-icon">✅</div>
              <div className="va-done-text">{result || intent?.reply}</div>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleAnother}>
                Say something else
              </button>
            </div>
          )}

          {/* ERROR */}
          {status === 'error' && (
            <div className="va-done-state">
              <div className="va-done-icon" style={{ filter: 'none' }}>😕</div>
              <div className="va-done-text">{result || "I didn't catch that. Try typing instead."}</div>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleAnother}>
                Try again
              </button>
            </div>
          )}

          {/* Text input fallback — always available at bottom */}
          {(status === 'idle' || status === 'error' || showTextInput) && (
            <div className="va-text-input-row">
              {!showTextInput && (
                <button className="va-type-toggle" onClick={() => { setShowTextInput(true); inputRef.current?.focus(); }}>
                  ✍️ Type instead
                </button>
              )}
              {showTextInput && (
                <>
                  <input
                    ref={inputRef}
                    className="va-text-input"
                    placeholder='e.g. "Jack still needs a lift Saturday at 9"'
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
                    autoFocus
                  />
                  <button className="btn btn-primary btn-sm" onClick={handleTextSubmit}>→</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Drive mode inner layout ──────────────────────────────────────────────────

function DriveLayout({
  status, transcript, interim, intent, result,
  onStart, onConfirm, onCancel, onAnother, onClose,
}: {
  status: AssistantStatus; transcript: string; interim: string;
  intent: CommandIntent | null; result: string;
  onStart: () => void; onConfirm: () => void; onCancel: () => void;
  onAnother: () => void; onClose: () => void;
}) {
  return (
    <div className="dm-overlay">
      <div className="dm-header">
        <span className="dm-title">🚘 Drive Mode</span>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 10,
            padding: '7px 14px',
            color: 'white',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          ✕ Exit
        </button>
      </div>

      <div className="dm-body">
        {status === 'idle' && (
          <>
            <div className="dm-hint">Tap the mic and speak</div>
            <button className="dm-mic-btn" onClick={onStart}>
              <span style={{ fontSize: 52 }}>🎙</span>
            </button>
            <div className="dm-examples">
              {["What's still not sorted?", "Who needs a lift tomorrow?", "Read the urgent notice", "Jack's lift — sort it"].map(ex => (
                <div key={ex} className="dm-example">{ex}</div>
              ))}
            </div>
          </>
        )}

        {status === 'listening' && (
          <>
            <div className="dm-listening-label">Listening…</div>
            <div className="dm-pulse-ring" />
            <div className="dm-mic-active">🎙</div>
            {interim && <div className="dm-interim">"{interim}"</div>}
          </>
        )}

        {status === 'processing' && (
          <div className="dm-listening-label">Working that out…</div>
        )}

        {status === 'confirming' && intent && (
          <>
            {transcript && <div className="dm-transcript">"{transcript}"</div>}
            <div className="dm-reply">{intent.reply}</div>
            <div className="dm-confirm-row">
              <button className="dm-confirm-btn confirm" onClick={onConfirm}>Confirm ✓</button>
              <button className="dm-confirm-btn cancel" onClick={onCancel}>Cancel</button>
            </div>
          </>
        )}

        {status === 'completed' && (
          <>
            <div className="dm-done-icon">✅</div>
            <div className="dm-reply">{result || intent?.reply}</div>
            <button className="dm-confirm-btn confirm" style={{ marginTop: 24 }} onClick={onAnother}>
              Say something else
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="dm-reply">Didn't catch that — try again.</div>
            <button className="dm-confirm-btn confirm" style={{ marginTop: 24 }} onClick={onAnother}>
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
