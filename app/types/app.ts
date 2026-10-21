import type { SessionType } from './database'

// ── Range Input Modes ────────────────────────────────────────
// REQ-3.1: 7 range selection modes

export type RangeMode =
  | 'by_surah'
  | 'by_juz'
  | 'by_juz_hizb'
  | 'by_ruku'
  | 'by_page'
  | 'by_verse'
  | 'by_hijri_day'

// Resolved range: a pair of verse IDs (inclusive)
export interface VerseRange {
  start_verse_id: number
  end_verse_id: number
}

// A single range entry as the user builds it in the form
export interface RangeEntry {
  range: VerseRange
  repetitions: number
}

// ── Heatmap ──────────────────────────────────────────────────
// REQ-8.2: segmentation options

export type SegmentationType =
  | 'verse'    // 6,236 segments
  | 'ruku'
  | 'page'
  | 'hizb'
  | 'juz'      // 30 segments
  | 'surah'    // 114 segments
  | 'day'      // 30 segments — Hijri day 1-30 (based on hijri_daily_targets schedule)

// REQ-8.4: Time range presets
export type TimeRangePreset = '7d' | '30d' | '3m' | '1y' | 'custom'

export interface DateRange {
  from: string   // ISO date string
  to: string     // ISO date string
}

// One segment cell in the heatmap grid
export interface HeatMapSegment {
  id: number          // segment identifier (verse_id, juz number, surah number, hijri_day, etc.)
  label: string       // display label (e.g. "Al-Fatihah", "Juz 1", "Hari 15")
  score: number       // aggregated score (0 = no activity)
  intensity: 0 | 1 | 2 | 3 | 4 | 5  // 0 = grey/inactive, 1-5 = color levels
}

export interface HeatMapConfig {
  type: SessionType
  segmentation: SegmentationType
  dateRange: DateRange
}

// ── Location ─────────────────────────────────────────────────
// REQ-5.4

export type LocationMode = 'gps' | 'manual'

export interface Location {
  latitude: number
  longitude: number
  cityName?: string
}

// ── Hijri Date ───────────────────────────────────────────────
export interface HijriDate {
  day: number
  month: number
  year: number
  monthName: string
}

// ── Settings ─────────────────────────────────────────────────
export interface AppSettings {
  hijriOffset: -1 | 0 | 1      // REQ-5.5
  locationMode: LocationMode
  latitude: number
  longitude: number
  cityName: string
}
