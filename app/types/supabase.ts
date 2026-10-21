import type { SessionType } from './database'

// Database type for @nuxtjs/supabase — mirrors 001_initial.sql schema.
// Replace later with: npx supabase gen types typescript --project-id <id>

export type Database = {
  public: {
    Tables: {
      quran_verses: {
        Row: { id: number; page: number; juz: number; hizb: number; hizb_in_juz: number; ruku: number; ruku_in_surah: number; surah: number; surah_name: string; verse: number }
        Insert: { id: number; page: number; juz: number; hizb: number; hizb_in_juz: number; ruku: number; ruku_in_surah: number; surah: number; surah_name: string; verse: number }
        Update: { id?: number; page?: number; juz?: number; hizb?: number; hizb_in_juz?: number; ruku?: number; ruku_in_surah?: number; surah?: number; surah_name?: string; verse?: number }
      }
      surah_weights: {
        Row: { surah: number; surah_name: string; weight: number }
        Insert: { surah: number; surah_name: string; weight?: number }
        Update: { surah?: number; surah_name?: string; weight?: number }
      }
      books: {
        Row: { id: string; name: string; description: string | null; created_at: string }
        Insert: { id?: string; name: string; description?: string | null; created_at?: string }
        Update: { id?: string; name?: string; description?: string | null; created_at?: string }
      }
      sessions: {
        Row: { id: string; type: SessionType; book_id: string | null; date: string; hijri_day: number; hijri_month: number; hijri_year: number; notes: string | null; created_at: string }
        Insert: { id?: string; type: SessionType; book_id?: string | null; date?: string; hijri_day: number; hijri_month: number; hijri_year: number; notes?: string | null; created_at?: string }
        Update: { id?: string; type?: SessionType; book_id?: string | null; date?: string; hijri_day?: number; hijri_month?: number; hijri_year?: number; notes?: string | null; created_at?: string }
      }
      session_entries: {
        Row: { id: string; session_id: string; start_verse_id: number; end_verse_id: number; repetitions: number; created_at: string }
        Insert: { id?: string; session_id: string; start_verse_id: number; end_verse_id: number; repetitions?: number; created_at?: string }
        Update: { id?: string; session_id?: string; start_verse_id?: number; end_verse_id?: number; repetitions?: number; created_at?: string }
      }
      verse_activity_log: {
        Row: { id: string; session_id: string; session_entry_id: string; verse_id: number; session_type: string; session_date: string; score: number; created_at: string }
        Insert: { id?: string; session_id: string; session_entry_id: string; verse_id: number; session_type: string; session_date: string; score: number; created_at?: string }
        Update: { id?: string; session_id?: string; session_entry_id?: string; verse_id?: number; session_type?: string; session_date?: string; score?: number; created_at?: string }
      }
      hijri_daily_targets: {
        Row: { hijri_day: number; surah: number; sort_order: number }
        Insert: { hijri_day: number; surah: number; sort_order?: number }
        Update: { hijri_day?: number; surah?: number; sort_order?: number }
      }
      app_settings: {
        Row: { key: string; value: string }
        Insert: { key: string; value: string }
        Update: { key?: string; value?: string }
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
