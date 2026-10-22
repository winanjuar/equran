/**
 * Unit tests for utils/quran.ts
 *
 * Each of the 7 range modes is verified against a minimal but realistic
 * synthetic verse dataset that exercises every filter path.
 */

import { describe, it, expect } from 'vitest'
import type { QuranVerse } from '../types/database'
import {
  resolveBySurah,
  resolveByJuz,
  resolveByJuzHizb,
  resolveByRuku,
  resolveByPage,
  resolveByVerse,
  resolveByHijriDay,
  resolveRange,
} from './quran'

// ── Test dataset ──────────────────────────────────────────────────────────────
//
// Two surahs:
//
//  Surah 1 (7 verses, ids 1-7)
//    page=1, juz=1, hizb=1, hizb_in_juz=1, ruku=1, ruku_in_surah=1
//
//  Surah 2 (9 verses, ids 8-16) — spread across two juz and two hizb halves
//    ids  8-10: juz=1, hizb_in_juz=1, ruku_in_surah=1, page=1
//    ids 11-12: juz=1, hizb_in_juz=2, ruku_in_surah=2, page=2
//    ids 13-14: juz=2, hizb_in_juz=1, ruku_in_surah=3, page=3
//    ids 15-16: juz=2, hizb_in_juz=2, ruku_in_surah=4, page=4

const verses: QuranVerse[] = [
  // Surah 1
  { id: 1, surah: 1, surah_name: 'Al-Fatihah', verse: 1, page: 1, juz: 1, hizb: 1, hizb_in_juz: 1, ruku: 1, ruku_in_surah: 1 },
  { id: 2, surah: 1, surah_name: 'Al-Fatihah', verse: 2, page: 1, juz: 1, hizb: 1, hizb_in_juz: 1, ruku: 1, ruku_in_surah: 1 },
  { id: 3, surah: 1, surah_name: 'Al-Fatihah', verse: 3, page: 1, juz: 1, hizb: 1, hizb_in_juz: 1, ruku: 1, ruku_in_surah: 1 },
  { id: 4, surah: 1, surah_name: 'Al-Fatihah', verse: 4, page: 1, juz: 1, hizb: 1, hizb_in_juz: 1, ruku: 1, ruku_in_surah: 1 },
  { id: 5, surah: 1, surah_name: 'Al-Fatihah', verse: 5, page: 1, juz: 1, hizb: 1, hizb_in_juz: 1, ruku: 1, ruku_in_surah: 1 },
  { id: 6, surah: 1, surah_name: 'Al-Fatihah', verse: 6, page: 1, juz: 1, hizb: 1, hizb_in_juz: 1, ruku: 1, ruku_in_surah: 1 },
  { id: 7, surah: 1, surah_name: 'Al-Fatihah', verse: 7, page: 1, juz: 1, hizb: 1, hizb_in_juz: 1, ruku: 1, ruku_in_surah: 1 },
  // Surah 2 — juz=1, hizb_in_juz=1, ruku_in_surah=1, page=1
  { id: 8,  surah: 2, surah_name: 'Al-Baqarah', verse: 1, page: 1, juz: 1, hizb: 1, hizb_in_juz: 1, ruku: 2, ruku_in_surah: 1 },
  { id: 9,  surah: 2, surah_name: 'Al-Baqarah', verse: 2, page: 1, juz: 1, hizb: 1, hizb_in_juz: 1, ruku: 2, ruku_in_surah: 1 },
  { id: 10, surah: 2, surah_name: 'Al-Baqarah', verse: 3, page: 1, juz: 1, hizb: 1, hizb_in_juz: 1, ruku: 2, ruku_in_surah: 1 },
  // Surah 2 — juz=1, hizb_in_juz=2, ruku_in_surah=2, page=2
  { id: 11, surah: 2, surah_name: 'Al-Baqarah', verse: 4, page: 2, juz: 1, hizb: 2, hizb_in_juz: 2, ruku: 3, ruku_in_surah: 2 },
  { id: 12, surah: 2, surah_name: 'Al-Baqarah', verse: 5, page: 2, juz: 1, hizb: 2, hizb_in_juz: 2, ruku: 3, ruku_in_surah: 2 },
  // Surah 2 — juz=2, hizb_in_juz=1, ruku_in_surah=3, page=3
  { id: 13, surah: 2, surah_name: 'Al-Baqarah', verse: 6, page: 3, juz: 2, hizb: 3, hizb_in_juz: 1, ruku: 4, ruku_in_surah: 3 },
  { id: 14, surah: 2, surah_name: 'Al-Baqarah', verse: 7, page: 3, juz: 2, hizb: 3, hizb_in_juz: 1, ruku: 4, ruku_in_surah: 3 },
  // Surah 2 — juz=2, hizb_in_juz=2, ruku_in_surah=4, page=4
  { id: 15, surah: 2, surah_name: 'Al-Baqarah', verse: 8, page: 4, juz: 2, hizb: 4, hizb_in_juz: 2, ruku: 5, ruku_in_surah: 4 },
  { id: 16, surah: 2, surah_name: 'Al-Baqarah', verse: 9, page: 4, juz: 2, hizb: 4, hizb_in_juz: 2, ruku: 5, ruku_in_surah: 4 },
]

