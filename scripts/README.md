# Scripts — e-Quran PWA

Folder ini berisi alat bantu pengembang untuk keperluan _one-time setup_ database dan regenerasi file migrasi SQL.

> **Catatan:** Semua script di sini **bukan** bagian dari build produksi. Hanya dijalankan secara manual oleh developer.

---

## Daftar File

| File | Keterangan |
|------|------------|
| `generate-migrations.cjs` | Generator SQL migration dari data CSV |
| `data/quran-verses.csv` | Sumber data 6.236 ayat Al-Quran |
| `data/hijri-targets.csv` | Sumber data target harian Hijriah |

---

## Regenerasi File Migrasi

Jalankan generator ini **hanya jika** data sumber CSV berubah (misalnya perbaikan data ayat atau target harian).

```bash
node scripts/generate-migrations.cjs
```

### File yang dihasilkan

| File | Isi |
|------|-----|
| `supabase/migrations/002_seed_quran_verses.sql` | 6.236 ayat Al-Quran |
| `supabase/migrations/003_seed_hijri_targets.sql` | Target harian Hijriah |
| `supabase/migrations/004_seed_surah_weights.sql` | 114 bobot surat |
| `supabase/migrations/005_seed_default_book.sql` | 2 kitab default |

> **Penting:** File `001_initial.sql` (schema tabel, index, constraint) **tidak** dihasilkan oleh script ini — dikelola secara manual.

Setelah regenerasi, jalankan `supabase db push` kembali agar perubahan diterapkan ke database.

---

## Setup Database (Pertama Kali)

### 1. Siapkan file `.env`

```bash
cp .env.example .env
```

Kemudian buka `.env` dan isi nilai berikut:

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_KEY=<anon-public-key>
```

Lihat bagian [Cara Mendapatkan Kredensial Supabase](#cara-mendapatkan-kredensial-supabase) di bawah.

### 2. Install Supabase CLI (jika belum ada)

```bash
npm install -g supabase
```

### 3. Push semua migrasi ke Supabase

```bash
supabase db push
```

Migrasi dijalankan secara berurutan:

```
001_initial.sql          → Membuat semua tabel, index, dan constraint
002_seed_quran_verses    → Mengisi 6.236 ayat Al-Quran
003_seed_hijri_targets   → Mengisi target harian Hijriah
004_seed_surah_weights   → Mengisi 114 bobot surat
005_seed_default_book    → Mengisi 2 kitab default
```

---

## Cara Mendapatkan Kredensial Supabase

1. Buka [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Pilih project Anda
3. Masuk ke **Project Settings → API**
4. Salin nilai **Project URL** dan **anon / public key**

---

## Catatan Penting

- **`supabase db push` bersifat idempoten untuk schema**, namun akan error jika data seed sudah ada (duplikat primary key). Jika database perlu di-reset, gunakan flag `--include-all` atau reset database terlebih dahulu melalui Supabase dashboard.
- Script generator **tidak perlu** dijalankan ulang setiap deploy — file SQL yang sudah ada di `supabase/migrations/` sudah cukup.
- Jika ada perubahan pada data CSV, urutan kerja yang benar adalah:
  1. Edit file CSV di `scripts/data/`
  2. Jalankan `node scripts/generate-migrations.cjs`
  3. Jalankan `supabase db push` untuk menerapkan perubahan
