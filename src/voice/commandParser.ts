import type { AppState, Event as AppEvent } from '../types';

// ─── Intent types ────────────────────────────────────────────────────────────

export type IntentType =
  | 'ADD_KIT'
  | 'COMPLETE_KIT'
  | 'REQUEST_LIFT'
  | 'ASSIGN_DRIVER'
  | 'DRAFT_MESSAGE'
  | 'READ_NOTICES'
  | 'WEEKEND_SUMMARY'
  | 'ADD_WEATHER_KIT'
  | 'ADD_CHORE'
  | 'COMPLETE_CHORE'
  | 'QUERY'
  | 'UNKNOWN';

export interface CommandIntent {
  type: IntentType;
  childName?: string;
  childId?: string;
  eventId?: string;
  sport?: string;
  itemName?: string;
  driverName?: string;
  driverId?: string;
  messageText?: string;
  urgent?: boolean;
  confirmationRequired: boolean;
  confidence: number;
  rawTranscript: string;
  reply: string;
  queryAnswer?: string;
}

// ─── Entity dictionaries ──────────────────────────────────────────────────────

const CHILDREN_MAP: Record<string, { name: string; id: string }> = {
  jack:  { name: 'Jack',  id: 'jack'  },
  alfie: { name: 'Alfie', id: 'alfie' },
  liam:  { name: 'Liam',  id: 'liam'  },
  noah:  { name: 'Noah',  id: 'noah'  },
  ethan: { name: 'Ethan', id: 'ethan' },
};

const DRIVERS_MAP: Record<string, { name: string; id: string }> = {
  'grandad mike': { name: 'Grandad Mike', id: 'd3' },
  'grandad':      { name: 'Grandad Mike', id: 'd3' },
  'mike':         { name: 'Grandad Mike', id: 'd3' },
  'steven':       { name: 'Steven',       id: 'd1' },
  'sarah':        { name: 'Sarah',        id: 'd2' },
};

const SPORTS = ['rugby', 'football', 'swimming', 'tennis'];

const URGENT_KIT = [
  'gum shield', 'mouthguard', 'shin pads', 'shinpads', 'helmet',
  'inhaler', 'medication', 'medicine',
];

// Boots are urgent only if sport-critical — we mark them urgent by default
const URGENT_KIT_WITH_BOOTS = [...URGENT_KIT, 'boots', 'football boots', 'rugby boots'];

const KIT_ITEMS = [
  ...URGENT_KIT_WITH_BOOTS,
  'water bottle', 'towel', 'waterproof', 'waterproof jacket', 'jacket',
  'spare socks', 'socks', 'gloves', 'base layer', 'warm coat', 'cap',
  'sun cream', 'sunscreen', 'boot bag', 'kit bag', 'bag',
  'goggles', 'swim cap', 'swimming cap', 'swimming goggles',
  'shorts', 'jersey', 'shirt', 'tracksuit', 'vest',
];

const WEATHER_ITEMS = [
  { name: 'Towel',              category: 'accessories' as const, urgent: false },
  { name: 'Waterproof jacket',  category: 'clothing'    as const, urgent: false },
  { name: 'Spare socks',        category: 'accessories' as const, urgent: false },
  { name: 'Boot bag',           category: 'bag'         as const, urgent: false },
];

// ─── Entity extractors ────────────────────────────────────────────────────────

export function matchChild(text: string): { name: string; id: string } | undefined {
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(CHILDREN_MAP)) {
    if (lower.includes(key)) return val;
  }
  return undefined;
}

export function matchDriver(text: string): { name: string; id: string } | undefined {
  const lower = text.toLowerCase();
  // Check multi-word first to avoid 'grandad' matching just 'mike'
  for (const key of Object.keys(DRIVERS_MAP).sort((a, b) => b.length - a.length)) {
    if (lower.includes(key)) return DRIVERS_MAP[key];
  }
  return undefined;
}

export function matchSport(text: string): string | undefined {
  const lower = text.toLowerCase();
  return SPORTS.find(s => lower.includes(s));
}

