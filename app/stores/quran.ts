/**
 * quran store — caches read-only master data from three tables:
 *   - quran_verses       (6,236 rows)
 *   - surah_weights      (114 rows)
 *   - hijri_daily_targets (122 rows, days 1-30)
 *
 * All three tables are fetched once via loadAll() and held in memory for the
 * lifetime of the app session. Getters query the in-memory arrays so that
 * consumers (e.g. sessions store's saveSession) never need an extra round-trip.
 *
 * This store must be initialised (loadAll called) before saveSession() in
 * sessions.ts is invoked.
 *
 * All Supabase access goes through the useSupabase() composable — never a
 * direct import of the Supabase client.
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { QuranVerse, SurahWeight, HijriDailyTarget } from '~/types/database'

export const useQuranStore = defineStore('quran', () => {
  // Initialise Supabase helpers once at store setup time (safe for Nuxt composables)
  const {
    quranVerses: quranVersesApi,
    surahWeights: surahWeightsApi,
    hijriDailyTargets: hijriDailyTargetsApi,
  } = useSupabase()

  // ── Reactive state ─────────────────────────────────────────────────────────

  /** All 6,236 Quran verses, ordered by id */
  const verses = ref<QuranVerse[]>([])

  /** 114 surah weight entries, ordered by surah */
  const surahWeights = ref<SurahWeight[]>([])

  /** Hijri daily target entries (days 1-30), ordered by hijri_day, sort_order */
  const hijriTargets = ref<HijriDailyTarget[]>([])

  /** True while any async operation is in flight */
  const loading = ref<boolean>(false)

  /** Last error message, or null if no error */
  const error = ref<string | null>(null)

  /** True once loadAll() has completed successfully */
  const initialized = ref<boolean>(false)

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Fetch all rows from `quran_verses`, ordered by `id`.
   * Populates the reactive `verses` list.
   */
  async function loadVerses(): Promise<void> {
    const { data, error: sbError } = await quranVersesApi.getAll()
    if (sbError) throw sbError
    verses.value = data ?? []
  }

  /**
   * Fetch all rows from `surah_weights`, ordered by `surah`.
   * Populates the reactive `surahWeights` list.
   */
  async function loadSurahWeights(): Promise<void> {
    const { data, error: sbError } = await surahWeightsApi.getAll()
    if (sbError) throw sbError
    surahWeights.value = data ?? []
  }

  /**
   * Fetch all rows from `hijri_daily_targets`, ordered by `hijri_day, sort_order`.
   * Populates the reactive `hijriTargets` list.
   */
  async function loadHijriTargets(): Promise<void> {
    const { data, error: sbError } = await hijriDailyTargetsApi.getAll()
    if (sbError) throw sbError
    hijriTargets.value = data ?? []
  }

  /**
   * Fetch all three master-data tables in parallel.
   * Sets `initialized = true` on success.
   * Guard: skips execution if already initialized.
   *
   * Call this once on app mount (e.g. in app.vue or a plugin) before any
   * store that depends on verse data (sessions store's saveSession).
   */
  async function loadAll(): Promise<void> {
    if (initialized.value) return

    loading.value = true
    error.value = null
    try {
      await Promise.all([
        loadVerses(),
        loadSurahWeights(),
        loadHijriTargets(),
      ])
      initialized.value = true
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load Quran data'
    }
    finally {
      loading.value = false
    }
  }

  // ── Computed / getters ─────────────────────────────────────────────────────

  /**
   * Returns all verses WHERE id >= startId AND id <= endId.
   * Used by sessions store's saveSession to fan out verse_activity_log rows.
   *
   * Runs entirely in-memory against the cached `verses` array — no DB call.
   */
  function getVerseRange(startId: number, endId: number): QuranVerse[] {
    return verses.value.filter(v => v.id >= startId && v.id <= endId)
  }

  /**
   * Returns the weight for a given surah number.
   * Falls back to 1.0 if the surah is not found in the cached list.
   *
   * Used by sessions store's saveSession to compute tilawah scores.
   */
  function getSurahWeight(surah: number): number {
    const found = surahWeights.value.find(w => w.surah === surah)
    return found?.weight ?? 1.0
  }

  /**
   * Returns all HijriDailyTarget entries for a given Hijri day (1-30).
   * Multiple entries per day are possible (multiple surahs on the same day).
   */
  function getHijriTargets(hijriDay: number): HijriDailyTarget[] {
    return hijriTargets.value.filter(t => t.hijri_day === hijriDay)
  }

  /**
   * Returns all verses for a given surah, sorted by verse number (ascending).
   */
  function versesBySurah(surah: number): QuranVerse[] {
    return verses.value
      .filter(v => v.surah === surah)
      .sort((a, b) => a.verse - b.verse)
  }

  /**
   * Returns all verses in a given juz.
   */
  function versesByJuz(juz: number): QuranVerse[] {
    return verses.value.filter(v => v.juz === juz)
  }

  /**
   * Returns all verses on a given page.
   */
  function versesByPage(page: number): QuranVerse[] {
    return verses.value.filter(v => v.page === page)
  }

  return {
    // state
    verses,
    surahWeights,
    hijriTargets,
    loading,
    error,
    initialized,
    // actions
    loadAll,
    loadVerses,
    loadSurahWeights,
    loadHijriTargets,
    // getters
    getVerseRange,
    getSurahWeight,
    getHijriTargets,
    versesBySurah,
    versesByJuz,
    versesByPage,
  }
})
