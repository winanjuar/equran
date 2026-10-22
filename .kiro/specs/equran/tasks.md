# Implementation Plan: e-Quran PWA

## Overview

Implementasi e-Quran PWA dibangun secara bertahap mulai dari fondasi (scaffold, database, utilities) hingga lapisan UI (halaman, komponen) dan diakhiri dengan konfigurasi PWA serta verifikasi. Setiap grup task bersifat mandiri namun bergantung pada grup sebelumnya sesuai dependency graph di bawah. Stack utama: NuxtJS 3, TypeScript, Supabase, TailwindCSS, Pinia, dan Vite PWA.

## Tasks

- [x] 1. Project Scaffold & Configuration
  - [x] 1.1 Init NuxtJS 3 project dengan TypeScript di /Users/sugengwin/Developer/equran
  - [x] 1.2 Install dependencies: @nuxtjs/supabase, @nuxtjs/tailwindcss, @pinia/nuxt, @vite-pwa/nuxt, adhan, @umalqura/core
  - [x] 1.3 Konfigurasi nuxt.config.ts dengan semua modules (Supabase, TailwindCSS, Pinia, PWA)
  - [x] 1.4 Setup TailwindCSS dengan Islamic-inspired color palette
  - [x] 1.5 Buat .env.example dengan SUPABASE_URL dan SUPABASE_KEY
  - [x] 1.6 Buat struktur folder: components/, composables/, pages/, stores/, types/, utils/, scripts/

- [x] 2. Database Schema & Types
  - [x] 2.1 Buat file SQL migrasi di supabase/migrations/001_initial.sql (schema lengkap sesuai design.md)
  - [x] 2.2 Buat TypeScript types untuk semua tabel database di types/database.ts
  - [x] 2.3 Buat app types (input modes, heatmap config, dll) di types/app.ts
  - [x] 2.4 Buat composable useSupabase.ts untuk Supabase client

- [x] 3. Core Utilities
  - [x] 3.1 Buat utils/hijri.ts: kalkulasi Maghrib (adhan), konversi Hijriah (@umalqura/core), efective date logic, offset koreksi
  - [x] 3.2 Buat utils/quran.ts: resolver semua 7 mode range ke { start_verse_id, end_verse_id }
  - [x] 3.3 Buat utils/heatmap.ts: scoring logic (weighted untuk Tilawah), normalisasi intensitas warna

- [ ] 4. Pinia Stores
  - [ ] 4.1 Buat stores/settings.ts: load/save app_settings dari Supabase (lokasi, hijri_offset, dll)
  - [ ] 4.2 Buat stores/books.ts: CRUD kitab/mushaf
  - [ ] 4.3 Buat stores/sessions.ts: create session + entries, fetch history, delete session
  - [ ] 4.4 Buat stores/quran.ts: fetch & cache quran_verses, surah_weights, hijri_daily_targets

- [ ] 5. Composables
  - [ ] 5.1 Buat composables/useHijriDate.ts: reactive current Hijri date dengan batas Maghrib
  - [ ] 5.2 Buat composables/useQuranRange.ts: helper untuk setiap mode range selection

- [x] 6. Data Seeding (SQL Migration Files)
  - [x] 6.1 Generate `supabase/migrations/002_seed_quran_verses.sql` — 6.236 ayat dengan `ruku_in_surah` dan `hizb_in_juz` yang dihitung otomatis dari `scripts/data/quran-verses.csv`
  - [x] 6.2 Generate `supabase/migrations/003_seed_hijri_targets.sql` — target harian Hijriah dari `scripts/data/hijri-targets.csv`
  - [x] 6.3 Generate `supabase/migrations/004_seed_surah_weights.sql` — 114 surat; Al-Fatihah weight=0.1, selebihnya 1.0
  - [x] 6.4 Generate `supabase/migrations/005_seed_default_book.sql` — 2 kitab: "Quran Madinah Hijau" dan "Quran Madinah Biru"
  - [x] 6.5 Buat `scripts/README.md` — instruksi cara menjalankan generator (`node scripts/generate-migrations.cjs`) dan cara setup database (`supabase db push`)

