// =========================================
// Quran master data
// =========================================

export interface QuranVerse {
  id: number
  page: number
  juz: number
  hizb: number
  hizb_in_juz: number
  ruku: number
  ruku_in_surah: number
  surah: number
  surah_name: string
  verse: number
}

// =========================================
// Per-surah weight (Tilawah only)
// =========================================

export interface SurahWeight {
  surah: number
  surah_name: string
  weight: number
}

// =========================================
// Book / mushaf master data
// =========================================

export interface Book {
  id: string
  name: string
  description: string | null
  created_at: string
}

// =========================================
// Tracking sessions
// =========================================

export type SessionType = 'ziyadah' | 'murojahah' | 'tilawah' | 'tadabbur'

export interface Session {
  id: string
  type: SessionType
  book_id: string | null
  date: string           // ISO date string (YYYY-MM-DD)
  hijri_day: number
  hijri_month: number
  hijri_year: number
  notes: string | null
  created_at: string
}

// =========================================
// Verse range entries per session
// =========================================

export interface SessionEntry {
  id: string
  session_id: string
  start_verse_id: number
  end_verse_id: number
  repetitions: number
  created_at: string
}

// =========================================
// Pre-computed verse-level activity log
// =========================================

export interface VerseActivityLog {
  id: string
  session_id: string
  session_entry_id: string
  verse_id: number
  session_type: SessionType
  session_date: string       // ISO date string
  score: number
  created_at: string
}

// =========================================
// Daily Tilawah targets by Hijri day (1-30)
// =========================================

export interface HijriDailyTarget {
  hijri_day: number
  surah: number
  sort_order: number
}

// =========================================
// Application settings (key-value)
// =========================================

export interface AppSetting {
  key: string
  value: string
}
