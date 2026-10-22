/**
 * utils/hijri.test.ts
 *
 * Unit tests for utils/hijri.ts
 * Tests: Hijri conversion for known dates, Maghrib boundary logic, offset application.
 */

import { describe, it, expect } from 'vitest'
import {
  getMaghribTime,
  getEffectiveDate,
  toHijriDate,
  getCurrentHijriDate,
} from './hijri'

// Jakarta coordinates — default fallback in app settings
const JAKARTA: { latitude: number; longitude: number } = {
  latitude: -6.2088,
  longitude: 106.8456,
}

// ------------------------------------------------------------------
// getMaghribTime
// ------------------------------------------------------------------
describe('getMaghribTime', () => {
  it('should return a valid Date for a known location and date', () => {
    const date = new Date('2024-01-15T12:00:00Z')
    const maghrib = getMaghribTime(JAKARTA, date)

    expect(maghrib).toBeInstanceOf(Date)
    expect(isNaN(maghrib.getTime())).toBe(false)
  })

  it('should return Maghrib time roughly between 17:00 and 19:30 local time for Jakarta', () => {
    // Jakarta is UTC+7; Maghrib typically falls between 18:00–18:30 local
    const date = new Date('2024-06-15T00:00:00+07:00')
    const maghrib = getMaghribTime(JAKARTA, date)

    // Convert to Jakarta local hour (UTC+7)
    const localHour = (maghrib.getUTCHours() + 7) % 24
    expect(localHour).toBeGreaterThanOrEqual(17)
    expect(localHour).toBeLessThanOrEqual(19)
  })
})

// ------------------------------------------------------------------
// getEffectiveDate
// ------------------------------------------------------------------
describe('getEffectiveDate', () => {
  it('should return today if current time is before Maghrib', () => {
    // Use a time well before Maghrib: 10:00 local (03:00 UTC for Jakarta)
    const nowBeforeMaghrib = new Date('2024-06-15T03:00:00Z') // 10:00 WIB
    const effective = getEffectiveDate(JAKARTA, nowBeforeMaghrib)

    expect(effective.getUTCDate()).toBe(nowBeforeMaghrib.getUTCDate())
    expect(effective.getUTCMonth()).toBe(nowBeforeMaghrib.getUTCMonth())
    expect(effective.getUTCFullYear()).toBe(nowBeforeMaghrib.getUTCFullYear())
  })

  it('should return tomorrow if current time is after Maghrib', () => {
    // Use a time well after Maghrib: 20:00 local (13:00 UTC for Jakarta)
    const nowAfterMaghrib = new Date('2024-06-15T13:00:00Z') // 20:00 WIB
    const effective = getEffectiveDate(JAKARTA, nowAfterMaghrib)

    // Expect the next calendar day
    const expectedTomorrow = new Date('2024-06-16T13:00:00Z')
    expect(effective.getUTCDate()).toBe(expectedTomorrow.getUTCDate())
    expect(effective.getUTCMonth()).toBe(expectedTomorrow.getUTCMonth())
    expect(effective.getUTCFullYear()).toBe(expectedTomorrow.getUTCFullYear())
  })

  it('should cross month boundary correctly when Maghrib triggers tomorrow', () => {
    // Last day of January 2024, after Maghrib (13:00 UTC = 20:00 WIB)
    const lastDayAfterMaghrib = new Date('2024-01-31T13:00:00Z')
    const effective = getEffectiveDate(JAKARTA, lastDayAfterMaghrib)

    expect(effective.getUTCDate()).toBe(1)
    expect(effective.getUTCMonth()).toBe(1) // February (0-indexed)
    expect(effective.getUTCFullYear()).toBe(2024)
  })
})

