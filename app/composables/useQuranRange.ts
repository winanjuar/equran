/**
 * composables/useQuranRange.ts
 *
 * Reactive composable untuk meresolve input range user menjadi pasangan
 * { start_verse_id, end_verse_id } (VerseRange).
 *
 * Mendukung 7 mode range (REQ-3.1):
 *   1. By Surat       — full surat, atau partial dengan range ayat
 *   2. By Juz         — seluruh juz (1–30)
 *   3. By Juz + Hizb  — setengah juz berdasarkan hizb_in_juz (REQ-2.2)
 *   4. By Ruku'       — ruku relatif dalam surat (REQ-2.2)
 *   5. By Halaman     — nomor halaman Mushaf Madinah (1–604)
 *   6. By Ayat        — range ayat bebas dalam surat
 *   7. By Hari Hijriah — semua range target surat hari Hijriah aktif
 *                        (khusus Tilawah — REQ-3.2, REQ-4.3)
 *
 * Semua resolver beroperasi 100% terhadap cache in-memory dari quran store
 * sehingga bekerja offline tanpa round-trip ke Supabase.
 * Cache dimuat otomatis jika belum tersedia saat resolver pertama kali dipanggil.
 */

import { ref } from 'vue'
import {
  resolveBySurah as utilResolveBySurah,
  resolveByJuz as utilResolveByJuz,
  resolveByJuzHizb as utilResolveByJuzHizb,
  resolveByRuku as utilResolveByRuku,
  resolveByPage as utilResolveByPage,
  resolveByVerse as utilResolveByVerse,
  resolveByHijriDay as utilResolveByHijriDay,
} from '~/utils/quran'
import { useQuranStore } from '~/stores/quran'
import type { VerseRange } from '~/types/app'