- [ ] 7. Layout & Navigation
  - [ ] 7.1 Buat layouts/default.vue dengan bottom navigation bar (5 tab: Dashboard/Input/History/Heatmap/Settings)
  - [ ] 7.2 Bottom nav: ikon + label, active state, mobile-first styling

- [ ] 8. Halaman Dashboard (`/`)
  - [ ] 8.1 Tampilkan tanggal Hijriah hari ini (nama hari + tanggal + bulan + tahun)
  - [ ] 8.2 Kartu "Target Hari Ini" untuk Tilawah: range surat dari hijri_daily_targets
  - [ ] 8.3 Tombol shortcut ke /input dengan proses pre-selected
  - [ ] 8.4 4 mini heat map (per proses, 30 hari terakhir, segmentasi Surat)
  - [ ] 8.5 Daftar 5 sesi terbaru

- [ ] 9. Halaman Input (`/input`)
  - [ ] 9.1 Buat komponen step 1: pilih proses (4 tombol besar dengan ikon & warna berbeda)
  - [ ] 9.2 Buat komponen step 2: pilih kitab/mushaf (dropdown + tombol tambah cepat)
  - [ ] 9.3 Buat komponen step 3: pilih tanggal (default hari ini dalam format Hijriah)
  - [ ] 9.4 Buat RangeSelector/BySurat.vue: dropdown surat + toggle full surat / range ayat
  - [ ] 9.5 Buat RangeSelector/ByJuz.vue: dropdown juz 1-30
  - [ ] 9.6 Buat RangeSelector/ByJuzHizb.vue: dropdown juz + radio Hizb 1/2
  - [ ] 9.7 Buat RangeSelector/ByRuku.vue: dropdown surat + dropdown ruku ke-N (relatif dalam surat)
  - [ ] 9.8 Buat RangeSelector/ByHalaman.vue: input nomor halaman (1-604)
  - [ ] 9.9 Buat RangeSelector/ByAyat.vue: dropdown surat + input ayat awal & akhir
  - [ ] 9.10 Buat RangeSelector/ByHariHijriah.vue: tampilkan target hari ini, hanya untuk Tilawah
  - [ ] 9.11 Buat komponen range entry list: tampilkan semua range yang sudah ditambahkan + tombol hapus
  - [ ] 9.12 Buat tombol "+ Tambah Range" untuk multiple entries dalam satu sesi
  - [ ] 9.13 Input jumlah pengulangan (default 1, min 1)
  - [ ] 9.14 Input catatan opsional
  - [ ] 9.15 Tombol Simpan: validasi + save session + entries ke Supabase + redirect ke history

- [ ] 10. Halaman History (`/history`)
  - [ ] 10.1 Fetch dan tampilkan list sesi dengan sesi terbaru di atas
  - [ ] 10.2 Filter chip: Semua / Ziyadah / Murojahah / Tilawah / Tadabbur
  - [ ] 10.3 Filter tanggal (date range picker)
  - [ ] 10.4 Setiap item: ikon proses berwarna, tanggal Hijriah, nama kitab, summary range, jumlah repetisi
  - [ ] 10.5 Swipe-to-delete atau tombol hapus per item dengan konfirmasi

