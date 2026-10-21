# e-Quran PWA — Technical Design

## Overview

e-Quran is a Progressive Web App (PWA) for personal Quran tracking, built with NuxtJS 3 and Supabase. It enables users to log and visualize their Quran activities across four processes: **Ziyadah** (memorization of new verses), **Murojahah** (memorization review), **Tilawah** (recitation), and **Tadabbur** (contemplative reading).

The app is mobile-first, works offline as a PWA, and incorporates Hijri calendar awareness — including automatic Maghrib-based day boundaries — to align tracking with the Islamic calendar. Sessions are stored in Supabase (PostgreSQL) and visualized as heat maps across multiple Quran segmentations (ayat, ruku, halaman, hizb, juz, surat, hari hijriah).

---

## Architecture

The application follows a client-rendered SPA architecture deployed as a PWA on Vercel:

```
┌──────────────────────────────────────────────────────┐
│                   Client (Browser / PWA)             │
│                                                      │
│  ┌─────────────┐  ┌────────────┐  ┌───────────────┐  │
│  │  NuxtJS 3   │  │   Pinia    │  │  TailwindCSS  │  │
│  │ (Vue 3 + TS)│  │  (Stores)  │  │  (Styling)    │  │
│  └──────┬──────┘  └────────────┘  └───────────────┘  │
│         │                                             │
│  ┌──────▼──────────────────────────────────────────┐  │
│  │             Composables / Utils                 │  │
│  │  useSupabase · useHijriDate · useQuranRange     │  │
│  │  hijri.ts · quran.ts · heatmap.ts               │  │
│  └──────┬──────────────────────────────────────────┘  │
└─────────┼────────────────────────────────────────────┘
          │ HTTPS / Supabase JS Client
┌─────────▼────────────────────────────────────────────┐
│           Supabase (Backend-as-a-Service)             │
│                                                      │
│  ┌──────────────────────┐  ┌──────────────────────┐  │
│  │    PostgreSQL DB     │  │  Supabase Auth        │  │
│  │  quran_verses        │  │  (future)             │  │
│  │  sessions            │  └──────────────────────┘  │
│  │  session_entries     │                            │
│  │  books               │                            │
│  │  surah_weights       │                            │
│  │  hijri_daily_targets │                            │
│  │  app_settings        │                            │
│  └──────────────────────┘                            │
└──────────────────────────────────────────────────────┘
```

**Key architectural decisions:**

| Decision | Rationale |
|---|---|
| NuxtJS 3 (SPA mode) | Type-safe Vue 3 with file-based routing; SSR available but not required for this app |
| Supabase | Managed PostgreSQL + real-time subscriptions; eliminates the need for a custom API server |
| Pinia | Lightweight store for settings, cached Quran data, and in-progress session state |
| @vite-pwa/nuxt | Workbox-backed offline caching; installable on Android/iOS home screen |
| Vercel | Zero-config deployment with edge CDN for static assets |

---

## Components and Interfaces

### Pages

| Page | Route | Responsibility |
|---|---|---|
| Dashboard | `/` | Today's Hijri date, daily Tilawah target, mini heat maps per process, recent sessions |
| Input | `/input` | Session entry form: process, book, date, range mode, repetitions, notes |
| History | `/history` | Paginated session list with filter by type and date |
| Heatmap | `/heatmap` | Interactive heat map with segmentation and time-range controls |
| Settings | `/settings` | Location, Hijri offset, books management, surah weights |

### Key Components

**`SessionForm.vue`**
- Props: none (reads from store/route)
- Emits: `saved` (after successful session insert)
- Composes `RangeSelector/*` and delegates range resolution to `useQuranRange`

**`RangeSelector/` (BySurah, ByJuz, ByJuzHizb, ByRuku, ByPage, ByVerse, ByHijriDay)**
- Props: `modelValue: { start_verse_id: number; end_verse_id: number } | null`
- Emits: `update:modelValue`
- Each selector resolves user input to a `{ start_verse_id, end_verse_id }` pair

**`HeatMap.vue`**
- Props: `type: SessionType`, `segmentation: SegmentationType`, `dateRange: DateRange`
- Renders a scored grid using `utils/heatmap.ts`

**`HeatMapGrid.vue`**
- Props: `segments: HeatMapSegment[]`
- Pure display component; maps score → CSS color class (0 = grey, 1–4 = light→dark, 5+ = max)

