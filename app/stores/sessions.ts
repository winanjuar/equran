/**
 * sessions store — manages session history and the write path for new
 * tracking sessions (sessions → entries → verse_activity_log).
 *
 * Critical write path (saveSession):
 * 1. Insert session row
 * 2. For each entry: insert session_entry row
 * 3. For each entry: compute verse scores and bulk-insert verse_activity_log
 *
 * History reads use a single nested Supabase query (sessions + books +
 * session_entries) to avoid N+1 round-trips.
 *
 * Verse range data and surah weights come from useQuranStore() (task 4.4).
 * All Supabase access goes through the useSupabase() composable.
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useQuranStore } from '~/stores/quran'
import type { Session, SessionEntry, SessionType, Book } from '~/types/database'

// ── Public types ───────────────────────────────────────────────────────────────

export interface SessionWithEntries {
  session: Session
  entries: SessionEntry[]
  book?: Book | null
}

export interface CreateSessionInput {
  type: SessionType
  book_id: string | null
  date: string          // ISO date string (YYYY-MM-DD)
  hijri_day: number
  hijri_month: number
  hijri_year: number
  notes: string | null
}

export interface CreateEntryInput {
  start_verse_id: number
  end_verse_id: number
  repetitions: number   // must be ≥ 1 (DB CHECK constraint)
}

// ── Internal helper type for nested Supabase query results ─────────────────────

/**
 * Shape returned by `.select('*, books(*), session_entries(*)')` on sessions.
 * Typed manually to avoid Supabase generics inference complexity.
 */
interface SessionQueryRow {
  id: string
  type: SessionType
  book_id: string | null
  date: string
  hijri_day: number
  hijri_month: number
  hijri_year: number
  notes: string | null
  created_at: string
  books: Book | null
  session_entries: SessionEntry[]
}

// ── Store ──────────────────────────────────────────────────────────────────────