function extractKitItem(text: string): { name: string; urgent: boolean } | undefined {
  const lower = text.toLowerCase();
  // Longest match first to avoid 'boots' matching before 'football boots'
  const sorted = [...KIT_ITEMS].sort((a, b) => b.length - a.length);
  for (const item of sorted) {
    if (lower.includes(item)) {
      const capitalized = item.replace(/\b\w/g, c => c.toUpperCase());
      return { name: capitalized, urgent: URGENT_KIT_WITH_BOOTS.includes(item) };
    }
  }
  return undefined;
}

function matchEventForChild(
  childId: string | undefined,
  sport: string | undefined,
  state: AppState
): AppEvent | undefined {
  return state.events.find(e => {
    const memberMatch = childId ? e.memberId === childId : true;
    const sportMatch  = sport   ? e.sport    === sport   : true;
    return memberMatch && sportMatch;
  });
}

// ─── Summary generators ───────────────────────────────────────────────────────

function generateWeekendSummary(state: AppState): string {
  const unassigned  = state.liftRequests.filter(lr => !lr.assignedDriverId);
  const urgentKit   = state.kitItems.filter(k  => k.urgent && !k.completed);
  const unreadUrgent = state.notices.filter(n  => n.urgent && !n.read);
  const pendingChores = state.chores.filter(c  => !c.completed);

  const total = state.events.length;
  const ready = state.events.filter(e => e.transportAssigned && e.kitChecked).length;
  const pct   = total > 0 ? Math.round((ready / total) * 100) : 0;

  let msg = `You're ${pct}% ready for the weekend. `;

  if (unassigned.length > 0) {
    const names = unassigned.map(lr => lr.childName).join(' and ');
    msg += `${names} still need${unassigned.length === 1 ? 's' : ''} a lift. `;
  } else {
    msg += 'All lifts are sorted. ';
  }

  if (urgentKit.length > 0) {
    const byChild: Record<string, string[]> = {};
    urgentKit.forEach(k => {
      byChild[k.memberName] = byChild[k.memberName] || [];
      byChild[k.memberName].push(k.name.toLowerCase());
    });
    Object.entries(byChild).forEach(([name, items]) => {
      msg += `${name} is missing ${items.join(' and ')}. `;
    });
  } else {
    msg += 'Urgent kit is all sorted. ';
  }

  if (unreadUrgent.length > 0)
    msg += `${unreadUrgent.length} urgent notice${unreadUrgent.length > 1 ? 's' : ''} unread. `;

  if (pendingChores.length > 0)
    msg += `${pendingChores.length} chore${pendingChores.length > 1 ? 's' : ''} still to do.`;

  return msg.trim();
}

function readNotices(state: AppState): string {
  const urgent   = state.notices.filter(n => n.urgent && !n.read);
  const allUnread = state.notices.filter(n => !n.read);

  if (allUnread.length === 0)
    return "You're all caught up — no unread messages right now. 👍";

  if (urgent.length > 0) {
    const n = urgent[0];
    let reply = `You have ${urgent.length} urgent notice${urgent.length > 1 ? 's' : ''}. `;
    reply += `${n.from} says: "${n.title}." `;
    reply += n.body.slice(0, 100) + (n.body.length > 100 ? '…' : '');
    if (allUnread.length > urgent.length)
      reply += ` Plus ${allUnread.length - urgent.length} more unread.`;
    return reply;
  }

  const n = allUnread[0];
  return `${allUnread.length} unread message${allUnread.length > 1 ? 's' : ''}. Latest from ${n.from}: "${n.title}."`;
}

