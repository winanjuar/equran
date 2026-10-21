-- =========================================
-- Migration 001: Initial Schema
-- e-Quran PWA — creates all base tables,
-- indexes, and default app_settings rows.
-- Run this before any seed migrations (002+).
-- =========================================

-- =========================================
-- Quran master data (6,236 verses)
-- =========================================
CREATE TABLE quran_verses (
  id            INTEGER PRIMARY KEY,
  page          INTEGER NOT NULL,
  juz           INTEGER NOT NULL,         -- 1-30
  hizb          INTEGER NOT NULL,         -- absolute (1-60)
  hizb_in_juz   INTEGER NOT NULL,         -- relative: 1 or 2 within the juz
  ruku          INTEGER NOT NULL,         -- absolute (across surahs)
  ruku_in_surah INTEGER NOT NULL,         -- relative: ruku number within this surah
  surah         INTEGER NOT NULL,         -- 1-114
  surah_name    TEXT NOT NULL,
  verse         INTEGER NOT NULL
);

CREATE INDEX idx_qv_surah ON quran_verses(surah);
CREATE INDEX idx_qv_juz ON quran_verses(juz);
CREATE INDEX idx_qv_page ON quran_verses(page);
CREATE INDEX idx_qv_ruku ON quran_verses(ruku);

-- =========================================
-- Per-surah weight (Tilawah only)
-- =========================================
CREATE TABLE surah_weights (
  surah       INTEGER PRIMARY KEY,
  surah_name  TEXT NOT NULL,
  weight      DECIMAL(5,3) NOT NULL DEFAULT 1.0
);

-- =========================================
-- Book / mushaf master data
-- =========================================
CREATE TABLE books (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================
-- Tracking sessions
-- =========================================
CREATE TABLE sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL CHECK (type IN ('ziyadah','murojahah','tilawah','tadabbur')),
  book_id     UUID REFERENCES books(id),
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  hijri_day   INTEGER NOT NULL CHECK (hijri_day BETWEEN 1 AND 30),
  hijri_month INTEGER NOT NULL CHECK (hijri_month BETWEEN 1 AND 12),
  hijri_year  INTEGER NOT NULL CHECK (hijri_year > 1400),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_sessions_type ON sessions(type);

-- =========================================
-- Verse range entries per session
-- =========================================
CREATE TABLE session_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  start_verse_id  INTEGER NOT NULL REFERENCES quran_verses(id),
  end_verse_id    INTEGER NOT NULL REFERENCES quran_verses(id),
  repetitions     INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_se_session_id ON session_entries(session_id);
CREATE INDEX idx_se_verses ON session_entries(start_verse_id, end_verse_id);

-- =========================================
-- Pre-computed verse-level activity log
-- Primary read model for heatmap.
-- Scores are locked at session-save time; surah_weight changes do NOT retroactively update existing rows.
-- =========================================
CREATE TABLE verse_activity_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  session_entry_id UUID NOT NULL REFERENCES session_entries(id) ON DELETE CASCADE,
  verse_id         INTEGER NOT NULL REFERENCES quran_verses(id),
  session_type     TEXT NOT NULL,
  session_date     DATE NOT NULL,
  score            DECIMAL(10,4) NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_val_verse_id   ON verse_activity_log(verse_id);
CREATE INDEX idx_val_type_date  ON verse_activity_log(session_type, session_date);

-- =========================================
-- Daily Tilawah targets by Hijri day (1-30)
-- =========================================
CREATE TABLE hijri_daily_targets (
  hijri_day  INTEGER NOT NULL CHECK (hijri_day BETWEEN 1 AND 30),
  surah      INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (hijri_day, surah)
);

CREATE INDEX idx_hdt_day ON hijri_daily_targets(hijri_day);

-- =========================================
-- Application settings (key-value)
-- =========================================
CREATE TABLE app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Default values
INSERT INTO app_settings (key, value) VALUES
  ('hijri_offset', '0'),
  ('location_mode', 'manual'),
  ('latitude', '-6.2088'),
  ('longitude', '106.8456'),
  ('city_name', 'Jakarta');