export const useSessionsStore = defineStore('sessions', () => {
  // Supabase helpers — initialised once at store setup time
  const { client, sessions: sessionsApi } = useSupabase()

  // ── Reactive state ─────────────────────────────────────────────────────────

  /** Full session list, populated by fetchHistory */
  const sessions = ref<SessionWithEntries[]>([])

  /** Last 5 sessions for the dashboard, populated by fetchRecent */
  const recentSessions = ref<SessionWithEntries[]>([])

  /** True while any async operation is in flight */
  const loading = ref<boolean>(false)

  /** Last error message, or null when clean */
  const error = ref<string | null>(null)

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Maps a raw nested Supabase row (session + books + session_entries)
   * to the SessionWithEntries shape consumed by the UI.
   */
  function mapRow(row: SessionQueryRow): SessionWithEntries {
    return {
      session: {
        id: row.id,
        type: row.type,
        book_id: row.book_id,
        date: row.date,
        hijri_day: row.hijri_day,
        hijri_month: row.hijri_month,
        hijri_year: row.hijri_year,
        notes: row.notes,
        created_at: row.created_at,
      },
      entries: row.session_entries ?? [],
      book: row.books,
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Fetch session history, most recent first, with optional filters.
   * Uses a single nested query to load sessions, their entries, and book info.
   * Populates the reactive `sessions` list.
   *
   * @param filters.type     — limit to a single session type
   * @param filters.dateFrom — lower bound on `date` (ISO string)
   * @param filters.dateTo   — upper bound on `date` (ISO string)
   */
  async function fetchHistory(filters?: {
    type?: SessionType
    dateFrom?: string
    dateTo?: string
  }): Promise<void> {
    loading.value = true
    error.value = null
    try {
      let query = client
        .from('sessions')
        .select('*, books(*), session_entries(*)')
        .order('created_at', { ascending: false })

      if (filters?.type) query = query.eq('type', filters.type)
      if (filters?.dateFrom) query = query.gte('date', filters.dateFrom)
      if (filters?.dateTo) query = query.lte('date', filters.dateTo)

      const { data, error: sbError } = await query
      if (sbError) throw sbError

      sessions.value = (data ?? []).map(row => mapRow(row as unknown as SessionQueryRow))
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch history'
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Fetch the 5 most recent sessions for the dashboard.
   * Populates the reactive `recentSessions` list.
   */
  async function fetchRecent(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { data, error: sbError } = await client
        .from('sessions')
        .select('*, books(*), session_entries(*)')
        .order('created_at', { ascending: false })
        .limit(5)

      if (sbError) throw sbError

      recentSessions.value = (data ?? []).map(row => mapRow(row as unknown as SessionQueryRow))
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch recent sessions'
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Save a full session with its entries and verse activity logs.
   *
   * Order of operations (FK constraints enforce this order):
   * 1. Insert session row → obtain session.id
   * 2. For each CreateEntryInput:
   *    a. Insert session_entry row → obtain entry.id
   *    b. Fetch verse range from the quran store cache
   *    c. Compute per-verse score:
   *         Tilawah  → repetitions × surahWeight[verse.surah]
   *         Others   → repetitions
   *    d. Bulk-insert verse_activity_log rows for all verses in range
   *
   * On any failure the error ref is set and the function stops early.
   * Partial cleanup is not attempted (MVP); DB cascade handles it if the
   * session is later deleted.
   *
   * Requires useQuranStore() (task 4.4) to be initialised before calling.
   */
  async function saveSession(
    sessionData: CreateSessionInput,
    entries: CreateEntryInput[],
  ): Promise<void> {
    loading.value = true
    error.value = null

    // Access quranStore inside the action — avoids module circular-dependency
    // risks and defers resolution until the store is needed.
    // NOTE: requires stores/quran.ts (task 4.4) to be initialised first.
    const quranStore = useQuranStore()

    try {
      // ── 1. Insert session ──────────────────────────────────────────────────
      const { data: savedSession, error: sessionError } = await sessionsApi.create(sessionData)
      if (sessionError) throw sessionError
      if (!savedSession) throw new Error('Session insert returned no data')

      // ── 2. Process each entry ──────────────────────────────────────────────
      for (const entry of entries) {
        // 2a. Insert session_entry
        const { data: savedEntry, error: entryError } = await client
          .from('session_entries')
          .insert({
            session_id: savedSession.id,
            start_verse_id: entry.start_verse_id,
            end_verse_id: entry.end_verse_id,
            repetitions: entry.repetitions,
          })
          .select()
          .single()

        if (entryError) throw entryError
        if (!savedEntry) throw new Error('Session entry insert returned no data')

        // 2b. Get all verses in this range from the quran store cache
        const verses = quranStore.getVerseRange(entry.start_verse_id, entry.end_verse_id)

        // 2c & 2d. Compute scores and bulk-insert verse_activity_log
        if (verses.length > 0) {
          const logs = verses.map(verse => ({
            session_id: savedSession.id,
            session_entry_id: savedEntry.id,
            verse_id: verse.id,
            session_type: sessionData.type,
            session_date: sessionData.date,
            score: sessionData.type === 'tilawah'
              ? entry.repetitions * quranStore.getSurahWeight(verse.surah)
              : entry.repetitions,
          }))

          const { error: logError } = await client
            .from('verse_activity_log')
            .insert(logs)

          if (logError) throw logError
        }
      }
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save session'
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Delete a session by id.
   * The DB cascade removes its session_entries and verse_activity_log rows.
   * The session is also removed from both local lists.
   */
  async function deleteSession(id: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { error: sbError } = await sessionsApi.delete(id)
      if (sbError) throw sbError

      // Sync local state immediately — no re-fetch needed
      sessions.value = sessions.value.filter(s => s.session.id !== id)
      recentSessions.value = recentSessions.value.filter(s => s.session.id !== id)
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete session'
    }
    finally {
      loading.value = false
    }
  }

  return {
    // state
    sessions,
    recentSessions,
    loading,
    error,
    // actions
    fetchHistory,
    fetchRecent,
    saveSession,
    deleteSession,
  }
})
