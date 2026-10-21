# Requirements Document

## Introduction

e-Quran adalah aplikasi PWA pribadi untuk tracking aktivitas Quran harian: Ziyadah, Murojahah, Tilawah, dan Tadabbur. Dirancang untuk satu pengguna (tanpa autentikasi), mobile-first, dan fokus pada kemudahan input serta visualisasi progress.

Dokumen ini mendefinisikan seluruh kebutuhan fungsional dan teknis untuk pengembangan aplikasi e-Quran versi 1.

## Requirements

### REQ-1: Proses Tracking

**REQ-1.1** Sistem harus mendukung empat proses tracking:
- **Ziyadah**: menambah hafalan baru
- **Murojahah**: mengulang hafalan
- **Tilawah**: membaca Al-Quran
- **Tadabbur**: merenungkan/memahami Al-Quran

**REQ-1.2** Setiap sesi tracking harus menyimpan: proses, kitab/mushaf, tanggal, range ayat (bisa lebih dari satu), jumlah pengulangan, dan catatan opsional.

**REQ-1.3** Setiap sesi harus menyimpan tanggal Hijriah lengkap (`hijri_day`, `hijri_month`, `hijri_year`) yang berlaku saat sesi dicatat. Tanggal ini selalu diambil otomatis dari waktu input (dengan mempertimbangkan batas Maghrib dan offset koreksi), terlepas dari mode range yang digunakan.

---

### REQ-2: Data Al-Quran

**REQ-2.1** Data Al-Quran mengacu pada **Mushaf Cetakan Madinah** dengan struktur:
`ID, Halaman, Hizb, Juz, Ruku, Surat, Nama_Surat, Ayat`

**REQ-2.2** Data harus dilengkapi dengan posisi relatif:
- `ruku_in_surah`: ruku ke-N dalam surat tersebut
- `hizb_in_juz`: hizb ke-N dalam juz tersebut (nilai 1 atau 2)

**REQ-2.3** Posisi absolut hanya digunakan secara internal oleh sistem. User selalu berinteraksi dengan posisi relatif.

---

### REQ-3: Input Sesi (Semudah Mungkin)

**REQ-3.1** User harus dapat merekam sesi dengan memilih salah satu dari tujuh mode range:

| Mode | Deskripsi |
|---|---|
| By Surat | Pilih surat (full surat atau + range ayat) |
| By Juz | Pilih juz 1–30 (seluruh juz) |
| By Juz + Hizb | Pilih juz, lalu hizb ke-1 atau ke-2 dalam juz tersebut |
| By Ruku' | Pilih surat, lalu ruku' ke-N dalam surat tersebut (relatif) |
| By Halaman | Input nomor halaman Mushaf Madinah (absolut) |
| By Ayat | Pilih surat, input range ayat |
| By Hari Hijriah | Otomatis resolve dari tanggal Hijriah aktif (khusus Tilawah) |

**REQ-3.2** Mode "By Hari Hijriah" hanya tersedia saat proses = Tilawah.

**REQ-3.3** Satu sesi dapat mencakup **multiple range entries** (misal: tilawah Al-Baqarah 1-10 dan Ali Imran 1-5 dalam satu sesi).

**REQ-3.4** Default tanggal sesi adalah tanggal Hijriah yang aktif saat input dilakukan.

---

### REQ-4: Jadwal Target Tilawah Harian (Hijriah)

**REQ-4.1** Sistem harus menyimpan jadwal target tilawah harian berdasarkan **hari Hijriah (1–30)**.

**REQ-4.2** Setiap hari Hijriah dapat memiliki satu atau lebih range ayat sebagai target.

**REQ-4.3** Ketika user memilih mode "By Hari Hijriah", sistem otomatis mengambil semua range target untuk hari Hijriah aktif dan menjadikannya entries sesi.

**REQ-4.4** Mode ini bersifat all-or-nothing (seluruh target hari tersebut tercapai); tidak ada partial completion.

**REQ-4.5** Jadwal harian didapat dari dataset terpisah yang digabungkan dengan data ayat saat import.

---

### REQ-5: Kalender Hijriah & Batas Hari

**REQ-5.1** Sistem menggunakan kalender Hijriah sebagai acuan hari.

**REQ-5.2** Hari baru dimulai saat **Maghrib** (bukan tengah malam). Jika waktu saat ini ≥ waktu Maghrib, maka tanggal Hijriah sudah berganti ke hari berikutnya.

**REQ-5.3** Waktu Maghrib dihitung berdasarkan koordinat lokasi user menggunakan library `adhan`.

**REQ-5.4** User dapat mengatur lokasi dengan dua mode:
- **GPS otomatis**: menggunakan Geolocation API browser
- **Manual**: input koordinat atau nama kota

**REQ-5.5** User dapat mengatur **koreksi offset kalender Hijriah** (-1, 0, atau +1 hari) di Settings untuk menyesuaikan dengan metode rukyat/hisab yang digunakan.

**REQ-5.6** Sistem menggunakan library `@umalqura/core` untuk konversi Hijriah secara offline, dengan sinkronisasi opsional dari AlAdhan API saat online.

---

### REQ-6: Sistem Pembobotan (Tilawah)

**REQ-6.1** Setiap surat memiliki nilai bobot (`weight`) yang dapat dikonfigurasi, default **1.0**.

