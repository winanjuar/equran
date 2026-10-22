/**
 * utils/quran.ts
 *
 * Range resolver for all 7 Quran input modes (REQ-3.1, REQ-3.2, REQ-2.2).
 * All resolvers operate entirely on a cached `QuranVerse[]` array so they work
 * both online and offline without any Supabase round-trips.
 */

import type { QuranVerse } from '../types/database'
import type { VerseRange } from '../types/app'

// ── Typed params for each mode ────────────────────────────────────────────────
// Embedding `mode` as a discriminant makes the union exhaustive and lets the
// compiler narrow to the right param shape in `resolveRange`.

export interface BySurahParams {
  mode: 'by_surah'
  /** Surah number, 1–114 */
  surah: number
}

export interface ByJuzParams {
  mode: 'by_juz'
  /** Juz number, 1–30 */
  juz: number
}

export interface ByJuzHizbParams {
  mode: 'by_juz_hizb'
  /** Juz number, 1–30 */
  juz: number
  /** Half of the juz: 1 (first hizb) or 2 (second hizb) — REQ-2.2 */
  hizb_in_juz: 1 | 2
}

export interface ByRukuParams {
  mode: 'by_ruku'
  /** Surah number, 1–114 */
  surah: number
  /** Ruku number relative to the surah (not absolute) — REQ-2.2 */
  ruku_in_surah: number
}

export interface ByPageParams {
  mode: 'by_page'
  /** Mushaf Madinah page number, 1–604 */
  page: number
}

export interface ByVerseParams {
  mode: 'by_verse'
  /** Surah number, 1–114 */
  surah: number
  /** First verse number (inclusive) */
  startVerse: number
  /** Last verse number (inclusive) */
  endVerse: number
}

/**
 * Union of all param shapes for modes 1–6.
 * Mode 7 (ByHijriDay) uses its own dedicated function because it returns
 * multiple ranges instead of a single one.
 */
export type RangeParams =
  | BySurahParams
  | ByJuzParams
  | ByJuzHizbParams
  | ByRukuParams
  | ByPageParams
  | ByVerseParams

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract the min/max verse id from a filtered subset. Returns null if empty. */
function toRange(filtered: QuranVerse[]): VerseRange | null {
  if (filtered.length === 0) return null
  let minId = filtered[0].id
  let maxId = filtered[0].id
  for (const v of filtered) {
    if (v.id < minId) minId = v.id
    if (v.id > maxId) maxId = v.id
  }
  return { start_verse_id: minId, end_verse_id: maxId }
}

// ── Individual resolvers ───────────────────────────────────────────────────────

/**
 * Mode 1 — By Surah
 * Returns the id of the first and last verse of the given surah.
 */
export function resolveBySurah(surah: number, verses: QuranVerse[]): VerseRange | null {
  return toRange(verses.filter(v => v.surah === surah))
}

/**
 * Mode 2 — By Juz
 * Returns the id of the first and last verse in the given juz.
 */
export function resolveByJuz(juz: number, verses: QuranVerse[]): VerseRange | null {
  return toRange(verses.filter(v => v.juz === juz))
}

/**
 * Mode 3 — By Juz + Hizb (REQ-2.2)
 * Returns the first/last verse id filtered by juz AND hizb_in_juz (1 or 2).
 * `hizb_in_juz` is the relative hizb position within a juz, not the absolute hizb.
 */
export function resolveByJuzHizb(
  juz: number,
  hizb_in_juz: 1 | 2,
  verses: QuranVerse[]
): VerseRange | null {
  return toRange(verses.filter(v => v.juz === juz && v.hizb_in_juz === hizb_in_juz))
}

/**
 * Mode 4 — By Ruku' (REQ-2.2)
 * Returns the first/last verse id filtered by surah AND ruku_in_surah.
 * `ruku_in_surah` is the ruku counter reset per surah (relative, not absolute).
 */
export function resolveByRuku(
  surah: number,
  ruku_in_surah: number,
  verses: QuranVerse[]
): VerseRange | null {
  return toRange(verses.filter(v => v.surah === surah && v.ruku_in_surah === ruku_in_surah))
}

/**
 * Mode 5 — By Page
 * Returns the first/last verse id on a given Mushaf Madinah page (1–604).
 */
export function resolveByPage(page: number, verses: QuranVerse[]): VerseRange | null {
  return toRange(verses.filter(v => v.page === page))
}

/**
 * Mode 6 — By Verse
 * Returns the first/last verse id for verses in `surah` where
 * `verse` is between `startVerse` and `endVerse` (both inclusive).
 */
export function resolveByVerse(
  surah: number,
  startVerse: number,
  endVerse: number,
  verses: QuranVerse[]
): VerseRange | null {
  return toRange(
    verses.filter(v => v.surah === surah && v.verse >= startVerse && v.verse <= endVerse)
  )
}

/**
 * Mode 7 — By Hijri Day (Tilawah only — REQ-3.2)
 *
 * Caller is responsible for fetching the surah list for the target hijri_day
 * from `hijri_daily_targets` (sorted by `sort_order`). This function then
 * resolves each surah to its full verse range and returns an ordered array.
 *
 * Surahs with no matching verses in the cache are silently skipped so offline
 * partial caches degrade gracefully.
 *
 * Returns an empty array if `surahList` is empty or no verses match.
 */
export function resolveByHijriDay(
  surahList: number[],
  verses: QuranVerse[]
): VerseRange[] {
  const ranges: VerseRange[] = []
  for (const surah of surahList) {
    const range = resolveBySurah(surah, verses)
    if (range !== null) ranges.push(range)
  }
  return ranges
}

// ── Unified dispatcher (modes 1–6) ───────────────────────────────────────────

/**
 * Resolves a single range from modes 1–6.
 *
 * For mode 7 (by_hijri_day) use `resolveByHijriDay()` directly — it returns
 * `VerseRange[]` instead of a single nullable range.
 *
 * Returns `null` when:
 * - The params describe a combination that has no matching verses
 * - The `verses` cache is empty
 *
 * Example:
 * ```ts
 * const range = resolveRange({ mode: 'by_surah', surah: 1 }, verses)
 * // → { start_verse_id: 1, end_verse_id: 7 }
 * ```
 */
export function resolveRange(params: RangeParams, verses: QuranVerse[]): VerseRange | null {
  switch (params.mode) {
    case 'by_surah':
      return resolveBySurah(params.surah, verses)

    case 'by_juz':
      return resolveByJuz(params.juz, verses)

    case 'by_juz_hizb':
      return resolveByJuzHizb(params.juz, params.hizb_in_juz, verses)

    case 'by_ruku':
      return resolveByRuku(params.surah, params.ruku_in_surah, verses)

    case 'by_page':
      return resolveByPage(params.page, verses)

    case 'by_verse':
      return resolveByVerse(params.surah, params.startVerse, params.endVerse, verses)

    default: {
      // Exhaustiveness guard — TypeScript will flag unhandled `mode` values here
      const _exhaustive: never = params
      return null
    }
  }
}
