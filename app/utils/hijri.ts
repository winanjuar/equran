/**
 * utils/hijri.ts
 *
 * Hijri calendar utilities:
 * - Maghrib time calculation via adhan (REQ-5.3)
 * - Maghrib-based effective date boundary (REQ-5.2)
 * - Gregorian → Hijri conversion with offset correction via @umalqura/core (REQ-5.5, REQ-5.6)
 */

import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan'
import umalqura from '@umalqura/core'

export interface Location {
  latitude: number
  longitude: number
}

export interface HijriDate {
  day: number
  month: number
  year: number
  monthName: string
}

/**
 * Hitung waktu Maghrib untuk lokasi dan tanggal tertentu.
 * Menggunakan metode MoonsightingCommittee dari library adhan. (REQ-5.3)
 */
export function getMaghribTime(location: Location, date: Date): Date {
  const coordinates = new Coordinates(location.latitude, location.longitude)
  const params = CalculationMethod.MoonsightingCommittee()
  const prayerTimes = new PrayerTimes(coordinates, date, params)
  return prayerTimes.maghrib
}

/**
 * Tentukan tanggal Gregorian efektif berdasarkan batas Maghrib. (REQ-5.2)
 *
 * Jika waktu saat ini (now) sudah melewati atau sama dengan Maghrib,
 * hari efektif adalah besok (hari Hijriah berikutnya sudah dimulai).
 * Jika belum, hari efektif adalah hari ini.
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
 * Konversi tanggal Gregorian ke Hijriah dengan koreksi offset. (REQ-5.5, REQ-5.6)
 *
 * Offset diaplikasikan ke tanggal Gregorian sebelum konversi, memungkinkan
 * koreksi -1 (mundur 1 hari), 0 (tanpa koreksi), atau +1 (maju 1 hari)
 * sesuai pengaturan pengguna.
 *
 * @param gregorianDate - Tanggal Gregorian yang akan dikonversi
 * @param offset - Koreksi hari: -1, 0, atau +1 (default: 0)
 * @returns HijriDate dengan day, month, year, dan monthName
 */
export function toHijriDate(gregorianDate: Date, offset: number = 0): HijriDate {
  // Terapkan offset Gregorian sebelum konversi ke Hijriah
  const adjusted = new Date(gregorianDate)
  if (offset !== 0) {
    adjusted.setDate(adjusted.getDate() + offset)
  }

  const hc = umalqura(adjusted)

  // Ambil nama bulan dari locale default library (Arabic)
  const monthNames = umalqura.months()
  const monthName = monthNames[hc.hm - 1] // hm adalah 1-indexed (1–12)

  return {
    day: hc.hd,
    month: hc.hm,
    year: hc.hy,
    monthName,
  }
}

/**
 * Dapatkan tanggal Hijriah aktif saat ini.
 *
 * Menggabungkan getEffectiveDate (batas Maghrib) dan toHijriDate (konversi + offset).
 * Ini adalah fungsi utama yang digunakan oleh composable useHijriDate. (REQ-5.2, REQ-5.5)
 *
 * @param location - Koordinat untuk penghitungan Maghrib
 * @param offset - Koreksi hari Hijriah: -1, 0, atau +1 (default: 0)
 * @returns HijriDate aktif saat ini
 */
export function getCurrentHijriDate(location: Location, offset: number = 0): HijriDate {
  const effectiveDate = getEffectiveDate(location)
  return toHijriDate(effectiveDate, offset)
}
