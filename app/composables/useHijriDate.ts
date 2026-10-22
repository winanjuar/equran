/**
 * composables/useHijriDate.ts
 *
 * Reactive composable yang menyediakan tanggal Hijriah aktif dengan:
 * - Batas hari berbasis Maghrib (REQ-5.2)
 * - Kalkulasi Maghrib menggunakan adhan berdasarkan koordinat lokasi user (REQ-5.3)
 * - Koreksi offset Hijriah yang dikonfigurasi pengguna (-1, 0, +1) (REQ-5.5)
 * - Konversi Hijriah secara offline via @umalqura/core (REQ-5.6)
 * - Auto-refresh setiap menit untuk mendeteksi perubahan batas Maghrib
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { getMaghribTime, getEffectiveDate, toHijriDate } from '~/utils/hijri'
import { useSettingsStore } from '~/stores/settings'
import type { HijriDate } from '~/types/app'

/** Koordinat fallback Jakarta jika lokasi tidak tersedia atau tidak valid */
const JAKARTA_FALLBACK = { latitude: -6.2088, longitude: 106.8456 }

/** Interval refresh dalam milidetik (1 menit) */
const REFRESH_INTERVAL_MS = 60_000

/**
 * Nama hari dalam Bahasa Indonesia (berbasis hari Hijriah).
 * Diindeks berdasarkan JavaScript day of week: 0 = Ahad (Minggu) … 6 = Sabtu.
 */
const INDONESIAN_DAY_NAMES = [
  'Ahad',    // 0 - Sunday
  'Senin',   // 1 - Monday
  'Selasa',  // 2 - Tuesday
  'Rabu',    // 3 - Wednesday
  'Kamis',   // 4 - Thursday
  "Jum'at",  // 5 - Friday
  'Sabtu',   // 6 - Saturday
] as const

export function useHijriDate() {
  const settingsStore = useSettingsStore()
  const { latitude, longitude, hijri_offset } = storeToRefs(settingsStore)

  /**
   * "Jam" reaktif yang diperbarui setiap menit.
   * Semua computed lain bergantung pada ref ini, sehingga mereka otomatis
   * dihitung ulang ketika Maghrib terlewati.
   */
  const now = ref<Date>(new Date())

  let timer: ReturnType<typeof setInterval> | null = null

  // ── Validasi lokasi ───────────────────────────────────────────────────────

  /**
   * True jika koordinat di settings store tidak valid (NaN atau belum diisi).
   * Digunakan untuk memilih antara lokasi user vs. fallback Jakarta.
   */
  const isLocationInvalid = computed(
    () => isNaN(latitude.value) || isNaN(longitude.value),
  )

  /**
   * Koordinat aktif yang digunakan untuk kalkulasi Maghrib.
   * Jika nilai dari store tidak valid, fallback ke Jakarta.
   */
  const location = computed(() =>
    isLocationInvalid.value
      ? JAKARTA_FALLBACK
      : { latitude: latitude.value, longitude: longitude.value },
  )

  // ── Waktu Maghrib ─────────────────────────────────────────────────────────

  /**
   * Waktu Maghrib untuk hari ini berdasarkan koordinat aktif.
   * Digunakan sebagai penanda pergantian hari Hijriah (REQ-5.2).
   *
   * Jika kalkulasi gagal (library error), fallback ke Jakarta.
   */
  const maghribTime = computed((): Date => {
    try {
      return getMaghribTime(location.value, now.value)
    }
    catch {
      return getMaghribTime(JAKARTA_FALLBACK, now.value)
    }
  })

  // ── Tanggal Gregorian efektif ─────────────────────────────────────────────

  /**
   * Tanggal Gregorian efektif berdasarkan batas Maghrib (REQ-5.2):
   * - Jika now < Maghrib → tanggal hari ini
   * - Jika now ≥ Maghrib → tanggal besok (hari Hijriah sudah berganti)
   */
  const effectiveDate = computed((): Date => {
    try {
      return getEffectiveDate(location.value, now.value)
    }
    catch {
      return getEffectiveDate(JAKARTA_FALLBACK, now.value)
    }
  })

  // ── Tanggal Hijriah aktif ─────────────────────────────────────────────────

  /**
   * Tanggal Hijriah aktif dengan koreksi offset pengguna (REQ-5.5, REQ-5.6).
   * Bergantung pada effectiveDate (mempertimbangkan Maghrib) dan hijri_offset
   * dari settings store.
   *
   * Jika konversi gagal, coba tanpa offset; jika masih gagal, kembalikan fallback statis.
   */
  const hijriDate = computed((): HijriDate => {
    try {
      return toHijriDate(effectiveDate.value, hijri_offset.value)
    }
    catch {
      // Coba tanpa offset jika offset menyebabkan tanggal keluar rentang
      try {
        return toHijriDate(effectiveDate.value, 0)
      }
      catch {
        // Fallback terakhir agar UI tidak crash
        return { day: 1, month: 1, year: 1446, monthName: 'Muharram' }
      }
    }
  })

  // ── Nama hari ─────────────────────────────────────────────────────────────

  /**
   * Nama hari dalam Bahasa Indonesia (misalnya "Jum'at", "Sabtu").
   * Diambil berdasarkan day of week dari tanggal Gregorian efektif.
   * 0 = Ahad (Minggu), 1 = Senin, …, 6 = Sabtu.
   */
  const dayName = computed((): string =>
    INDONESIAN_DAY_NAMES[effectiveDate.value.getDay()] ?? 'Ahad',
  )

  // ── Error message ─────────────────────────────────────────────────────────

  /**
   * Pesan error aktif — null jika semua kalkulasi berhasil.
   * Saat ini hanya mencakup kondisi lokasi tidak valid; error kalkulasi
   * lainnya ditangani secara diam-diam dengan fallback.
   */
  const error = computed((): string | null =>
    isLocationInvalid.value
      ? 'Koordinat lokasi tidak valid. Menggunakan lokasi default Jakarta.'
      : null,
  )

  // ── Fungsi refresh ────────────────────────────────────────────────────────

  /**
   * Perbarui `now` secara manual.
   * Auto-refresh via setInterval sudah berjalan di background,
   * tapi fungsi ini bisa dipanggil untuk pembaruan instan.
   */
  function refresh(): void {
    now.value = new Date()
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  onMounted(() => {
    // Set ulang `now` saat mount untuk memastikan nilai awal aktual
    refresh()
    // Jadwalkan refresh setiap menit untuk mendeteksi Maghrib
    timer = setInterval(refresh, REFRESH_INTERVAL_MS)
  })

  onUnmounted(() => {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  })

  return {
    /** Tanggal Hijriah aktif { day, month, year, monthName } */
    hijriDate,
    /** Waktu Maghrib hari ini sebagai Date */
    maghribTime,
    /** Tanggal Gregorian efektif (hari ini atau besok jika sudah lewat Maghrib) */
    effectiveDate,
    /** Nama hari dalam Bahasa Indonesia (mis. "Senin", "Jum'at") */
    dayName,
    /** Pesan error aktif — null jika semua kalkulasi normal */
    error,
    /** Refresh manual — perbarui now secara instan */
    refresh,
  }
}