export function useQuranRange() {
  const quranStore = useQuranStore()

  // ── Reactive state ─────────────────────────────────────────────────────────

  /** True saat data verses atau hijri targets sedang dimuat dari Supabase */
  const isLoading = ref<boolean>(false)

  /** Pesan error aktif; null jika tidak ada error */
  const error = ref<string | null>(null)

  // ── Internal helpers ───────────────────────────────────────────────────────

  /**
   * Memastikan cache `verses` sudah terisi.
   * Memanggil `loadVerses()` hanya jika cache masih kosong.
   * Mengeset `isLoading` dan `error` selama proses loading.
   *
   * @throws Error jika load gagal (error juga tersimpan di `error` ref)
   */
  async function ensureVersesLoaded(): Promise<void> {
    if (quranStore.verses.length > 0) return

    isLoading.value = true
    error.value = null
    try {
      await quranStore.loadVerses()
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Gagal memuat data ayat Al-Quran'
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Memastikan cache `hijriTargets` sudah terisi.
   * Memanggil `loadHijriTargets()` hanya jika cache masih kosong.
   *
   * @throws Error jika load gagal
   */
  async function ensureHijriTargetsLoaded(): Promise<void> {
    if (quranStore.hijriTargets.length > 0) return

    isLoading.value = true
    error.value = null
    try {
      await quranStore.loadHijriTargets()
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Gagal memuat data target harian Hijriah'
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  // ── Mode 1: By Surat ──────────────────────────────────────────────────────

  /**
   * Resolve range untuk mode "By Surat" (REQ-3.1).
   *
   * - Jika `startVerse` dan `endVerse` tidak diberikan → resolve full surat.
   * - Jika keduanya diberikan → resolve sebagian surat (range ayat tertentu).
   *
   * @param surahNumber  Nomor surat (1–114)
   * @param startVerse   Nomor ayat pertama, inklusif (opsional)
   * @param endVerse     Nomor ayat terakhir, inklusif (opsional)
   * @returns VerseRange atau null jika surat/ayat tidak ditemukan dalam cache
   */
  async function resolveBySurah(
    surahNumber: number,
    startVerse?: number,
    endVerse?: number,
  ): Promise<VerseRange | null> {
    await ensureVersesLoaded()

    if (startVerse !== undefined && endVerse !== undefined) {
      // Partial surah: gunakan verse resolver
      return utilResolveByVerse(surahNumber, startVerse, endVerse, quranStore.verses)
    }

    // Full surah
    return utilResolveBySurah(surahNumber, quranStore.verses)
  }

  // ── Mode 2: By Juz ────────────────────────────────────────────────────────

  /**
   * Resolve range untuk mode "By Juz" (REQ-3.1).
   * Mengembalikan verse id pertama dan terakhir dari seluruh juz.
   *
   * @param juzNumber  Nomor juz (1–30)
   */
  async function resolveByJuz(juzNumber: number): Promise<VerseRange | null> {
    await ensureVersesLoaded()
    return utilResolveByJuz(juzNumber, quranStore.verses)
  }

  // ── Mode 3: By Juz + Hizb ────────────────────────────────────────────────

  /**
   * Resolve range untuk mode "By Juz + Hizb" (REQ-3.1, REQ-2.2).
   * `hizbInJuz` adalah posisi relatif hizb dalam juz (1 = setengah pertama,
   * 2 = setengah kedua), bukan nomor hizb absolut.
   *
   * @param juzNumber   Nomor juz (1–30)
   * @param hizbInJuz   Posisi hizb dalam juz: 1 atau 2
   */
  async function resolveByJuzHizb(
    juzNumber: number,
    hizbInJuz: 1 | 2,
  ): Promise<VerseRange | null> {
    await ensureVersesLoaded()
    return utilResolveByJuzHizb(juzNumber, hizbInJuz, quranStore.verses)
  }

  // ── Mode 4: By Ruku' ──────────────────────────────────────────────────────

  /**
   * Resolve range untuk mode "By Ruku'" (REQ-3.1, REQ-2.2).
   * `rukuInSurah` adalah nomor ruku relatif dalam surat (bukan ruku absolut).
   *
   * @param surahNumber  Nomor surat (1–114)
   * @param rukuInSurah  Nomor ruku' dalam surat (relatif)
   */
  async function resolveByRuku(
    surahNumber: number,
    rukuInSurah: number,
  ): Promise<VerseRange | null> {
    await ensureVersesLoaded()
    return utilResolveByRuku(surahNumber, rukuInSurah, quranStore.verses)
  }

  // ── Mode 5: By Halaman ────────────────────────────────────────────────────

  /**
   * Resolve range untuk mode "By Halaman" (REQ-3.1).
   * Halaman mengacu pada nomor halaman Mushaf Madinah (1–604).
   *
   * @param pageNumber  Nomor halaman (1–604)
   */
  async function resolveByHalaman(pageNumber: number): Promise<VerseRange | null> {
    await ensureVersesLoaded()
    return utilResolveByPage(pageNumber, quranStore.verses)
  }

  // ── Mode 6: By Ayat ───────────────────────────────────────────────────────

  /**
   * Resolve range untuk mode "By Ayat" (REQ-3.1).
   * Input berupa surat + range ayat yang diberikan user secara eksplisit.
   *
   * @param surahNumber  Nomor surat (1–114)
   * @param startVerse   Nomor ayat pertama (inklusif)
   * @param endVerse     Nomor ayat terakhir (inklusif)
   */
  async function resolveByAyat(
    surahNumber: number,
    startVerse: number,
    endVerse: number,
  ): Promise<VerseRange | null> {
    await ensureVersesLoaded()
    return utilResolveByVerse(surahNumber, startVerse, endVerse, quranStore.verses)
  }

  // ── Mode 7: By Hari Hijriah (Tilawah only) ───────────────────────────────

  /**
   * Resolve semua range untuk mode "By Hari Hijriah" (REQ-3.1, REQ-3.2, REQ-4.3).
   *
   * 1. Ambil daftar surat target dari `hijri_daily_targets` berdasarkan `hijriDay`
   *    (diurutkan oleh `sort_order`).
   * 2. Resolve setiap surat ke full verse range via `resolveBySurah`.
   * 3. Kembalikan array `VerseRange[]` — satu elemen per surat dalam jadwal hari itu.
   *
   * Mengembalikan `null` jika tidak ada target untuk hari tersebut.
   *
   * Catatan: Constraint REQ-3.2 (hanya untuk Tilawah) adalah tanggung jawab UI/form;
   * composable ini tidak memvalidasi tipe proses.
   *
   * @param hijriDay  Hari Hijriah (1–30)
   */
  async function resolveByHijriDay(hijriDay: number): Promise<VerseRange[] | null> {
    // Pastikan kedua cache tersedia
    await ensureVersesLoaded()
    await ensureHijriTargetsLoaded()

    const targets = quranStore.getHijriTargets(hijriDay)
    if (targets.length === 0) return null

    // Urutkan berdasarkan sort_order dan ekstrak nomor surat
    const sortedSurahs = [...targets]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(t => t.surah)

    const ranges = utilResolveByHijriDay(sortedSurahs, quranStore.verses)

    // Kembalikan null jika tidak ada ayat yang cocok (cache parsial, dll.)
    return ranges.length > 0 ? ranges : null
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  return {
    /** True saat cache verses atau hijri targets sedang dimuat */
    isLoading,
    /** Pesan error aktif — null jika semua operasi berhasil */
    error,
    /** Mode 1 — By Surat: full surat, atau partial jika startVerse & endVerse diberikan */
    resolveBySurah,
    /** Mode 2 — By Juz: seluruh juz */
    resolveByJuz,
    /** Mode 3 — By Juz + Hizb: setengah juz berdasarkan posisi hizb_in_juz */
    resolveByJuzHizb,
    /** Mode 4 — By Ruku': satu ruku relatif dalam surat */
    resolveByRuku,
    /** Mode 5 — By Halaman: semua ayat pada halaman Mushaf Madinah */
    resolveByHalaman,
    /** Mode 6 — By Ayat: range ayat eksplisit dalam surat */
    resolveByAyat,
    /** Mode 7 — By Hari Hijriah (Tilawah only): semua range surat target hari Hijriah */
    resolveByHijriDay,
  }
}
