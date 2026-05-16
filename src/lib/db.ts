import { supabase } from './supabase';
import type { AppState } from '../types';
import { initialState } from '../mockData';

function freshState(): AppState {
  return JSON.parse(JSON.stringify(initialState));
}

// ── Family lookup ─────────────────────────────────────────────────────────────

export async function getFamilyForUser(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.family_id ?? null;
}

export async function getJoinCode(familyId: string): Promise<string> {
  const { data } = await supabase
    .from('families')
    .select('join_code')
    .eq('id', familyId)
    .single();
  return data?.join_code ?? '------';
}

// ── Family creation / joining ─────────────────────────────────────────────────

export async function createFamily(userId: string, name: string): Promise<string> {
  const { data: family, error: fe } = await supabase
    .from('families')
    .insert({ name })
    .select('id')
    .single();

  if (fe || !family) throw fe ?? new Error('Failed to create family');

  const { error: me } = await supabase
    .from('family_members')
    .insert({ family_id: family.id, user_id: userId, role: 'owner' });

  if (me) throw me;

  const { error: se } = await supabase
    .from('user_app_data')
    .insert({ family_id: family.id, state: freshState() });

  if (se) throw se;

  return family.id;
}

export async function joinFamily(userId: string, joinCode: string): Promise<string> {
  const { data: family, error: fe } = await supabase
    .from('families')
    .select('id')
    .eq('join_code', joinCode.toUpperCase().trim())
    .maybeSingle();

  if (fe) throw fe;
  if (!family) throw new Error('Code not found. Check it and try again.');

  const { error: me } = await supabase
    .from('family_members')
    .insert({ family_id: family.id, user_id: userId, role: 'member' });

  if (me) {
    if (me.code === '23505') throw new Error('You\'re already in this family.');
    throw me;
  }

  return family.id;
}

// ── App state ─────────────────────────────────────────────────────────────────

export async function loadUserState(familyId: string): Promise<AppState> {
  const { data, error } = await supabase
    .from('user_app_data')
    .select('state')
    .eq('family_id', familyId)
    .maybeSingle();

  if (error) {
    console.error('Failed to load state:', error.message);
    return freshState();
  }

  if (!data) {
    const seed = freshState();
    await saveUserState(familyId, seed);
    return seed;
  }

  return data.state as AppState;
}

export async function saveUserState(familyId: string, state: AppState): Promise<void> {
  const { error } = await supabase
    .from('user_app_data')
    .upsert({ family_id: familyId, state, updated_at: new Date().toISOString() }, { onConflict: 'family_id' });

  if (error) console.error('Failed to save state:', error.message);
}