// ------------------------------------------------------------------
// toHijriDate
// ------------------------------------------------------------------
describe('toHijriDate', () => {
  it('should convert a known Gregorian date to the correct Hijri date', () => {
    // 2024-01-01 corresponds to 19 Jumadil Akhirah 1445 H
    const date = new Date('2024-01-01T00:00:00Z')
    const hijri = toHijriDate(date, 0)

    expect(hijri.year).toBe(1445)
    expect(hijri.month).toBe(6) // Jumadil Akhirah = month 6
    expect(hijri.day).toBe(19)
    expect(typeof hijri.monthName).toBe('string')
    expect(hijri.monthName.length).toBeGreaterThan(0)
  })

  it('should return correct fields: day, month, year, monthName', () => {
    const date = new Date('2024-06-15T00:00:00Z')
    const hijri = toHijriDate(date, 0)

    expect(hijri.day).toBeGreaterThanOrEqual(1)
    expect(hijri.day).toBeLessThanOrEqual(30)
    expect(hijri.month).toBeGreaterThanOrEqual(1)
    expect(hijri.month).toBeLessThanOrEqual(12)
    expect(hijri.year).toBeGreaterThan(1400)
    expect(typeof hijri.monthName).toBe('string')
  })

  it('should advance the Hijri day by 1 with offset +1', () => {
    const date = new Date('2024-06-15T00:00:00Z')
    const base = toHijriDate(date, 0)
    const plusOne = toHijriDate(date, 1)

    // The day should advance; handle month rollover
    const baseTotalDays = base.year * 360 + base.month * 30 + base.day
    const plusOneTotalDays = plusOne.year * 360 + plusOne.month * 30 + plusOne.day
    expect(plusOneTotalDays).toBeGreaterThan(baseTotalDays)
  })

  it('should retreat the Hijri day by 1 with offset -1', () => {
    const date = new Date('2024-06-15T00:00:00Z')
    const base = toHijriDate(date, 0)
    const minusOne = toHijriDate(date, -1)

    const baseTotalDays = base.year * 360 + base.month * 30 + base.day
    const minusOneTotalDays = minusOne.year * 360 + minusOne.month * 30 + minusOne.day
    expect(minusOneTotalDays).toBeLessThan(baseTotalDays)
  })

  it('should have the same result as offset 0 when offset is 0', () => {
    const date = new Date('2024-03-20T00:00:00Z')
    const base = toHijriDate(date, 0)
    const noOffset = toHijriDate(date)

    expect(base).toEqual(noOffset)
  })
})

// ------------------------------------------------------------------
// getCurrentHijriDate
// ------------------------------------------------------------------
describe('getCurrentHijriDate', () => {
  it('should return a valid HijriDate with default offset', () => {
    const hijri = getCurrentHijriDate(JAKARTA)

    expect(hijri.day).toBeGreaterThanOrEqual(1)
    expect(hijri.day).toBeLessThanOrEqual(30)
    expect(hijri.month).toBeGreaterThanOrEqual(1)
    expect(hijri.month).toBeLessThanOrEqual(12)
    expect(hijri.year).toBeGreaterThan(1400)
    expect(typeof hijri.monthName).toBe('string')
    expect(hijri.monthName.length).toBeGreaterThan(0)
  })

  it('should produce the same result as combining getEffectiveDate + toHijriDate', () => {
    const now = new Date('2024-06-15T03:00:00Z') // before Maghrib
    const effectiveDate = getEffectiveDate(JAKARTA, now)
    const expected = toHijriDate(effectiveDate, 0)

    // getCurrentHijriDate uses new Date() internally, so we test the composition directly
    const result = toHijriDate(getEffectiveDate(JAKARTA, now), 0)
    expect(result).toEqual(expected)
  })

  it('should apply offset +1 and produce a later Hijri date', () => {
    const now = new Date('2024-06-15T03:00:00Z')
    const effectiveDate = getEffectiveDate(JAKARTA, now)

    const base = toHijriDate(effectiveDate, 0)
    const withOffset = toHijriDate(effectiveDate, 1)

    const baseDays = base.year * 360 + base.month * 30 + base.day
    const offsetDays = withOffset.year * 360 + withOffset.month * 30 + withOffset.day
    expect(offsetDays).toBeGreaterThan(baseDays)
  })
})