// ── Mode 1: By Surah ──────────────────────────────────────────────────────────

describe('resolveBySurah', () => {
  it('returns the first and last verse id of surah 1', () => {
    expect(resolveBySurah(1, verses)).toEqual({ start_verse_id: 1, end_verse_id: 7 })
  })

  it('returns the first and last verse id of surah 2', () => {
    expect(resolveBySurah(2, verses)).toEqual({ start_verse_id: 8, end_verse_id: 16 })
  })

  it('returns null for a surah not in the cache', () => {
    expect(resolveBySurah(999, verses)).toBeNull()
  })

  it('returns null for an empty verse array', () => {
    expect(resolveBySurah(1, [])).toBeNull()
  })
})

// ── Mode 2: By Juz ───────────────────────────────────────────────────────────

describe('resolveByJuz', () => {
  it('returns the first and last verse id of juz 1', () => {
    // juz=1 contains ids 1-12 (surah 1 full + first two sections of surah 2)
    expect(resolveByJuz(1, verses)).toEqual({ start_verse_id: 1, end_verse_id: 12 })
  })

  it('returns the first and last verse id of juz 2', () => {
    // juz=2 contains ids 13-16
    expect(resolveByJuz(2, verses)).toEqual({ start_verse_id: 13, end_verse_id: 16 })
  })

  it('returns null for a juz not in the cache', () => {
    expect(resolveByJuz(30, verses)).toBeNull()
  })
})

// ── Mode 3: By Juz + Hizb ────────────────────────────────────────────────────

describe('resolveByJuzHizb', () => {
  it('returns the correct range for juz=1, hizb_in_juz=1', () => {
    // ids 1-7 (surah 1) and ids 8-10 (surah 2, section 1) share juz=1, hizb_in_juz=1
    expect(resolveByJuzHizb(1, 1, verses)).toEqual({ start_verse_id: 1, end_verse_id: 10 })
  })

  it('returns the correct range for juz=1, hizb_in_juz=2', () => {
    // ids 11-12 are juz=1, hizb_in_juz=2
    expect(resolveByJuzHizb(1, 2, verses)).toEqual({ start_verse_id: 11, end_verse_id: 12 })
  })

  it('returns the correct range for juz=2, hizb_in_juz=1', () => {
    expect(resolveByJuzHizb(2, 1, verses)).toEqual({ start_verse_id: 13, end_verse_id: 14 })
  })

  it('returns the correct range for juz=2, hizb_in_juz=2', () => {
    expect(resolveByJuzHizb(2, 2, verses)).toEqual({ start_verse_id: 15, end_verse_id: 16 })
  })

  it('returns null when the juz+hizb combination is not found', () => {
    expect(resolveByJuzHizb(30, 1, verses)).toBeNull()
  })
})

// ── Mode 4: By Ruku' ─────────────────────────────────────────────────────────

describe('resolveByRuku', () => {
  it('returns the full ruku range for surah 1, ruku_in_surah=1', () => {
    expect(resolveByRuku(1, 1, verses)).toEqual({ start_verse_id: 1, end_verse_id: 7 })
  })

  it('returns the correct range for surah 2, ruku_in_surah=1', () => {
    // ids 8-10 are surah=2, ruku_in_surah=1
    expect(resolveByRuku(2, 1, verses)).toEqual({ start_verse_id: 8, end_verse_id: 10 })
  })

  it('returns the correct range for surah 2, ruku_in_surah=2', () => {
    // ids 11-12
    expect(resolveByRuku(2, 2, verses)).toEqual({ start_verse_id: 11, end_verse_id: 12 })
  })

  it('returns the correct range for surah 2, ruku_in_surah=4', () => {
    expect(resolveByRuku(2, 4, verses)).toEqual({ start_verse_id: 15, end_verse_id: 16 })
  })

  it('returns null for a ruku_in_surah that does not exist', () => {
    expect(resolveByRuku(2, 99, verses)).toBeNull()
  })

  it('does not mix ruku_in_surah values across different surahs', () => {
    // ruku_in_surah=1 for surah 1 should not include surah 2's ruku 1
    const range = resolveByRuku(1, 1, verses)
    expect(range?.end_verse_id).toBe(7)
  })
})

// ── Mode 5: By Page ───────────────────────────────────────────────────────────

