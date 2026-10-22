/**
 * utils/heatmap.ts
 *
 * Heat map scoring, aggregation, normalization, and color utilities.
 *
 * Design refs: Section 7 (Heat Map Scoring), REQ-6.1–6.6, REQ-8.1–8.4
 *
 * Architecture note: this file contains PURE functions only.
 * No Supabase client is imported here — query execution belongs in
 * composables/stores. This module handles:
 *   1. Score computation  — for the session write path
 *   2. Client-side aggregation — for grouping raw log rows by segmentation
 *   3. Intensity normalization — mapping raw scores → 0–5 levels
 *   4. Color class helpers — mapping (type, intensity) → TailwindCSS classes
 */

import type { SessionType } from '~/types/database'

// ─────────────────────────────────────────────────────────────────────────────
// Re-exported type (primary export point for consumers of heatmap utils)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One rendered cell in the heat map grid.
 * `id` identifies the segment (verse_id, juz number, surah number, hijri_day, …).
 */
export interface HeatMapSegment {
  id: number          // segment identifier (verse_id, juz, surah, ruku, page, hijri_day…)
  label: string       // display name (e.g. "Al-Fatihah", "Juz 1", "Hari 15")
  score: number       // raw aggregated score (0 = no activity)
  intensity: 0 | 1 | 2 | 3 | 4 | 5  // 0 = grey/inactive, 1–5 = color levels
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Score Computation (write path)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the score for a single verse in a session entry.
 *
 * REQ-6.2 / REQ-6.3:
 *   - Tilawah : score = repetitions × surah_weight
 *   - Others  : score = repetitions (weight = 1, ignored)
 *
 * REQ-6.6: the weight is locked at write time — pass the weight that is
 * currently active in `surah_weights`; do NOT re-read it later.
 *
 * @param sessionType  The type of the parent session.
 * @param repetitions  Number of repetitions (≥ 1, enforced by DB CHECK).
 * @param surahWeight  The weight for the verse's surah at session-save time
 *                     (only applied when sessionType === 'tilawah').
 */
export function computeVerseScore(
  sessionType: SessionType,
  repetitions: number,
  surahWeight: number,
): number {
  if (sessionType === 'tilawah') {
    return repetitions * surahWeight
  }
  return repetitions
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Raw query-result row shapes  (for Supabase joins, used in stores)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimal row returned for a **per-ayat** heatmap query.
 * Query: SELECT verse_id, SUM(score) … GROUP BY verse_id
 * (or unfold + aggregate client-side: SELECT verse_id, score …)
 */
export interface VerseActivityRow {
  verse_id: number
  score: number
}

/**
 * Row shape for segmentations that require a quran_verses JOIN
 * (per-juz, per-surah, per-hizb, per-ruku, per-page).
 *
 * PostgREST select example:
 *   .select('verse_id, score, quran_verses!inner(juz, surah, hizb, ruku, page, surah_name)')
 */
export interface VerseActivityWithQuranRow {
  verse_id: number
  score: number
  quran_verses: {
    juz: number
    surah: number
    surah_name: string
    hizb: number
    ruku: number
    page: number
  }
}

/**
 * Row shape for the **per-hari-hijriah** segmentation.
 * Requires a sessions JOIN to retrieve hijri_day.
 *
 * PostgREST select example:
 *   .select('score, sessions!inner(hijri_day)')
 */
export interface VerseActivityWithSessionRow {
  score: number
  sessions: {
    hijri_day: number
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Client-side aggregation helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregate raw verse-activity rows into a score map keyed by verse_id.
 * Use for the "Per Ayat" segmentation.
 */
export function aggregateByVerse(rows: VerseActivityRow[]): Map<number, number> {
  const result = new Map<number, number>()
  for (const row of rows) {
    result.set(row.verse_id, (result.get(row.verse_id) ?? 0) + row.score)
  }
  return result
}

/**
 * Aggregate rows (with quran_verses embedded) by juz (1–30).
 * Use for the "Per Juz" segmentation.
 */
export function aggregateByJuz(rows: VerseActivityWithQuranRow[]): Map<number, number> {
  const result = new Map<number, number>()
  for (const row of rows) {
    const key = row.quran_verses.juz
    result.set(key, (result.get(key) ?? 0) + row.score)
  }
  return result
}

/**
 * Aggregate rows (with quran_verses embedded) by surah (1–114).
 * Use for the "Per Surat" segmentation.
 */
export function aggregateBySurah(rows: VerseActivityWithQuranRow[]): Map<number, number> {
  const result = new Map<number, number>()
  for (const row of rows) {
    const key = row.quran_verses.surah
    result.set(key, (result.get(key) ?? 0) + row.score)
  }
  return result
}

/**
 * Aggregate rows (with quran_verses embedded) by absolute hizb (1–60).
 * Use for the "Per Hizb" segmentation.
 */
export function aggregateByHizb(rows: VerseActivityWithQuranRow[]): Map<number, number> {
  const result = new Map<number, number>()
  for (const row of rows) {
    const key = row.quran_verses.hizb
    result.set(key, (result.get(key) ?? 0) + row.score)
  }
  return result
}

/**
 * Aggregate rows (with quran_verses embedded) by absolute ruku (across all surahs).
 * Use for the "Per Ruku'" segmentation.
 */
export function aggregateByRuku(rows: VerseActivityWithQuranRow[]): Map<number, number> {
  const result = new Map<number, number>()
  for (const row of rows) {
    const key = row.quran_verses.ruku
    result.set(key, (result.get(key) ?? 0) + row.score)
  }
  return result
}

/**
 * Aggregate rows (with quran_verses embedded) by page (1–604, Mushaf Madinah).
 * Use for the "Per Halaman" segmentation.
 */
export function aggregateByPage(rows: VerseActivityWithQuranRow[]): Map<number, number> {
  const result = new Map<number, number>()
  for (const row of rows) {
    const key = row.quran_verses.page
    result.set(key, (result.get(key) ?? 0) + row.score)
  }
  return result
}

/**
 * Aggregate rows (with sessions embedded) by hijri_day (1–30).
 * Use for the "Per Hari Hijriah" segmentation.
 */
export function aggregateByHijriDay(rows: VerseActivityWithSessionRow[]): Map<number, number> {
  const result = new Map<number, number>()
  for (const row of rows) {
    const key = row.sessions.hijri_day
    result.set(key, (result.get(key) ?? 0) + row.score)
  }
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Intensity normalization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize a map of { segmentId → totalScore } to { segmentId → intensityLevel }.
 *
 * Intensity levels (REQ-8.3):
 *   0 = no activity  (score = 0, rendered grey)
 *   1 = lightest      (> 0, up to 20 % of max)
 *   2                 (20–40 % of max)
 *   3                 (40–60 % of max)
 *   4                 (60–80 % of max)
 *   5 = maximum       (> 80 % of max — "5+" in spec language)
 *
 * When there is only one distinct non-zero score (or all non-zero scores are
 * equal) every segment gets level 5 — they all represent maximum activity
 * relative to the dataset.
 *
 * @param scores  Map<segmentId, totalScore> — zeroes are allowed.
 * @returns       Map<segmentId, intensityLevel (0–5)>
 */
export function normalizeIntensity(scores: Map<number, number>): Map<number, number> {
  const result = new Map<number, number>()

  // Find the maximum score in the dataset.
  let maxScore = 0
  for (const score of scores.values()) {
    if (score > maxScore) maxScore = score
  }

  for (const [id, score] of scores) {
    if (score <= 0 || maxScore === 0) {
      result.set(id, 0)
    } else {
      // Proportional bucketing into levels 1–5.
      // Math.ceil ensures that even the smallest positive score gets at least 1.
      const level = Math.min(5, Math.ceil((score / maxScore) * 5)) as 1 | 2 | 3 | 4 | 5
      result.set(id, level)
    }
  }

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Color class helpers (TailwindCSS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Color palette per session type (index = intensity level 0–5).
 *
 * REQ-8.1 color scheme:
 *   Ziyadah   → Hijau  (green)
 *   Murojahah → Biru   (blue)
 *   Tilawah   → Oranye (orange)
 *   Tadabbur  → Ungu   (purple)
 *
 * Level 0 = grey (no activity); levels 1–5 = progressively darker.
 */
const INTENSITY_CLASSES: Record<SessionType, readonly string[]> = {
  ziyadah:   ['bg-gray-100', 'bg-green-200',  'bg-green-400',  'bg-green-600',  'bg-green-700',  'bg-green-900'],
  murojahah: ['bg-gray-100', 'bg-blue-200',   'bg-blue-400',   'bg-blue-600',   'bg-blue-700',   'bg-blue-900'],
  tilawah:   ['bg-gray-100', 'bg-orange-200', 'bg-orange-400', 'bg-orange-600', 'bg-orange-700', 'bg-orange-900'],
  tadabbur:  ['bg-gray-100', 'bg-purple-200', 'bg-purple-400', 'bg-purple-600', 'bg-purple-700', 'bg-purple-900'],
}

/**
 * Return the TailwindCSS background-color class for a given session type and
 * intensity level.
 *
 * Examples:
 *   getIntensityClass('ziyadah',   0) → 'bg-gray-100'   (no activity)
 *   getIntensityClass('ziyadah',   1) → 'bg-green-200'  (lightest green)
 *   getIntensityClass('ziyadah',   5) → 'bg-green-900'  (darkest green)
 *   getIntensityClass('tilawah',   3) → 'bg-orange-600'
 *   getIntensityClass('murojahah', 2) → 'bg-blue-400'
 *   getIntensityClass('tadabbur',  5) → 'bg-purple-900'
 *
 * @param type       Session type (determines the color hue).
 * @param intensity  Intensity level 0–5 (values outside range are clamped).
 */
export function getIntensityClass(type: SessionType, intensity: number): string {
  const palette = INTENSITY_CLASSES[type]
  const clamped = Math.min(5, Math.max(0, Math.round(intensity)))
  return palette[clamped]
}
