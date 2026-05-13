export type Tab = 'home' | 'lifts' | 'kit' | 'noticeboard' | 'weekend';

export interface FamilyMember {
  id: string;
  name: string;
  avatar: string;
  role: 'parent' | 'child';
}

export interface Event {
  id: string;
  title: string;
  memberId: string;
  date: string;
  time: string;
  location: string;
  sport: string;
  transportAssigned: boolean;
  kitChecked: boolean;
}

export interface Driver {
  id: string;
  name: string;
  seats: number;
  passengers: string[]; // member IDs
}

export interface LiftRequest {
  id: string;
  childId: string;
  childName: string;
  eventId: string;
  eventTitle: string;
  time: string;
  location: string;
  assignedDriverId: string | null;
}

export interface KitItem {
  id: string;
  name: string;
  memberId: string;
  memberName: string;
  sport: string;
  urgent: boolean;
  completed: boolean;
  category: 'boots' | 'clothing' | 'protection' | 'accessories' | 'bag';
}

export interface Notice {
  id: string;
  from: string;
  title: string;
  body: string;
  timestamp: string;
  urgent: boolean;
  read: boolean;
  category: 'match' | 'training' | 'admin' | 'social';
}

export interface ShoppingItem {
  id: string;
  name: string;
  memberId: string;
  memberName: string;
  urgent: boolean;
  purchased: boolean;
}

export interface Chore {
  id: string;
  title: string;
  assignedTo: string;
  assignedName: string;
  points: number;
  completed: boolean;
  dueDate: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedBy?: string;
}

export interface WeatherData {
  condition: 'rain' | 'cold' | 'sunny' | 'mixed';
  temp: number;
  description: string;
}

export interface AppState {
  events: Event[];
  drivers: Driver[];
  liftRequests: LiftRequest[];
  kitItems: KitItem[];
  notices: Notice[];
  shoppingItems: ShoppingItem[];
  chores: Chore[];
  badges: Badge[];
  weather: WeatherData;
  familyMembers: FamilyMember[];
}
