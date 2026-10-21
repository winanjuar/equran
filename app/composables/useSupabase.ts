/**
 * useSupabase — typed query helpers for every Supabase table used in e-Quran.
 *
 * Wraps the auto-provided useSupabaseClient() from @nuxtjs/supabase and
 * exposes strongly-typed, reusable query builders so the rest of the app never
 * has to repeat raw table names or column references.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/supabase'
import type {
  Book,
  Session,
  SessionEntry,
  VerseActivityLog,
  SessionType,
} from '~/types/database'

export function useSupabase() {
  // Cast to SupabaseClient<Database> so .from() picks up our table types correctly.
  // useSupabaseClient() from @nuxtjs/supabase doesn't accept a generic parameter directly.
  const client = useSupabaseClient() as SupabaseClient<Database>

  return {
    client,

    // ── quran_verses ──────────────────────────────────────
    quranVerses: {
      getAll: () => client.from('quran_verses').select('*').order('id'),
      getRange: (startId: number, endId: number) =>
        client.from('quran_verses').select('*').gte('id', startId).lte('id', endId).order('id'),
      getBySurah: (surah: number) =>
        client.from('quran_verses').select('*').eq('surah', surah).order('id'),
      getByJuz: (juz: number) =>
        client.from('quran_verses').select('*').eq('juz', juz).order('id'),
      getByPage: (page: number) =>
        client.from('quran_verses').select('*').eq('page', page).order('id'),
    },

    // ── surah_weights ─────────────────────────────────────
    surahWeights: {
      getAll: () => client.from('surah_weights').select('*').order('surah'),
      update: (surah: number, weight: number) =>
        client.from('surah_weights').update({ weight }).eq('surah', surah),
    },

    // ── books ─────────────────────────────────────────────
    books: {
      getAll: () => client.from('books').select('*').order('created_at'),
      create: (data: Omit<Book, 'id' | 'created_at'>) =>
        client.from('books').insert(data).select().single(),
      update: (id: string, data: Partial<Omit<Book, 'id' | 'created_at'>>) =>
        client.from('books').update(data).eq('id', id),
      delete: (id: string) =>
        client.from('books').delete().eq('id', id),
    },

    // ── sessions ──────────────────────────────────────────
    sessions: {
      create: (data: Omit<Session, 'id' | 'created_at'>) =>
        client.from('sessions').insert(data).select().single(),
      getRecent: (limit = 20) =>
        client.from('sessions').select('*, books(name)').order('created_at', { ascending: false }).limit(limit),
      getByType: (type: SessionType, limit = 20) =>
        client.from('sessions').select('*, books(name)').eq('type', type).order('created_at', { ascending: false }).limit(limit),
      delete: (id: string) =>
        client.from('sessions').delete().eq('id', id),
    },

    // ── session_entries ───────────────────────────────────
    sessionEntries: {
      create: (data: Omit<SessionEntry, 'id' | 'created_at'>) =>
        client.from('session_entries').insert(data).select().single(),
      createMany: (data: Omit<SessionEntry, 'id' | 'created_at'>[]) =>
        client.from('session_entries').insert(data).select(),
      getBySession: (sessionId: string) =>
        client.from('session_entries').select('*').eq('session_id', sessionId),
    },

    // ── verse_activity_log ────────────────────────────────
    verseActivityLog: {
      createMany: (data: Omit<VerseActivityLog, 'id' | 'created_at'>[]) =>
        client.from('verse_activity_log').insert(data),
      getHeatmapData: (type: SessionType, from: string, to: string) =>
        client
          .from('verse_activity_log')
          .select('verse_id, score')
          .eq('session_type', type)
          .gte('session_date', from)
          .lte('session_date', to),
    },

    // ── hijri_daily_targets ───────────────────────────────
    hijriDailyTargets: {
      getByDay: (hijriDay: number) =>
        client.from('hijri_daily_targets').select('*').eq('hijri_day', hijriDay).order('sort_order'),
      getAll: () =>
        client.from('hijri_daily_targets').select('*').order('hijri_day').order('sort_order'),
    },

    // ── app_settings ──────────────────────────────────────
    appSettings: {
      getAll: () => client.from('app_settings').select('*'),
      get: (key: string) =>
        client.from('app_settings').select('value').eq('key', key).single(),
      set: (key: string, value: string) =>
        client.from('app_settings').upsert({ key, value }),
    },
  }
}
