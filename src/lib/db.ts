import { supabase } from './supabase';
import type { AppState } from '../types';
import { initialState } from '../mockData';

const TABLE = 'user_app_data';

// Deep-copy initial state so each new family gets a fresh copy
function freshState(): AppState {
  return JSON.parse(JSON.stringify(initialState));
}

export async function loadUserState(userId: string): Promise<AppState> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('state')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to load state:', error.message);
    return freshState();
  }

  if (!data) {
    // First sign-in — seed the family's data then return it
    const seed = freshState();
    await saveUserState(userId, seed);
    return seed;
  }

  return data.state as AppState;
}

export async function saveUserState(userId: string, state: AppState): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .upsert({ id: userId, state, updated_at: new Date().toISOString() }, { onConflict: 'id' });

  if (error) {
    console.error('Failed to save state:', error.message);
  }
}
