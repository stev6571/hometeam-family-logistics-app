import type { AppState } from './types';

// Demo data tells a story: it's Friday evening.
// Saturday has three kids with events. Two lifts unassigned.
// Jack's rugby boots are still missing. Liam's kit isn't washed.
// An urgent club notice just came in. 45% readiness — real chaos, fixable.

export const initialState: AppState = {

  familyMembers: [
    { id: 'steven', name: 'Steven', avatar: '👨', role: 'parent' },
    { id: 'sarah',  name: 'Sarah',  avatar: '👩', role: 'parent' },
    { id: 'jack',   name: 'Jack',   avatar: '🧒', role: 'child'  },
    { id: 'liam',   name: 'Liam',   avatar: '👦', role: 'child'  },
    { id: 'alfie',  name: 'Alfie',  avatar: '👦', role: 'child'  },
    { id: 'noah',   name: 'Noah',   avatar: '🧒', role: 'child'  },
  ],

  events: [
    {
      id: 'e1',
      title: 'Rugby Tournament',
      memberId: 'jack',
      date: 'Saturday',
      time: '09:30',
      location: 'Manor Fields',
      sport: 'rugby',
      transportAssigned: false,  // ← no lift yet
      kitChecked: false,         // ← boots missing
    },
    {
      id: 'e2',
      title: 'Football Match',
      memberId: 'liam',
      date: 'Saturday',
      time: '11:00',
      location: 'Riverside Ground',
      sport: 'football',
      transportAssigned: true,   // ← Steven driving
      kitChecked: false,         // ← kit not washed yet
    },
    {
      id: 'e3',
      title: 'Football Training',
      memberId: 'alfie',
      date: 'Saturday',
      time: '10:00',
      location: 'Sports Park',
      sport: 'football',
      transportAssigned: false,  // ← no lift yet
      kitChecked: true,
    },
    {
      id: 'e4',
      title: 'Swimming Lesson',
      memberId: 'noah',
      date: 'Sunday',
      time: '10:30',
      location: 'Waterside Leisure Centre',
      sport: 'swimming',
      transportAssigned: true,
      kitChecked: true,
    },
  ],

  drivers: [
    { id: 'd1', name: 'Steven',      seats: 4, passengers: ['liam'] },
    { id: 'd2', name: 'Sarah',       seats: 4, passengers: ['noah'] },
    { id: 'd3', name: 'Grandad Mike', seats: 4, passengers: [] },
  ],

  liftRequests: [
    {
      id: 'lr1',
      childId: 'jack',
      childName: 'Jack',
      eventId: 'e1',
      eventTitle: 'Rugby Tournament',
      time: '09:30',
      location: 'Manor Fields',
      assignedDriverId: null,    // ← urgent — needs sorting
    },
    {
      id: 'lr2',
      childId: 'alfie',
      childName: 'Alfie',
      eventId: 'e3',
      eventTitle: 'Football Training',
      time: '10:00',
      location: 'Sports Park',
      assignedDriverId: null,    // ← also unassigned
    },
    {
      id: 'lr3',
      childId: 'liam',
      childName: 'Liam',
      eventId: 'e2',
      eventTitle: 'Football Match',
      time: '11:00',
      location: 'Riverside Ground',
      assignedDriverId: 'd1',    // ← sorted: Steven driving
    },
    {
      id: 'lr4',
      childId: 'noah',
      childName: 'Noah',
      eventId: 'e4',
      eventTitle: 'Swimming Lesson',
      time: '10:30',
      location: 'Waterside Leisure Centre',
      assignedDriverId: 'd2',    // ← sorted: Sarah driving
    },
  ],

  kitItems: [
    // Jack — rugby — two items missing, one urgent
    { id: 'k1', name: 'Rugby boots (size 5)', memberId: 'jack', memberName: 'Jack', sport: 'rugby',    urgent: true,  completed: false, category: 'boots'      },
    { id: 'k2', name: 'Gum shield',           memberId: 'jack', memberName: 'Jack', sport: 'rugby',    urgent: true,  completed: false, category: 'protection' },
    { id: 'k3', name: 'Rugby jersey',         memberId: 'jack', memberName: 'Jack', sport: 'rugby',    urgent: false, completed: true,  category: 'clothing'   },
    { id: 'k4', name: 'Kit bag packed',       memberId: 'jack', memberName: 'Jack', sport: 'rugby',    urgent: false, completed: false, category: 'bag'        },
    // Liam — football — kit not washed
    { id: 'k5', name: 'Football kit (wash!)', memberId: 'liam', memberName: 'Liam', sport: 'football', urgent: true,  completed: false, category: 'clothing'   },
    { id: 'k6', name: 'Football boots',       memberId: 'liam', memberName: 'Liam', sport: 'football', urgent: false, completed: true,  category: 'boots'      },
    { id: 'k7', name: 'Shin pads',            memberId: 'liam', memberName: 'Liam', sport: 'football', urgent: false, completed: true,  category: 'protection' },
    // Alfie — sorted
    { id: 'k8', name: 'Football boots',       memberId: 'alfie', memberName: 'Alfie', sport: 'football', urgent: false, completed: true, category: 'boots'    },
    { id: 'k9', name: 'Shin pads',            memberId: 'alfie', memberName: 'Alfie', sport: 'football', urgent: false, completed: true, category: 'protection' },
    // Noah — sorted
    { id: 'k10', name: 'Goggles',             memberId: 'noah',  memberName: 'Noah',  sport: 'swimming', urgent: false, completed: true, category: 'accessories' },
    { id: 'k11', name: 'Swim cap',            memberId: 'noah',  memberName: 'Noah',  sport: 'swimming', urgent: false, completed: true, category: 'accessories' },
  ],

  notices: [
    {
      id: 'n1',
      from: 'Club Secretary',
      title: 'Away kit required Saturday ⚠️',
      body: 'Reminder: Saturday\'s tournament is an away fixture. All players must wear the AWAY kit (blue). If you don\'t have the away top, contact the kit manager before 8pm Friday. Kick-off is 9:30 — be there by 9:00.',
      timestamp: '1h ago',
      urgent: true,
      read: false,        // ← unread, urgent
      category: 'match',
    },
    {
      id: 'n2',
      from: 'Coach Williams',
      title: 'Saturday training moved to Sports Park',
      body: 'Due to waterlogging at the usual pitch, Saturday morning training is moving to Sports Park (behind the leisure centre). Same time, 10am. Car park is on the left.',
      timestamp: '3h ago',
      urgent: false,
      read: false,        // ← unread
      category: 'training',
    },
    {
      id: 'n3',
      from: 'Club Admin',
      title: 'Monthly subs due by Friday',
      body: 'A reminder that monthly subs (£25) are due by Friday evening. You can pay via the club app or bring cash to training. Any queries, contact the treasurer.',
      timestamp: '1d ago',
      urgent: false,
      read: true,
      category: 'admin',
    },
  ],

  shoppingItems: [
    { id: 's1', name: 'Rugby boots — size 5 (Jack)', memberId: 'jack', memberName: 'Jack', urgent: true,  purchased: false },
    { id: 's2', name: 'Gum shield (Jack)',           memberId: 'jack', memberName: 'Jack', urgent: true,  purchased: false },
    { id: 's3', name: 'Water bottle (Liam)',         memberId: 'liam', memberName: 'Liam', urgent: false, purchased: false },
    { id: 's4', name: 'Energy bars (weekend)',       memberId: 'steven', memberName: 'Steven', urgent: false, purchased: true },
  ],

  chores: [
    { id: 'c1', title: 'Pack Jack\'s rugby kit bag', assignedTo: 'jack',   assignedName: 'Jack',   points: 10, completed: false, dueDate: 'Friday'   },
    { id: 'c2', title: 'Wash Liam\'s football kit',  assignedTo: 'sarah',  assignedName: 'Sarah',  points: 10, completed: false, dueDate: 'Friday'   },
    { id: 'c3', title: 'Clean all boots',            assignedTo: 'liam',   assignedName: 'Liam',   points: 5,  completed: true,  dueDate: 'Thursday' },
    { id: 'c4', title: 'Prepare snack bag',          assignedTo: 'alfie',  assignedName: 'Alfie',  points: 5,  completed: true,  dueDate: 'Friday'   },
    { id: 'c5', title: 'Print tournament schedule',  assignedTo: 'steven', assignedName: 'Steven', points: 5,  completed: true,  dueDate: 'Thursday' },
  ],

  badges: [
    { id: 'b1', name: 'Lift Legend',      description: 'Sorted transport for the team',  icon: '🚗', earned: true,  earnedBy: 'Steven' },
    { id: 'b2', name: 'Kit Hero',         description: 'Got all kit packed and checked', icon: '⚽', earned: false },
    { id: 'b3', name: 'Tournament Ready', description: 'Completed the full weekend prep', icon: '🏆', earned: false },
    { id: 'b4', name: 'Early Bird',       description: 'Ready by Friday evening',         icon: '🌅', earned: false },
    { id: 'b5', name: 'Streak Starter',   description: '3 weekends ready in a row',       icon: '🔥', earned: false },
  ],

  weather: {
    condition: 'rain',
    temp: 11,
    description: 'Heavy rain expected 9am–1pm Saturday',
  },
};

export function blankState(): AppState {
  return {
    familyMembers: [],
    events: [],
    drivers: [],
    liftRequests: [],
    kitItems: [],
    notices: [],
    shoppingItems: [],
    chores: [],
    badges: [],
    weather: { condition: 'sunny', temp: 14, description: 'Looks good for the weekend' },
  };
}
