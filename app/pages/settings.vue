<script setup lang="ts">
/**
 * pages/settings.vue — Halaman Pengaturan
 *
 * 12.1 Seksi Lokasi: toggle GPS/Manual, input kota & koordinat jika manual,
 *       tampilkan waktu Maghrib hari ini sebagai preview
 * 12.2 Seksi Koreksi Hijriah (TODO)
 * 12.3 Seksi Kitab/Mushaf (TODO)
 * 12.4 Seksi Bobot Surat (TODO)
 */

import { ref, computed, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { getMaghribTime } from '~/utils/hijri'
import type { LocationMode } from '~/types/app'

// ── Stores ────────────────────────────────────────────────────────────────────

const settingsStore = useSettingsStore()
const {
  location_mode,
  latitude,
  longitude,
  city_name,
  loading: storeLoading,
  error: storeError,
} = storeToRefs(settingsStore)

// ── Local form state (edits are staged; persisted only on save) ───────────────

const localMode = ref<LocationMode>(location_mode.value)
const localCityName = ref<string>(city_name.value)
const localLat = ref<number>(latitude.value)
const localLng = ref<number>(longitude.value)

/** Sync local state when the store finishes loading from Supabase */
function syncFromStore(): void {
  localMode.value = location_mode.value
  localCityName.value = city_name.value
  localLat.value = latitude.value
  localLng.value = longitude.value
}

onMounted(async () => {
  if (!storeLoading.value) {
    await settingsStore.loadSettings()
  }
  syncFromStore()
})

// Re-sync whenever the store values change (e.g. initial load completes)
watch([location_mode, latitude, longitude, city_name], syncFromStore)

// ── GPS helpers ───────────────────────────────────────────────────────────────

const gpsLoading = ref(false)
const gpsError = ref<string | null>(null)

async function getGPSLocation(): Promise<void> {
  if (!navigator.geolocation) {
    gpsError.value = 'Browser tidak mendukung Geolocation API.'
    return
  }
  gpsLoading.value = true
  gpsError.value = null
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 10_000,
        maximumAge: 60_000,
        enableHighAccuracy: false,
      })
    })
    // Round to 4 decimal places (~11 m precision) for readability
    localLat.value = Math.round(position.coords.latitude * 10_000) / 10_000
    localLng.value = Math.round(position.coords.longitude * 10_000) / 10_000
    // Clear city name when overridden by GPS coords
    localCityName.value = ''
  }
  catch (err) {
    if (err instanceof GeolocationPositionError) {
      switch (err.code) {
        case GeolocationPositionError.PERMISSION_DENIED:
          gpsError.value = 'Izin lokasi ditolak. Aktifkan akses lokasi di pengaturan browser.'
          break
        case GeolocationPositionError.POSITION_UNAVAILABLE:
          gpsError.value = 'Informasi lokasi tidak tersedia saat ini.'
          break
        case GeolocationPositionError.TIMEOUT:
          gpsError.value = 'Waktu habis saat mendapatkan lokasi. Coba lagi.'
          break
        default:
          gpsError.value = 'Gagal mendapatkan lokasi.'
      }
    }
    else {
      gpsError.value = 'Gagal mendapatkan lokasi.'
    }
  }
  finally {
    gpsLoading.value = false
  }
}

// Clear GPS error when user switches to manual mode
watch(localMode, (mode) => {
  if (mode === 'manual') gpsError.value = null
})

// ── Maghrib preview ───────────────────────────────────────────────────────────

/**
 * Live Maghrib time preview calculated from the current local lat/lng inputs.
 * Updated reactively as the user changes coordinate values.
 */
const maghribPreview = computed((): string => {
  const lat = localLat.value
  const lng = localLng.value
  if (isNaN(lat) || isNaN(lng)) return '--:--'
  try {
    const maghrib = getMaghribTime({ latitude: lat, longitude: lng }, new Date())
    const hh = maghrib.getHours().toString().padStart(2, '0')
    const mm = maghrib.getMinutes().toString().padStart(2, '0')
    return `${hh}:${mm}`
  }
  catch {
    return '--:--'
  }
})