**REQ-6.2** Pembobotan **hanya berlaku untuk proses Tilawah**.

**REQ-6.3** Formula skor Tilawah: `skor = jumlah_repetisi × bobot_surat`

**REQ-6.4** Jika satu session entry mencakup ayat dari beberapa surat, skor dihitung per surat secara proporsional.

**REQ-6.5** Contoh: Al-Fatihah dengan bobot 0.1 → membaca 10x = skor 1.0 (setara 1x membaca surat dengan bobot 1.0).

**REQ-6.6** Skor yang sudah tersimpan **tidak berubah** jika bobot surat diubah di kemudian hari. Skor mencerminkan bobot yang aktif pada saat sesi dicatat.

---

### REQ-7: Kitab / Mushaf

**REQ-7.1** User dapat menambah, mengedit, dan menghapus entri kitab/mushaf secara bebas.

**REQ-7.2** Setiap sesi dikaitkan dengan satu kitab/mushaf.

**REQ-7.3** Sistem menyediakan dua data kitab awal yang di-seed saat setup database:
- **Quran Madinah Hijau** — ukuran standar, disimpan di kostan
- **Quran Madinah Biru** — ukuran saku, dibawa bepergian (kantor, luar kota)

---

### REQ-8: Visualisasi Heat Map

**REQ-8.1** Setiap proses memiliki **heat map terpisah** dengan skema warna berbeda:

| Proses | Warna |
|---|---|
| Ziyadah | Hijau |
| Murojahah | Biru |
| Tilawah | Oranye |
| Tadabbur | Ungu |

**REQ-8.2** User dapat memilih segmentasi heat map via menu:
- Per Ayat (6.236 kotak)
- Per Ruku' (kotak = 1 ruku absolut)
- Per Halaman (kotak = 1 halaman Mushaf Madinah)
- Per Hizb (60 kotak)
- Per Juz (30 kotak)
- Per Surat (114 kotak)
- Per Hari Hijriah (30 kotak — hari Hijriah 1–30, berdasarkan jadwal hijri_daily_targets)

**REQ-8.3** Intensitas warna kotak mencerminkan frekuensi aktivitas pada segmen tersebut. Untuk Tilawah, menggunakan skor berbobot.

**REQ-8.4** User dapat memfilter rentang waktu: 7 hari, 30 hari, 3 bulan, 1 tahun, atau custom.

---

### REQ-9: PWA

**REQ-9.1** Aplikasi harus dapat diinstall di smartphone (manifest.json).

**REQ-9.2** Aplikasi harus dapat digunakan secara offline untuk halaman yang sudah pernah dikunjungi (Service Worker).

**REQ-9.3** UI harus mobile-first dan responsif.

---

### REQ-10: Teknis & Infrastruktur

**REQ-10.1** Stack: NuxtJS 3 (TypeScript) + Supabase (PostgreSQL) + Vercel.

**REQ-10.2** Tidak ada autentikasi — single user app.

**REQ-10.3** Data master (ayat, jadwal target harian, bobot surat, kitab) bersifat statis dan disediakan sebagai **SQL migration files** yang dijalankan sekali saat setup database. Tidak ada dependency Excel/import di level aplikasi production.

**REQ-10.4** Seluruh teks antarmuka dalam **Bahasa Indonesia**.

---

### Out of Scope (v1)
- Multi-user / autentikasi
- Sinkronisasi antar perangkat
- Export/import data manual
- Notifikasi/reminder

---

## Glossary

| Istilah | Definisi |
|---|---|
| **Ziyadah** | Proses menambah hafalan baru Al-Quran |
| **Murojahah** | Proses mengulang dan memperkuat hafalan yang sudah ada |
| **Tilawah** | Proses membaca Al-Quran |
| **Tadabbur** | Proses merenungkan dan memahami makna Al-Quran |
| **Mushaf Madinah** | Cetakan standar Al-Quran dari Madinah dengan 604 halaman, digunakan sebagai referensi data utama |
| **Surat** | Salah satu dari 114 bab dalam Al-Quran |
| **Ayat** | Satu baris/kalimat dalam sebuah surat |
| **Juz** | Salah satu dari 30 bagian yang membagi Al-Quran secara merata |
| **Hizb** | Setengah juz; setiap juz terdiri dari 2 hizb (total 60 hizb) |
| **Ruku'** | Bagian dalam surat yang ditandai tanda ruku', digunakan sebagai satuan pembacaan |
| **Halaman** | Nomor halaman dalam Mushaf Madinah |
| **Hijriah** | Kalender Islam berdasarkan pergerakan bulan |
| **Maghrib** | Waktu sholat setelah matahari terbenam; menandai pergantian hari Hijriah |
| **Sesi** | Satu catatan aktivitas tracking yang mencakup proses, kitab, tanggal, range ayat, dan jumlah pengulangan |
| **Range Entry** | Satu rentang ayat dalam sebuah sesi (satu sesi dapat memiliki beberapa range entry) |
| **Bobot (Weight)** | Nilai pengali yang diterapkan pada skor Tilawah per surat, default 1.0 |
| **Heat Map** | Visualisasi intensitas aktivitas dalam bentuk grid berwarna |
| **PWA** | Progressive Web App — aplikasi web yang dapat diinstall di perangkat seperti aplikasi native |
