/**
 * settings store — loads and persists user preferences from/to `app_settings`
 * in Supabase (key-value table).
 *
 * All values are stored as TEXT in the DB; this store is responsible for
 * parsing them to the correct TypeScript types on read and serialising back
 * on write.
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { LocationMode } from '~/types/app'

// Known setting keys — explicit union prevents typos
type SettingKey = 'hijri_offset' | 'location_mode' | 'latitude' | 'longitude' | 'city_name'

// Defaults mirror the seeded values in 001_initial.sql
const DEFAULTS = {
  hijri_offset: 0,
  location_mode: 'manual' as LocationMode,
  latitude: -6.2088,
  longitude: 106.8456,
  city_name: 'Jakarta',
} as const

export const useSettingsStore = defineStore('settings', () => {
  // Initialise Supabase helpers once at store setup time (safe for Nuxt composables)
  const { appSettings } = useSupabase()

  // ── Reactive state ────────────────────────────────────────────────────────
  const hijri_offset = ref<number>(DEFAULTS.hijri_offset)
  const location_mode = ref<LocationMode>(DEFAULTS.location_mode)
  const latitude = ref<number>(DEFAULTS.latitude)
  const longitude = ref<number>(DEFAULTS.longitude)
  const city_name = ref<string>(DEFAULTS.city_name)

  /** True while any async operation is in flight */
  const loading = ref<boolean>(false)
  /** Last error message, or null if no error */
  const error = ref<string | null>(null)

  // ── Private helpers ───────────────────────────────────────────────────────

  /** Apply a raw key-value array (from the DB) to the reactive state */
  function applyRows(rows: Array<{ key: string; value: string }>): void {
    for (const row of rows) {
      switch (row.key as SettingKey) {
        case 'hijri_offset': {
          const parsed = parseInt(row.value, 10)
          hijri_offset.value = isNaN(parsed) ? DEFAULTS.hijri_offset : parsed
          break
        }
        case 'location_mode':
          if (row.value === 'gps' || row.value === 'manual') {
            location_mode.value = row.value
          }
          break
        case 'latitude': {
          const parsed = parseFloat(row.value)
          latitude.value = isNaN(parsed) ? DEFAULTS.latitude : parsed
          break
        }
        case 'longitude': {
          const parsed = parseFloat(row.value)
          longitude.value = isNaN(parsed) ? DEFAULTS.longitude : parsed
          break
        }
        case 'city_name':
          city_name.value = row.value.trim() || DEFAULTS.city_name
          break
      }
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Fetch all rows from `app_settings` and populate reactive state.
   * Call this once on app mount (e.g. in app.vue or a plugin).
   */
  async function loadSettings(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { data, error: sbError } = await appSettings.getAll()
      if (sbError) throw sbError
      if (data) applyRows(data)
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load settings'
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Upsert a single key-value pair in `app_settings`.
   * Use this for granular saves (e.g. user toggles one setting).
   */
  async function saveSetting(key: SettingKey, value: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { error: sbError } = await appSettings.set(key, value)
      if (sbError) throw sbError
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : `Failed to save setting: ${key}`
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Save all current state values to `app_settings` in Supabase.
   * Upserting sequentially to surface the first error quickly.
   */
  async function saveAllSettings(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const entries: Array<{ key: SettingKey; value: string }> = [
        { key: 'hijri_offset', value: String(hijri_offset.value) },
        { key: 'location_mode', value: location_mode.value },
        { key: 'latitude', value: String(latitude.value) },
        { key: 'longitude', value: String(longitude.value) },
        { key: 'city_name', value: city_name.value },
      ]
      for (const entry of entries) {
        const { error: sbError } = await appSettings.set(entry.key, entry.value)
        if (sbError) throw sbError
      }
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save settings'
    }
    finally {
      loading.value = false
    }
  }

  return {
    // state
    hijri_offset,
    location_mode,
    latitude,
    longitude,
    city_name,
    loading,
    error,
    // actions
    loadSettings,
    saveSetting,
    saveAllSettings,
  }
})