describe('resolveByPage', () => {
  it('returns the first and last verse id on page 1', () => {
    // page=1: ids 1-10 (surah 1 all 7 verses + surah 2 verses 1-3)
    expect(resolveByPage(1, verses)).toEqual({ start_verse_id: 1, end_verse_id: 10 })
  })

  it('returns the correct range for page 2', () => {
    // page=2: ids 11-12
    expect(resolveByPage(2, verses)).toEqual({ start_verse_id: 11, end_verse_id: 12 })
  })

  it('returns the correct range for page 4', () => {
    // page=4: ids 15-16
    expect(resolveByPage(4, verses)).toEqual({ start_verse_id: 15, end_verse_id: 16 })
  })

  it('returns null for a page not present in the cache', () => {
    expect(resolveByPage(999, verses)).toBeNull()
  })
})

// ── Mode 6: By Verse ──────────────────────────────────────────────────────────

describe('resolveByVerse', () => {
  it('returns the full surah when startVerse=1 and endVerse=last', () => {
    expect(resolveByVerse(1, 1, 7, verses)).toEqual({ start_verse_id: 1, end_verse_id: 7 })
  })

  it('returns a sub-range within a surah', () => {
    // Surah 2, verse 2-4 → ids 9, 10, 11
    expect(resolveByVerse(2, 2, 4, verses)).toEqual({ start_verse_id: 9, end_verse_id: 11 })
  })

  it('returns a single verse when startVerse equals endVerse', () => {
    // Surah 2, verse 3 → id 10
    expect(resolveByVerse(2, 3, 3, verses)).toEqual({ start_verse_id: 10, end_verse_id: 10 })
  })

  it('returns null for a surah not in the cache', () => {
    expect(resolveByVerse(999, 1, 3, verses)).toBeNull()
  })

  it('returns null when the verse range is outside the surah', () => {
    // Surah 1 only has verses 1-7; asking for 8-10 returns null
    expect(resolveByVerse(1, 8, 10, verses)).toBeNull()
  })
})

// ── Mode 7: By Hijri Day ──────────────────────────────────────────────────────

describe('resolveByHijriDay', () => {
  it('resolves a single surah list to one range', () => {
    expect(resolveByHijriDay([1], verses)).toEqual([
      { start_verse_id: 1, end_verse_id: 7 },
    ])
  })

  it('resolves multiple surahs to multiple ranges in order', () => {
    expect(resolveByHijriDay([1, 2], verses)).toEqual([
      { start_verse_id: 1, end_verse_id: 7 },
      { start_verse_id: 8, end_verse_id: 16 },
    ])
  })

  it('returns an empty array for an empty surah list', () => {
    expect(resolveByHijriDay([], verses)).toEqual([])
  })

  it('skips surahs not present in the verse cache', () => {
    // surah 999 is not in the dataset; it should be silently skipped
    expect(resolveByHijriDay([999], verses)).toEqual([])
  })

  it('skips missing surahs and keeps valid ones', () => {
    expect(resolveByHijriDay([999, 1], verses)).toEqual([
      { start_verse_id: 1, end_verse_id: 7 },
    ])
  })
})

// ── resolveRange dispatcher ────────────────────────────────────────────────────

describe('resolveRange', () => {
  it('dispatches by_surah correctly', () => {
    expect(resolveRange({ mode: 'by_surah', surah: 1 }, verses))
      .toEqual({ start_verse_id: 1, end_verse_id: 7 })
  })

  it('dispatches by_juz correctly', () => {
    expect(resolveRange({ mode: 'by_juz', juz: 2 }, verses))
      .toEqual({ start_verse_id: 13, end_verse_id: 16 })
  })

  it('dispatches by_juz_hizb correctly', () => {
    expect(resolveRange({ mode: 'by_juz_hizb', juz: 1, hizb_in_juz: 2 }, verses))
      .toEqual({ start_verse_id: 11, end_verse_id: 12 })
  })

  it('dispatches by_ruku correctly', () => {
    expect(resolveRange({ mode: 'by_ruku', surah: 2, ruku_in_surah: 3 }, verses))
      .toEqual({ start_verse_id: 13, end_verse_id: 14 })
  })

  it('dispatches by_page correctly', () => {
    expect(resolveRange({ mode: 'by_page', page: 3 }, verses))
      .toEqual({ start_verse_id: 13, end_verse_id: 14 })
  })

  it('dispatches by_verse correctly', () => {
    expect(resolveRange({ mode: 'by_verse', surah: 1, startVerse: 3, endVerse: 5 }, verses))
      .toEqual({ start_verse_id: 3, end_verse_id: 5 })
  })

  it('returns null when the mode produces no matching verses', () => {
    expect(resolveRange({ mode: 'by_surah', surah: 999 }, verses)).toBeNull()
  })
})