- [ ] 11. Halaman Heatmap (`/heatmap`)
  - [ ] 11.1 Buat tab navigasi 4 proses dengan warna masing-masing
  - [ ] 11.2 Dropdown pilih segmentasi (Ayat/Ruku'/Halaman/Hizb/Juz/Surat/Hari Hijriah)
  - [ ] 11.3 Quick filter waktu: 7hr / 30hr / 3bln / 1thn + custom date range
  - [ ] 11.4 Buat komponen HeatMapGrid.vue: grid kotak responsif dengan scrollable horizontal
  - [ ] 11.5 Logika warna: 5 level intensitas per proses
  - [ ] 11.6 Tooltip per kotak: nama segmen + skor/count
  - [ ] 11.7 Legend intensitas di bawah grid
  - [ ] 11.8 Buat komponen HeatMap.vue sebagai wrapper yang menggabungkan semua bagian

- [ ] 12. Halaman Settings (`/settings`)
  - [ ] 12.1 Seksi Lokasi: toggle GPS/Manual, input kota & koordinat jika manual, tampilkan waktu Maghrib hari ini sebagai preview
  - [ ] 12.2 Seksi Koreksi Hijriah: segmented control -1 / 0 / +1 dengan preview tanggal Hijriah sekarang
  - [ ] 12.3 Seksi Kitab/Mushaf: list semua kitab + tombol tambah + edit + hapus
  - [ ] 12.4 Seksi Bobot Surat: tabel 114 surat dengan input weight (default 1.0), highlight surat yang sudah diubah

- [ ] 13. PWA & Polish
  - [ ] 13.1 Konfigurasi PWA manifest di nuxt.config.ts (nama, ikon, theme color hijau)
  - [ ] 13.2 Generate ikon PWA (192x192, 512x512)
  - [ ] 13.3 Konfigurasi Service Worker untuk offline caching
  - [ ] 13.4 Test build production: `npm run build` harus berhasil tanpa error
  - [ ] 13.5 Buat vercel.json untuk konfigurasi deployment

- [ ] 14. Verifikasi & Dokumentasi
  - [ ] 14.1 Pastikan semua TypeScript types valid (tidak ada any yang tidak perlu)
  - [ ] 14.2 Pastikan semua halaman responsif dan mobile-friendly
  - [ ] 14.3 Update README.md dengan instruksi setup Supabase, import data, dan deployment ke Vercel

## Task Dependency Graph

```
1. Project Scaffold & Configuration
└── 2. Database Schema & Types
    ├── 3. Core Utilities
    │   ├── 4. Pinia Stores
    │   │   ├── 5. Composables
    │   │   ├── 8. Halaman Dashboard
    │   │   ├── 9. Halaman Input
    │   │   ├── 10. Halaman History
    │   │   ├── 11. Halaman Heatmap
    │   │   └── 12. Halaman Settings
    │   └── 6. Import Scripts
    └── 7. Layout & Navigation
        ├── 8. Halaman Dashboard
        ├── 9. Halaman Input
        ├── 10. Halaman History
        ├── 11. Halaman Heatmap
        └── 12. Halaman Settings

8–12 (semua halaman) → 13. PWA & Polish → 14. Verifikasi & Dokumentasi
```

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1"],
      "description": "Project Scaffold & Configuration — no dependencies"
    },
    {
      "wave": 2,
      "tasks": ["2"],
      "description": "Database Schema & Types — depends on wave 1"
    },
    {
      "wave": 3,
      "tasks": ["3", "7"],
      "description": "Core Utilities + Layout & Navigation — both depend on wave 2, run in parallel"
    },
    {
      "wave": 4,
      "tasks": ["4", "6"],
      "description": "Pinia Stores + Import Scripts — depend on wave 3 (Core Utilities), run in parallel"
    },
    {
      "wave": 5,
      "tasks": ["5", "8", "9", "10", "11", "12"],
      "description": "Composables + all page implementations — depend on waves 3 (Layout) and 4 (Stores), run in parallel"
    },
    {
      "wave": 6,
      "tasks": ["13"],
      "description": "PWA & Polish — depends on all pages (wave 5)"
    },
    {
      "wave": 7,
      "tasks": ["14"],
      "description": "Verifikasi & Dokumentasi — depends on wave 6"
    }
  ]
}
```

## Notes

- Semua task pada grup 8–12 (halaman-halaman) dapat dikerjakan secara paralel setelah task 4, 5, dan 7 selesai.
- Import scripts (grup 6) telah diganti dengan SQL migration files yang di-generate sekali menggunakan `node scripts/generate-migrations.cjs`. Task 6.1–6.4 sudah selesai. Untuk me-regenerate (jika data CSV berubah), jalankan script tersebut kembali.
- Pastikan `.env` sudah dikonfigurasi dengan `SUPABASE_URL` dan `SUPABASE_KEY` sebelum menjalankan `supabase db push` maupun development server.
- Semua komponen Vue harus menggunakan Composition API (`<script setup>`).
- Gunakan `useSupabase.ts` composable untuk semua akses ke Supabase — jangan import Supabase client langsung di komponen.