// Whether coordinates appear valid enough to compute Maghrib
const hasCoordsForPreview = computed(
  () => !isNaN(localLat.value) && !isNaN(localLng.value),
)

// ── Save ──────────────────────────────────────────────────────────────────────

const saveSuccess = ref(false)
const saveError = ref<string | null>(null)

async function saveLocation(): Promise<void> {
  saveError.value = null

  // Basic validation for manual mode
  if (localMode.value === 'manual') {
    if (isNaN(localLat.value) || isNaN(localLng.value)) {
      saveError.value = 'Koordinat tidak valid. Masukkan angka desimal yang benar.'
      return
    }
    if (localLat.value < -90 || localLat.value > 90) {
      saveError.value = 'Lintang (latitude) harus antara -90 dan 90.'
      return
    }
    if (localLng.value < -180 || localLng.value > 180) {
      saveError.value = 'Bujur (longitude) harus antara -180 dan 180.'
      return
    }
  }

  // Update store reactive state so other composables pick up changes immediately
  location_mode.value = localMode.value
  latitude.value = localLat.value
  longitude.value = localLng.value
  city_name.value = localCityName.value

  // Persist to Supabase via the store helper
  await settingsStore.saveAllSettings()

  if (storeError.value) {
    saveError.value = storeError.value
    return
  }

  saveSuccess.value = true
  setTimeout(() => { saveSuccess.value = false }, 3_000)
}

// ── Coordinate input helpers ──────────────────────────────────────────────────

/** Parse a string coordinate input, returns NaN if unparseable */
function parseCoord(value: string): number {
  const parsed = parseFloat(value)
  return isNaN(parsed) ? NaN : parsed
}

function onLatInput(event: Event): void {
  const val = (event.target as HTMLInputElement).value
  localLat.value = parseCoord(val)
}

function onLngInput(event: Event): void {
  const val = (event.target as HTMLInputElement).value
  localLng.value = parseCoord(val)
}
</script>

