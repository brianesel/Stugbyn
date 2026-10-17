import type { SaveData } from '../store/save';
import { supabase } from './client';

export async function fetchRemote(userId: string): Promise<unknown> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('progress').select('data').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data?.data ?? null;
}

export async function pushRemote(userId: string, save: SaveData): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('progress')
    .upsert({ user_id: userId, data: save, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function deleteRemote(userId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('progress').delete().eq('user_id', userId);
  if (error) throw error;
}