### Composables

| Composable | Responsibility |
|---|---|
| `useSupabase` | Typed Supabase client wrapper with query helpers |
| `useHijriDate` | Reactive current Hijri date; accounts for Maghrib boundary and offset |
| `useQuranRange` | Resolves range mode + user selection → `{ start_verse_id, end_verse_id }` |

### Stores (Pinia)

| Store | Key State |
|---|---|
| `settings` | `hijri_offset`, `location_mode`, `latitude`, `longitude`, `city_name` |
| `books` | List of mushaf/kitab |
| `sessions` | In-progress session form state, recent sessions cache |
| `quran` | Cached `quran_verses` for offline range resolution |

---

## Data Models

Full SQL schema is in [Section 3 (Database Schema)](#3-database-schema) and TypeScript types in [Section 4 (TypeScript Types)](#4-typescript-types).

**Entity summary:**

| Entity | Table | Description |
|---|---|---|
| Quran Verse | `quran_verses` | Master data: 6,236 verses with surat, ayat, juz, hizb, ruku, halaman |
| Surah Weight | `surah_weights` | Per-surah multiplier used in Tilawah heat map scoring |
| Book | `books` | Mushaf/kitab reference (e.g. Mushaf Madinah) |
| Session | `sessions` | One tracking session: type, date, book, full hijri date |
| Session Entry | `session_entries` | One or more verse ranges within a session, each with repetitions |
| Verse Activity Log | `verse_activity_log` | Pre-computed, verse-level activity records generated at session save; primary read model for heatmap |
| Hijri Daily Target | `hijri_daily_targets` | Target surat list per Hijri day (1–30) for Tilawah guidance; always full-surat ranges; hari ke-30 repeats hari ke-29 |
| App Settings | `app_settings` | Key-value user preferences (location, hijri offset) |

**Key relationships:**
- A `Session` has one or more `SessionEntry` records; deleting a session cascades to its entries
- `SessionEntry.start_verse_id` / `end_verse_id` reference `quran_verses.id` (immutable master data)
- `Session.book_id` optionally references `books.id`
- `verse_activity_log` records are generated from `session_entries` at write time; deleting a session cascades to both its entries and its activity log records

---

## Correctness Properties

### Property 1: Verse range ordering
`start_verse_id ≤ end_verse_id` must hold for every `session_entry` record.
**Validates: Requirements 1.2, 3.1**

### Property 2: Session type constraint
`sessions.type` is restricted to `('ziyadah', 'murojahah', 'tilawah', 'tadabbur')` via DB `CHECK`.
**Validates: Requirements 1.1**

### Property 3: Hijri date bounds
`hijri_day` must be between 1 and 30, `hijri_month` between 1 and 12, and `hijri_year` > 1400 (enforced by DB `CHECK` on `sessions`). `hijri_day` on `hijri_daily_targets` retains its own CHECK (1–30).
**Validates: Requirements 1.3, 4.1**

### Property 4: Repetitions positive
`session_entries.repetitions ≥ 1`; zero or negative repetitions are invalid.
**Validates: Requirements 1.2, 6.3**

### Property 5: Surah weight positive
`surah_weights.weight > 0`; a zero weight would suppress all Tilawah scoring for a surah.
**Validates: Requirements 6.1, 6.3**

### Property 6: Score immutability after weight change
Scores stored in `verse_activity_log` are never updated when `surah_weights.weight` changes. A score reflects the weight that was active at session save time. No retroactive recalculation is performed.
**Validates: Requirements 6.6**

### Property 7: Quran data immutability
`quran_verses` is read-only master data; no application flow mutates it.
**Validates: Requirements 2.1**

### Property 8: Hijri boundary consistency
The effective date (Maghrib-based) must use the same location and offset settings across all calculations within a session to avoid day mismatches.
**Validates: Requirements 5.2, 5.3, 5.5**

---

## Error Handling

### Network / Supabase Errors
- All Supabase calls are wrapped in `try/catch`; errors surface via a reactive `error` ref in composables.
- On network failure, the app falls back to Pinia-cached Quran data for range resolution, disabling session saving with a clear UI message.

### Form Validation
- Range selectors must resolve to a complete `{ start_verse_id, end_verse_id }` pair before the form can be submitted; incomplete selections block submission with an inline error.
- Invalid combinations (e.g. unknown surah/juz pairing) return `null` from `useQuranRange`, which triggers an inline error.

### Hijri Date Calculation
- If no location is set, the app falls back to the Jakarta default coordinates and shows a warning.
- If `@umalqura/core` conversion fails, the error is caught and displayed; the UI falls back to showing the Gregorian date.

### Import Scripts
- Scripts validate each row before upserting; rows with missing or out-of-range values are logged and skipped rather than halting the entire import.

### Global
- Unhandled errors are caught by NuxtJS's global error handler and shown with a user-friendly message; full details are logged to the console.

---

## Testing Strategy

### Unit Tests (Vitest)
- **`utils/hijri.ts`** — verify Hijri conversion for known Gregorian dates, Maghrib boundary logic, and offset application.
- **`utils/quran.ts`** — verify each range mode (BySurah, ByJuz, ByJuzHizb, ByRuku, ByPage, ByVerse, ByHijriDay) produces the correct `start_verse_id`/`end_verse_id` against a seeded dataset.
- **`utils/heatmap.ts`** — verify score computation, weight application (Tilawah), and normalization across edge cases (zero activity, single entry, max density).

### Component Tests (Vitest + Vue Test Utils)
- **RangeSelector components** — mount each selector, simulate user input, assert `update:modelValue` emits the correct verse pair.
- **SessionForm** — simulate the full input flow (process → book → range → save) and assert the Supabase insert receives the correct payload.
- **HeatMapGrid** — given scored segments, assert the correct CSS color classes are rendered.

### Integration Tests
- Use a local Supabase instance (`supabase start`) with a seeded test database (first 3 juz of `quran_verses`, sample `books`, `surah_weights`) for real query validation.
- Run import scripts against the test DB and verify row counts and spot-checked values.

### E2E Tests (Playwright — future)
- Full user flow: log a Tilawah session → verify it appears in History → verify Heat Map reflects the change.
- PWA offline mode: verify the app loads and range resolution works without network access.

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Framework | NuxtJS 3 (TypeScript, Composition API) |
| Database | Supabase (PostgreSQL) |
| Styling | TailwindCSS |
| State Management | Pinia |
| PWA | @vite-pwa/nuxt |
| Hijri Calendar | @umalqura/core |
| Prayer Times | adhan |
| Excel Import | xlsx | ~~xlsx~~ (dihapus — data master statis, diganti SQL migrations) |
| Deployment | Vercel |

---

## 2. Project Structure

```
/Users/sugengwin/Developer/equran/
├── .kiro/specs/equran/
├── assets/
├── components/
│   ├── HeatMap.vue
│   ├── HeatMapGrid.vue
│   ├── SessionForm.vue
│   ├── RangeSelector/
│   │   ├── BySurah.vue
│   │   ├── ByJuz.vue
│   │   ├── ByJuzHizb.vue
│   │   ├── ByRuku.vue
│   │   ├── ByPage.vue
│   │   ├── ByVerse.vue
│   │   └── ByHijriDay.vue
│   └── ui/
├── composables/
│   ├── useSupabase.ts
│   ├── useHijriDate.ts
│   └── useQuranRange.ts
├── layouts/
│   └── default.vue
├── pages/
│   ├── index.vue
│   ├── input.vue
│   ├── history.vue
│   ├── heatmap.vue
│   └── settings.vue
├── stores/
│   ├── settings.ts
│   ├── books.ts
│   ├── sessions.ts
│   └── quran.ts
├── types/
│   ├── database.ts
│   └── app.ts
├── utils/
│   ├── hijri.ts
│   ├── quran.ts
│   └── heatmap.ts
├── scripts/
│   ├── import-verses.ts
│   ├── import-hijri-targets.ts
│   ├── seed-surah-weights.ts
│   └── seed-default-book.ts
├── supabase/
│   └── migrations/
│       └── 001_initial.sql
├── public/
│   └── icons/
├── .env.example
├── nuxt.config.ts
└── package.json
```

---

## 3. Database Schema

```sql
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
-- Verse range entries per session (multiple per session)
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
-- Generated at session save time; primary read model for heatmap.
-- Each row = one verse covered by one session_entry, with its score.
--
-- Tilawah : score = repetitions × surah_weight (locked at time of recording)
-- Others  : score = repetitions
--
-- NOTE: surah_weight changes do NOT retroactively update existing rows.
-- Scores reflect the weight that was active when the session was saved.
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
-- Ranges are guaranteed full surahs (never partial).
-- Days 1-29 map the khatam schedule; day 30 repeats day 29 targets.
-- A surah may appear in more than one day (e.g. surahs 93-114
-- appear in both day 29 and day 30).
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
```

---

## 4. TypeScript Types

```typescript
// types/database.ts
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

export interface SurahWeight {
  surah: number
  surah_name: string
  weight: number
}

export interface Book {
  id: string
  name: string
  description: string | null
  created_at: string
}

export type SessionType = 'ziyadah' | 'murojahah' | 'tilawah' | 'tadabbur'

export interface Session {
  id: string
  type: SessionType
  book_id: string | null
  date: string
  hijri_day: number
  hijri_month: number
  hijri_year: number
  notes: string | null
  created_at: string
}

export interface SessionEntry {
  id: string
  session_id: string
  start_verse_id: number
  end_verse_id: number
  repetitions: number
  created_at: string
}

export interface VerseActivityLog {
  id: string
  session_id: string
  session_entry_id: string
  verse_id: number
  session_type: SessionType
  session_date: string       // ISO date string
  score: number              // repetitions × weight (tilawah) or repetitions (others)
  created_at: string
}

export interface HijriDailyTarget {
  hijri_day: number
  surah: number
  sort_order: number
}
```

---

## 5. Hijri Calendar Logic

### File: `utils/hijri.ts`

```typescript
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan'
import { HijriCalendar } from '@umalqura/core'

interface Location {
  latitude: number
  longitude: number
}

interface HijriDate {
  day: number
  month: number
  year: number
  monthName: string
}

/**
 * Hitung waktu Maghrib untuk lokasi dan tanggal tertentu
 */
export function getMaghribTime(location: Location, date: Date): Date {
  const coordinates = new Coordinates(location.latitude, location.longitude)
  const params = CalculationMethod.MoonsightingCommittee()
  const prayerTimes = new PrayerTimes(coordinates, date, params)
  return prayerTimes.maghrib
}

/**
 * Tentukan tanggal Gregorian efektif berdasarkan batas Maghrib.
 * Jika sekarang sudah lewat Maghrib, hari efektif adalah besok.
 */
export function getEffectiveDate(location: Location, now: Date = new Date()): Date {
  const maghrib = getMaghribTime(location, now)
  if (now >= maghrib) {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow
  }
  return now
}

/**
 * Konversi tanggal Gregorian ke Hijriah dengan koreksi offset
 */
export function toHijriDate(gregorianDate: Date, offset: number = 0): HijriDate {
  const hc = new HijriCalendar(gregorianDate)
  const adjusted = hc.addDays(offset)
  return {
    day: adjusted.hd,
    month: adjusted.hm,
    year: adjusted.hy,
    monthName: adjusted.hmString
  }
}

/**
 * Dapatkan tanggal Hijriah aktif saat ini
 * (dengan mempertimbangkan batas Maghrib dan offset koreksi)
 */
export function getCurrentHijriDate(location: Location, offset: number = 0): HijriDate {
  const effectiveDate = getEffectiveDate(location)
  return toHijriDate(effectiveDate, offset)
}
```

---

## 6. Range Resolution Logic

### File: `utils/quran.ts`

Setiap mode input harus di-resolve ke pasangan `{ start_verse_id, end_verse_id }`:

```typescript
// By Surah → get first and last verse of that surah
// By Juz → get first and last verse of that juz
// By Juz + Hizb → filter by juz AND hizb_in_juz
// By Ruku' → filter by surat AND ruku_in_surah
// By Page → filter by halaman
// By Verse → filter by surat AND ayat BETWEEN start AND end
// By Hijri Day → get surah list from hijri_daily_targets for that day,
//                then resolve each surah to first/last verse via quran_verses
```

---

## 7. Heat Map Scoring

### Pendekatan: Write-time Materialization

Alih-alih melakukan range intersection query setiap kali heatmap ditampilkan, skor dihitung dan disimpan **saat sesi disimpan**. Tabel `verse_activity_log` adalah read model khusus untuk heatmap — setiap baris merepresentasikan satu ayat yang tercakup dalam satu session entry, beserta skornya.

```
Session disimpan
       │
       ▼
Untuk setiap session_entry:
  1. Ambil semua verse dari quran_verses
     WHERE id BETWEEN start_verse_id AND end_verse_id
  2. Untuk setiap verse:
       - Tilawah  → score = repetitions × surah_weight[verse.surah]
       - Lainnya  → score = repetitions
  3. Bulk insert ke verse_activity_log
       (session_id, session_entry_id, verse_id, session_type, session_date, score)
```

### File: `utils/heatmap.ts`

```typescript
// Heatmap query menjadi agregasi sederhana.
// Tidak ada range intersection atau weight join saat baca.

// Per Ayat (6.236 segmen):
// SELECT verse_id, SUM(score) FROM verse_activity_log
// WHERE session_type = :type AND session_date BETWEEN :from AND :to
// GROUP BY verse_id

// Per Juz / Per Surat / Per Hizb / Per Ruku' / Per Halaman:
// JOIN dengan quran_verses untuk mendapat kolom segmentasi (juz/surah/hizb/ruku/page),
// lalu GROUP BY kolom tersebut.
// Contoh Per Juz:
// SELECT qv.juz, SUM(val.score)
// FROM verse_activity_log val
// JOIN quran_verses qv ON val.verse_id = qv.id
// WHERE val.session_type = :type AND val.session_date BETWEEN :from AND :to
// GROUP BY qv.juz ORDER BY qv.juz

// Per Hari Hijriah (30 segmen — hari Hijriah 1-30):
// JOIN dengan sessions untuk mendapat hijri_day (verse_activity_log tidak menyimpan hijri_day).
// SELECT s.hijri_day, SUM(val.score)
// FROM verse_activity_log val
// JOIN sessions s ON val.session_id = s.id
// WHERE val.session_type = :type AND val.session_date BETWEEN :from AND :to
// GROUP BY s.hijri_day ORDER BY s.hijri_day

// Normalisasi untuk skala warna:
// 0       = abu-abu (tidak ada aktivitas)
// 1–4     = level warna terang ke gelap (relatif terhadap nilai max dalam dataset)
// 5+      = warna paling pekat
```

### Catatan Penting

| Aspek | Perilaku |
|---|---|
| Perubahan bobot surat | Tidak mempengaruhi skor lama. Skor terkunci pada bobot yang aktif saat sesi disimpan. |
| Hapus sesi | Cascade ke `session_entries` dan `verse_activity_log` — semua data terkait terhapus. |
| Storage | ~200 row per entri juz, ringan untuk app pribadi. |
| Konsistensi | `verse_activity_log` harus selalu dibuat bersamaan dengan `session_entries` dalam satu transaksi. |

### Write Path di Store

```typescript
// stores/sessions.ts — fungsi saveSession (pseudocode)
async function saveSession(session, entries) {
  // 1. Insert session
  const { data: savedSession } = await supabase
    .from('sessions').insert(session)

  // 2. Untuk setiap entry, insert session_entry + generate verse_activity_log
  for (const entry of entries) {
    const { data: savedEntry } = await supabase
      .from('session_entries').insert({ ...entry, session_id: savedSession.id })

    // Ambil semua verse dalam range dari cache quran store
    const verses = quranStore.getVerseRange(entry.start_verse_id, entry.end_verse_id)

    // Hitung score per verse
    const logs = verses.map(verse => ({
      session_id: savedSession.id,
      session_entry_id: savedEntry.id,
      verse_id: verse.id,
      session_type: session.type,
      session_date: session.date,
      score: session.type === 'tilawah'
        ? entry.repetitions * quranStore.getSurahWeight(verse.surah)
        : entry.repetitions
    }))

    // Bulk insert
    await supabase.from('verse_activity_log').insert(logs)
  }
}
```

---

## 8. Pages & UI

### Navigation
Bottom navigation bar (mobile-first) dengan 5 tab:
- 🏠 Dashboard (`/`)
- ✏️ Input (`/input`)
- 📋 History (`/history`)
- 🗺️ Heatmap (`/heatmap`)
- ⚙️ Settings (`/settings`)

### Dashboard (`/`)
- Header: tanggal Hijriah hari ini + nama hari
- Kartu "Target Hari Ini" (Tilawah): range surat target hari ini
- 4 mini heat map (satu per proses, 30 hari terakhir, segmentasi Surat)
- Aktivitas terbaru (5 sesi terakhir)

### Input (`/input`)
Flow:
1. Pilih proses (4 tombol besar: Ziyadah/Murojahah/Tilawah/Tadabbur)
2. Pilih kitab/mushaf (dropdown)
3. Pilih tanggal (default: hari ini)
4. Pilih mode range + input range
5. Set jumlah pengulangan (default: 1)
6. Tombol "+ Tambah Range" untuk multiple entries
7. Catatan opsional
8. Tombol Simpan

### History (`/history`)
- List sesi dengan filter: semua/ziyadah/murojahah/tilawah/tadabbur
- Filter tanggal
- Setiap item menampilkan: ikon proses, tanggal, kitab, range summary, repetisi

### Heatmap (`/heatmap`)
- Tab untuk pilih proses (4 tab)
- Dropdown segmentasi (Ayat/Ruku'/Halaman/Hizb/Juz/Surat/Hari Hijriah)
- Filter waktu (7hr/30hr/3bln/1thn/custom)
- Grid heat map responsif
- Legend intensitas warna

### Settings (`/settings`)
- **Lokasi**: GPS otomatis / manual (kota + koordinat)
- **Koreksi Hijriah**: slider -1 / 0 / +1
- **Kitab/Mushaf**: list + tambah/edit/hapus
- **Bobot Surat**: tabel 114 surat, input weight per surat

---

## 9. PWA Configuration

```typescript
// nuxt.config.ts (bagian PWA)
pwa: {
  manifest: {
    name: 'e-Quran',
    short_name: 'e-Quran',
    description: 'Personal Quran tracking app',
    theme_color: '#16a34a',  // green-600
    background_color: '#ffffff',
    display: 'standalone',
    orientation: 'portrait'
  },
  workbox: {
    navigateFallback: '/',
    globPatterns: ['**/*.{js,css,html,png,svg,ico}']
  }
}
```

---

## 10. Data Seeding (SQL Migration Approach)

Data master bersifat statis dan **tidak di-import saat runtime**. Seluruh data di-seed melalui SQL migration files yang dijalankan sekali saat setup database (`supabase db push`).

### Migration Files

| File | Isi | Status |
|---|---|---|
| `supabase/migrations/001_initial.sql` | Schema semua tabel | Dibuat di task 2.1 |
| `supabase/migrations/002_seed_quran_verses.sql` | 6.236 ayat (termasuk `ruku_in_surah` dan `hizb_in_juz` yang sudah dihitung) | ✅ Done |
| `supabase/migrations/003_seed_hijri_targets.sql` | 122 baris target harian Hijriah (hari 30 = duplikasi hari 29) | ✅ Done |
| `supabase/migrations/004_seed_surah_weights.sql` | 114 surat; Al-Fatihah weight=0.1, selebihnya 1.0 | ✅ Done |
| `supabase/migrations/005_seed_default_book.sql` | 2 kitab: "Quran Madinah Hijau" (kostan) dan "Quran Madinah Biru" (saku/bepergian) | ✅ Done |

### Generator Script

File `scripts/generate-migrations.cjs` adalah one-time developer tool untuk me-regenerate migration files dari CSV source data:

```
scripts/
├── data/
│   ├── quran-verses.csv       ← source data ayat (ID, Halaman, Hizb, Juz, Ruku, Surat, Nama Surat, Ayat)
│   └── hijri-targets.csv      ← source data jadwal harian (Day, Surat)
└── generate-migrations.cjs    ← jalankan: node scripts/generate-migrations.cjs
```

Script menghitung otomatis:
- `ruku_in_surah`: counter per surat yang di-reset setiap ganti surat
- `hizb_in_juz`: `((hizb - 1) % 2) + 1`

Script **tidak menjadi bagian dari bundle production** dan tidak perlu diinstall di server.

### Cara Setup Database

```bash
# 1. Pastikan .env sudah dikonfigurasi (SUPABASE_URL, SUPABASE_KEY)
# 2. Jalankan semua migration sekaligus
supabase db push
```

---

## 11. Environment Variables

```env
# .env.example
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```