function buildQueryAnswer(
  text: string,
  state: AppState,
  child: ReturnType<typeof matchChild>,
  _sport: string | undefined,
  event: AppEvent | undefined
): string {
  const lower = text.toLowerCase();

  if ((lower.includes('driving') || lower.includes('taking') || lower.includes("who's")) && child) {
    const lr = state.liftRequests.find(r => r.childId === child.id);
    if (lr?.assignedDriverId) {
      const d = state.drivers.find(dr => dr.id === lr.assignedDriverId);
      return `${d?.name || 'Someone'} is driving ${child.name}. ✅`;
    }
    return `${child.name} doesn't have a confirmed lift yet.`;
  }

  if (lower.includes('what time') && event) {
    return `${child?.name || 'That event'}'s ${event.title} is at ${event.time} on ${event.date} at ${event.location}.`;
  }

  if (lower.includes('where') && event) {
    return `${child?.name || 'That event'} is at ${event.location} (${event.time} ${event.date}).`;
  }

  if (lower.includes('kit') || lower.includes('missing')) {
    const missing = child
      ? state.kitItems.filter(k => k.memberId === child.id && !k.completed)
      : state.kitItems.filter(k => k.urgent && !k.completed);
    if (missing.length === 0)
      return child ? `${child.name}'s kit is all sorted! ✅` : 'All urgent kit is sorted! ✅';
    const items = missing.map(k => k.name.toLowerCase()).join(', ');
    return child ? `${child.name} still needs: ${items}.` : `Still missing: ${items}.`;
  }

  return "Let me check that. Try asking about a specific child or event.";
}

// ─── WhatsApp message generator ───────────────────────────────────────────────