<template>
  <div class="max-w-lg mx-auto px-4 py-6 space-y-6">

    <!-- ── Page header ────────────────────────────────────────────────────── -->
    <header>
      <h1 class="text-xl font-bold text-gray-900">Pengaturan</h1>
      <p class="mt-0.5 text-sm text-gray-500">Sesuaikan preferensi aplikasi Anda</p>
    </header>

    <!-- ══════════════════════════════════════════════════════════════════════
         TASK 12.1 — Seksi Lokasi
         ══════════════════════════════════════════════════════════════════════ -->
    <section
      class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      aria-labelledby="location-section-title"
    >
      <!-- Section header -->
      <div class="px-4 pt-4 pb-3 border-b border-gray-100">
        <div class="flex items-center gap-2">
          <!-- Map pin icon -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.75"
            stroke="currentColor"
            class="w-5 h-5 text-primary-600 flex-shrink-0"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
            />
          </svg>
          <h2 id="location-section-title" class="text-base font-semibold text-gray-900">
            Lokasi
          </h2>
        </div>
        <p class="mt-1 text-xs text-gray-500 leading-relaxed">
          Digunakan untuk menghitung waktu Maghrib dan menentukan pergantian hari Hijriah.
        </p>
      </div>

      <div class="px-4 py-4 space-y-5">

        <!-- ── Mode toggle: GPS Otomatis / Manual ─────────────────────── -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Mode Lokasi
          </label>
          <div
            class="inline-flex rounded-xl bg-gray-100 p-1 w-full"
            role="group"
            aria-label="Pilih mode lokasi"
          >
            <button
              type="button"
              class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-150"
              :class="localMode === 'gps'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'"
              :aria-pressed="localMode === 'gps'"
              @click="localMode = 'gps'"
            >
              <!-- Signal / satellite icon -->
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.75"
                stroke="currentColor"
                class="w-4 h-4"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9.348 14.652a3.75 3.75 0 0 1 0-5.304m5.304 0a3.75 3.75 0 0 1 0 5.304m-7.425 2.121a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12Z"
                />
              </svg>
              GPS Otomatis
            </button>
            <button
              type="button"
              class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-150"
              :class="localMode === 'manual'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'"
              :aria-pressed="localMode === 'manual'"
              @click="localMode = 'manual'"
            >
              <!-- Pencil / edit icon -->
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.75"
                stroke="currentColor"
                class="w-4 h-4"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"
                />
              </svg>
              Manual
            </button>
          </div>
        </div>

        <!-- ── GPS mode: button + displayed coords ────────────────────── -->
        <template v-if="localMode === 'gps'">
          <div class="space-y-3">
            <button
              type="button"
              class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 active:bg-primary-800 transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              :disabled="gpsLoading"
              aria-label="Dapatkan lokasi saya melalui GPS"
              @click="getGPSLocation"
            >
              <!-- Loading spinner -->
              <svg
                v-if="gpsLoading"
                class="w-4 h-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4Z" />
              </svg>
              <!-- Map pin icon -->
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.75"
                stroke="currentColor"
                class="w-4 h-4"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              <span>{{ gpsLoading ? 'Mendapatkan lokasi…' : 'Gunakan Lokasi Saya' }}</span>
            </button>

            <!-- GPS error message -->
            <div
              v-if="gpsError"
              class="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200"
              role="alert"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.75"
                stroke="currentColor"
                class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <p class="text-xs text-red-700 leading-relaxed">{{ gpsError }}</p>
            </div>

            <!-- Detected coordinates display -->
            <div
              v-if="hasCoordsForPreview"
              class="p-3 rounded-lg bg-gray-50 border border-gray-200"
            >
              <p class="text-xs font-medium text-gray-500 mb-1">Koordinat Terdeteksi</p>
              <p class="text-sm text-gray-800 font-mono">
                {{ localLat.toFixed(4) }}, {{ localLng.toFixed(4) }}
              </p>
            </div>
          </div>
        </template>

        <!-- ── Manual mode: kota + koordinat inputs ───────────────────── -->
        <template v-if="localMode === 'manual'">
          <div class="space-y-4">
            <!-- Nama kota -->
            <div>
              <label
                for="city-name"
                class="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Nama Kota
                <span class="text-gray-400 font-normal">(opsional)</span>
              </label>
              <input
                id="city-name"
                v-model="localCityName"
                type="text"
                inputmode="text"
                autocomplete="off"
                placeholder="Contoh: Jakarta, Surabaya, Makkah"
                class="block w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-150"
                maxlength="100"
              >
            </div>

            <!-- Koordinat row -->
            <div class="grid grid-cols-2 gap-3">
              <!-- Latitude -->
              <div>
                <label
                  for="latitude"
                  class="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Lintang
                  <span class="text-gray-400 font-normal text-xs">(latitude)</span>
                </label>
                <input
                  id="latitude"
                  type="number"
                  inputmode="decimal"
                  step="0.0001"
                  min="-90"
                  max="90"
                  :value="isNaN(localLat) ? '' : localLat"
                  placeholder="-6.2088"
                  class="block w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-150"
                  aria-describedby="latitude-hint"
                  @input="onLatInput"
                >
                <p id="latitude-hint" class="mt-1 text-[10px] text-gray-400">-90 hingga 90</p>
              </div>

              <!-- Longitude -->
              <div>
                <label
                  for="longitude"
                  class="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Bujur
                  <span class="text-gray-400 font-normal text-xs">(longitude)</span>
                </label>
                <input
                  id="longitude"
                  type="number"
                  inputmode="decimal"
                  step="0.0001"
                  min="-180"
                  max="180"
                  :value="isNaN(localLng) ? '' : localLng"
                  placeholder="106.8456"
                  class="block w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-150"
                  aria-describedby="longitude-hint"
                  @input="onLngInput"
                >
                <p id="longitude-hint" class="mt-1 text-[10px] text-gray-400">-180 hingga 180</p>
              </div>
            </div>
          </div>
        </template>

        <!-- ── Maghrib preview card ───────────────────────────────────── -->
        <div
          class="flex items-center justify-between px-4 py-3 rounded-xl bg-primary-50 border border-primary-100"
          aria-live="polite"
          aria-atomic="true"
        >
          <div class="flex items-center gap-2">
            <!-- Moon / night icon -->
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.75"
              stroke="currentColor"
              class="w-5 h-5 text-primary-600"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
              />
            </svg>
            <span class="text-sm font-medium text-primary-800">Waktu Maghrib hari ini</span>
          </div>
          <span class="text-lg font-bold text-primary-700 tabular-nums tracking-wide">
            {{ maghribPreview }}
          </span>
        </div>

        <!-- ── Save error ─────────────────────────────────────────────── -->
        <div
          v-if="saveError"
          class="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200"
          role="alert"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.75"
            stroke="currentColor"
            class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p class="text-xs text-red-700 leading-relaxed">{{ saveError }}</p>
        </div>

        <!-- ── Save button ────────────────────────────────────────────── -->
        <button
          type="button"
          class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-150"
          :class="saveSuccess
            ? 'bg-green-500 text-white'
            : 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 disabled:opacity-60 disabled:cursor-not-allowed'"
          :disabled="storeLoading || saveSuccess"
          aria-label="Simpan pengaturan lokasi"
          @click="saveLocation"
        >
          <!-- Loading spinner -->
          <svg
            v-if="storeLoading"
            class="w-4 h-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4Z" />
          </svg>
          <!-- Check icon (success state) -->
          <svg
            v-else-if="saveSuccess"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="w-4 h-4"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          <span>{{ storeLoading ? 'Menyimpan…' : saveSuccess ? 'Tersimpan!' : 'Simpan Lokasi' }}</span>
        </button>

      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════════════
         Placeholder sections for tasks 12.2 – 12.4
         Akan diimplementasi pada task berikutnya.
         ══════════════════════════════════════════════════════════════════════ -->

    <!-- Task 12.2 — Koreksi Hijriah (TODO) -->
    <section
      class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      aria-labelledby="hijri-section-title"
    >
      <div class="px-4 pt-4 pb-3 border-b border-gray-100">
        <div class="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.75"
            stroke="currentColor"
            class="w-5 h-5 text-primary-600 flex-shrink-0"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          <h2 id="hijri-section-title" class="text-base font-semibold text-gray-900">
            Koreksi Hijriah
          </h2>
        </div>
        <p class="mt-1 text-xs text-gray-500">Segera hadir — Task 12.2</p>
      </div>
      <div class="px-4 py-6 flex items-center justify-center">
        <p class="text-sm text-gray-400 italic">Belum diimplementasi</p>
      </div>
    </section>

    <!-- Task 12.3 — Kitab/Mushaf (TODO) -->
    <section
      class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      aria-labelledby="books-section-title"
    >
      <div class="px-4 pt-4 pb-3 border-b border-gray-100">
        <div class="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.75"
            stroke="currentColor"
            class="w-5 h-5 text-primary-600 flex-shrink-0"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
          <h2 id="books-section-title" class="text-base font-semibold text-gray-900">
            Kitab / Mushaf
          </h2>
        </div>
        <p class="mt-1 text-xs text-gray-500">Segera hadir — Task 12.3</p>
      </div>
      <div class="px-4 py-6 flex items-center justify-center">
        <p class="text-sm text-gray-400 italic">Belum diimplementasi</p>
      </div>
    </section>

    <!-- Task 12.4 — Bobot Surat (TODO) -->
    <section
      class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      aria-labelledby="weights-section-title"
    >
      <div class="px-4 pt-4 pb-3 border-b border-gray-100">
        <div class="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.75"
            stroke="currentColor"
            class="w-5 h-5 text-primary-600 flex-shrink-0"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v17.25m0 0c-1.472-1.236-2.962-2.4-4.5-3.375A9.737 9.737 0 0 0 1.5 15.75C1.5 11.372 6.447 7.5 12 7.5s10.5 3.872 10.5 8.25c0 1.618-.67 3.085-1.73 4.125A14.52 14.52 0 0 0 16.5 17.25M12 3l-3-3m3 3 3-3" />
          </svg>
          <h2 id="weights-section-title" class="text-base font-semibold text-gray-900">
            Bobot Surat
          </h2>
        </div>
        <p class="mt-1 text-xs text-gray-500">Segera hadir — Task 12.4</p>
      </div>
      <div class="px-4 py-6 flex items-center justify-center">
        <p class="text-sm text-gray-400 italic">Belum diimplementasi</p>
      </div>
    </section>

  </div>
</template>
