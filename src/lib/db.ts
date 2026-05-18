import { supabase } from './supabase';
import type { AppState } from '../types';
import { initialState } from '../mockData';

function freshState(): AppState {
  return JSON.parse(JSON.stringify(initialState));
}

// ── Group types ───────────────────────────────────────────────────────────────

export interface Group {
  id: string;
  name: string;
  group_type: string;
  is_personal: boolean;
  join_code: string;
}

export const GROUP_TYPE_META: Record<string, { icon: string; label: string }> = {
  personal: { icon: '👤', label: 'My Space'    },
  family:   { icon: '👨‍👩‍👧‍👦', label: 'Family'     },
  sports:   { icon: '⚽', label: 'Sports Team'  },
  club:     { icon: '🏅', label: 'Club'         },
  dance:    { icon: '💃', label: 'Dance Troupe' },
  school:   { icon: '🏫', label: 'School'       },
  work:     { icon: '💼', label: 'Work'          },
  friends:  { icon: '👥', label: 'Friends'       },
  other:    { icon: '🏠', label: 'Group'         },
};

// ── Group queries ─────────────────────────────────────────────────────────────

export async function getGroupsForUser(userId: string): Promise<Group[]> {
  const { data } = await supabase
    .from('family_members')
    .select('families(id, name, group_type, is_personal, join_code)')
    .eq('user_id', userId);

  return (data ?? [])
    .map(d => d.families as unknown as Group)
    .filter(Boolean);
}

export async function getJoinCode(groupId: string): Promise<string> {
  const { data } = await supabase
    .from('families')
    .select('join_code')
    .eq('id', groupId)
    .single();
  return data?.join_code ?? '------';
}

// ── Group creation / joining ──────────────────────────────────────────────────

async function _createGroupRow(userId: string, name: string, groupType: string, isPersonal: boolean): Promise<string> {
  const { data: group, error: ge } = await supabase
    .from('families')
    .insert({ name, group_type: groupType, is_personal: isPersonal })
    .select('id')
    .single();

  if (ge || !group) throw ge ?? new Error('Failed to create group');

  const { error: me } = await supabase
    .from('family_members')
    .insert({ family_id: group.id, user_id: userId, role: 'owner' });
  if (me) throw me;

  const { error: se } = await supabase
    .from('user_app_data')
    .insert({ family_id: group.id, state: freshState() });
  if (se) throw se;

  return group.id;
}

export async function createPersonalGroup(userId: string): Promise<string> {
  return _createGroupRow(userId, 'My Space', 'personal', true);
}

export async function createGroup(userId: string, name: string, groupType: string): Promise<string> {
  return _createGroupRow(userId, name, groupType, false);
}

export async function joinGroup(userId: string, joinCode: string): Promise<string> {
  const { data: group, error: ge } = await supabase
    .from('families')
    .select('id')
    .eq('join_code', joinCode.toUpperCase().trim())
    .maybeSingle();

  if (ge) throw ge;
  if (!group) throw new Error('Code not found. Check it and try again.');

  const { error: me } = await supabase
    .from('family_members')
    .insert({ family_id: group.id, user_id: userId, role: 'member' });

  if (me) {
    if (me.code === '23505') throw new Error('You\'re already in this group.');
    throw me;
  }

  return group.id;
}

// ── App state ─────────────────────────────────────────────────────────────────

export async function loadUserState(groupId: string): Promise<AppState> {
  const { data, error } = await supabase
    .from('user_app_data')
    .select('state')
    .eq('family_id', groupId)
    .maybeSingle();

  if (error) {
    console.error('Failed to load state:', error.message);
    return freshState();
  }

  if (!data) {
    const seed = freshState();
    await saveUserState(groupId, seed);
    return seed;
  }

  return data.state as AppState;
}

export async function saveUserState(groupId: string, state: AppState): Promise<void> {
  const { error } = await supabase
    .from('user_app_data')
    .upsert({ family_id: groupId, state, updated_at: new Date().toISOString() }, { onConflict: 'family_id' });

  if (error) console.error('Failed to save state:', error.message);
}

// ── Legacy alias (used by old joinFamily call sites) ─────────────────────────
export const joinFamily   = joinGroup;
export const createFamily = createGroup;