export function generateWhatsAppMessage(intent: CommandIntent, state: AppState): string {
  if (intent.type === 'DRAFT_MESSAGE') {
    const ev = intent.eventId ? state.events.find(e => e.id === intent.eventId) : undefined;
    if (intent.childName && ev) {
      return `Hi all 👋 Can anyone help with a lift for ${intent.childName} to ${ev.title} at ${ev.time} on ${ev.date} at ${ev.location}? Thank you! 🙏`;
    }
    if (intent.childName) {
      return `Hi all 👋 Can anyone help with a lift for ${intent.childName} this weekend? Thank you! 🙏`;
    }
    return intent.messageText || 'Hi team! Check Sorted for the latest weekend plan. 👍';
  }
  return 'Hi team! Heads up for the weekend — check the Sorted app for the latest. 👋';
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseVoiceCommand(transcript: string, state: AppState): CommandIntent {
  const t     = transcript.toLowerCase().trim();
  const child  = matchChild(transcript);
  const driver = matchDriver(transcript);
  const sport  = matchSport(transcript);
  const event  = matchEventForChild(child?.id, sport, state);

  // ── 1. Weekend summary ────────────────────────────────────────────────────
  if (
    (t.includes('ready') && (t.includes('weekend') || t.includes('we '))) ||
    t.includes("what's missing") || t.includes('what is missing') ||
    t.includes('still missing') || t.includes('weekend plan') ||
    t.includes('give me the plan') || t.includes('what still needs')
  ) {
    const answer = generateWeekendSummary(state);
    return { type: 'WEEKEND_SUMMARY', confirmationRequired: false, confidence: 0.9, rawTranscript: transcript, reply: answer, queryAnswer: answer };
  }

  // ── 2. Read notices ───────────────────────────────────────────────────────
  if (
    t.includes('notice') || t.includes("i've missed") || t.includes('have i missed') ||
    t.includes('what have i missed') || t.includes('club update') ||
    t.includes('any update') || (t.includes('read') && t.includes('urgent'))
  ) {
    const answer = readNotices(state);
    return { type: 'READ_NOTICES', confirmationRequired: false, confidence: 0.9, rawTranscript: transcript, reply: answer, queryAnswer: answer };
  }

  // ── 3. Weather / rain kit ─────────────────────────────────────────────────
  if (
    t.includes('rainy day kit') || t.includes('rain kit') || t.includes('weather kit') ||
    t.includes('wet weather') || t.includes('prepare for rain') ||
    (t.includes('rain') && (t.includes('add') || t.includes('kit') || t.includes('prepare')))
  ) {
    const forName = child?.name || 'everyone';
    return {
      type: 'ADD_WEATHER_KIT',
      childName: child?.name, childId: child?.id,
      confirmationRequired: true, confidence: 0.9,
      rawTranscript: transcript,
      reply: `Rain expected Saturday. Add towel, waterproof jacket, spare socks and boot bag for ${forName}?`,
    };
  }

  // ── 4. Draft WhatsApp message ─────────────────────────────────────────────
  if (
    t.includes('ask the') || t.includes('message the') || t.includes('tell everyone') ||
    t.includes('send a message') || (t.includes('ask') && t.includes('anyone can')) ||
    t.includes('whatsapp')
  ) {
    const ev = event;
    const msgText = ev && child
      ? `Hi all 👋 Can anyone help with a lift for ${child.name} to ${ev.title} at ${ev.time} on ${ev.date} at ${ev.location}? Thank you! 🙏`
      : `Hi all 👋 Can anyone help with a lift for ${child?.name || 'one of the kids'} this weekend? Thank you! 🙏`;
    return {
      type: 'DRAFT_MESSAGE',
      childName: child?.name, childId: child?.id,
      eventId: event?.id, sport,
      messageText: msgText,
      confirmationRequired: true, confidence: 0.88,
      rawTranscript: transcript,
      reply: `I've drafted a message — share to WhatsApp?\n\n"${msgText}"`,
    };
  }

  // ── 5. Assign driver ──────────────────────────────────────────────────────
  if (
    driver &&
    (t.includes('is taking') || t.includes('will take') || t.includes('will drive') ||
     t.includes('can take') || t.includes('is driving') || t.includes('going to take'))
  ) {
    const targetChild = child;
    const eventTitle = event?.title || (sport ? `${sport} event` : 'the event');
    return {
      type: 'ASSIGN_DRIVER',
      childName: targetChild?.name, childId: targetChild?.id,
      driverName: driver.name, driverId: driver.id,
      eventId: event?.id, sport,
      confirmationRequired: true, confidence: 0.92,
      rawTranscript: transcript,
      reply: targetChild
        ? `Assign ${driver.name} as driver for ${targetChild.name}'s ${eventTitle}?`
        : `Assign ${driver.name} as a driver this weekend?`,
    };
  }

  // ── 6. Lift request ───────────────────────────────────────────────────────
  if (
    t.includes('needs a lift') || t.includes('need a lift') ||
    t.includes('needs transport') || t.includes('needs picking up') ||
    t.includes('needs a ride') || t.includes('who can take') ||
    (t.includes('lift') && child && !driver)
  ) {
    const eventTitle = event?.title || (sport ? `${sport} event` : 'their event');
    const eventTime  = event?.time || 'Saturday';
    if (!child) {
      return { type: 'REQUEST_LIFT', confirmationRequired: false, confidence: 0.6, rawTranscript: transcript, reply: "Who needs the lift?" };
    }
    return {
      type: 'REQUEST_LIFT',
      childName: child.name, childId: child.id,
      eventId: event?.id, sport,
      confirmationRequired: true, confidence: 0.92,
      rawTranscript: transcript,
      reply: `I'll mark ${child.name} as needing a lift to ${eventTitle} at ${eventTime}. Confirm?`,
    };
  }

  // ── 7. Complete kit ───────────────────────────────────────────────────────
  if (
    (t.includes('mark') && (t.includes('packed') || t.includes('sorted') || t.includes('done') || t.includes('complete'))) ||
    t.includes('has his') || t.includes('has her') || t.includes('has got') ||
    (t.includes('sorted') && extractKitItem(transcript) !== undefined)
  ) {
    const kitItem = extractKitItem(transcript);
    if (child && kitItem) {
      return {
        type: 'COMPLETE_KIT',
        childName: child.name, childId: child.id,
        itemName: kitItem.name,
        confirmationRequired: true, confidence: 0.88,
        rawTranscript: transcript,
        reply: `Mark ${child.name}'s ${kitItem.name.toLowerCase()} as sorted?`,
      };
    }
    if (kitItem && !child) {
      return { type: 'COMPLETE_KIT', itemName: kitItem.name, confirmationRequired: false, confidence: 0.55, rawTranscript: transcript, reply: `Who is ${kitItem.name.toLowerCase()} for?` };
    }
  }

  // ── 8. Complete chore ─────────────────────────────────────────────────────
  const choreCompleteMatch = transcript.match(/mark (.+?) (?:as )?(?:done|complete|finished)/i);
  if (choreCompleteMatch && !extractKitItem(transcript)) {
    const choreTitle = choreCompleteMatch[1];
    return {
      type: 'COMPLETE_CHORE',
      itemName: choreTitle,
      childName: child?.name, childId: child?.id,
      confirmationRequired: true, confidence: 0.85,
      rawTranscript: transcript,
      reply: `Mark "${choreTitle}" as done?`,
    };
  }

  // ── 9. Add chore ──────────────────────────────────────────────────────────
  if (
    (t.includes('add') && t.includes('chore')) ||
    t.includes('remind') ||
    (t.includes('wash') && t.includes('kit'))
  ) {
    const choreMatch = transcript.match(/add (.+?) to chores?/i)
      || transcript.match(/remind (\w+) to (.+)/i);
    let choreTitle = 'New chore';
    if (choreMatch) choreTitle = (choreMatch[2] || choreMatch[1]).trim();
    else if (t.includes('wash') && t.includes('kit')) choreTitle = 'Wash rugby kit';
    choreTitle = choreTitle.charAt(0).toUpperCase() + choreTitle.slice(1);
    return {
      type: 'ADD_CHORE',
      itemName: choreTitle,
      childName: child?.name, childId: child?.id,
      confirmationRequired: true, confidence: 0.82,
      rawTranscript: transcript,
      reply: `Add "${choreTitle}" to the chores list${child ? ` for ${child.name}` : ''}?`,
    };
  }

  // ── 10. Add kit item ──────────────────────────────────────────────────────
  if (t.includes('add') || t.includes('needs') || t.includes('missing') || t.includes('get') || t.includes('pack')) {
    const kitItem = extractKitItem(transcript);
    if (kitItem && child) {
      const sportLabel = sport || event?.sport || 'kit';
      return {
        type: 'ADD_KIT',
        childName: child.name, childId: child.id,
        itemName: kitItem.name,
        sport: sport || event?.sport,
        eventId: event?.id,
        urgent: kitItem.urgent,
        confirmationRequired: true, confidence: 0.9,
        rawTranscript: transcript,
        reply: `I'll add ${kitItem.name.toLowerCase()} to ${child.name}'s ${sportLabel} kit${kitItem.urgent ? ' (urgent)' : ''}. Confirm?`,
      };
    }
    if (kitItem) {
      return { type: 'ADD_KIT', itemName: kitItem.name, urgent: kitItem.urgent, confirmationRequired: false, confidence: 0.65, rawTranscript: transcript, reply: `Who is ${kitItem.name.toLowerCase()} for?` };
    }
  }

  // ── 11. Query (read-only answers) ─────────────────────────────────────────
  if (
    t.includes("who's driving") || t.includes('who is driving') || t.includes('who is taking') ||
    t.startsWith('what time') || t.startsWith('where is') || t.startsWith('when is') ||
    t.includes('what kit') || (t.includes('who') && t.includes('driving'))
  ) {
    const answer = buildQueryAnswer(transcript, state, child, sport, event);
    return { type: 'QUERY', childName: child?.name, sport, eventId: event?.id, confirmationRequired: false, confidence: 0.85, rawTranscript: transcript, reply: answer, queryAnswer: answer };
  }

  // ── 12. Unknown ───────────────────────────────────────────────────────────
  return {
    type: 'UNKNOWN',
    confirmationRequired: false, confidence: 0,
    rawTranscript: transcript,
    reply: "I didn't quite catch that. Try: \"Jack needs a lift Saturday\" or \"What's missing this weekend?\"",
  };
}

// Export weather items for use in actions
export { WEATHER_ITEMS };
