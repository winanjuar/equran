<script setup lang="ts">
/**
 * RangeSelector/ByAyat.vue
 *
 * Komponen pemilih range berdasarkan Ayat (REQ-3.1, mode 6: by_verse).
 *
 * Features:
 * - Dropdown pilih surat (1–114) dengan format "N. Nama Surat (X ayat)"
 * - Input ayat awal & akhir (selalu ditampilkan setelah surat dipilih)
 * - Defaults: ayat awal = 1, ayat akhir = total ayat surat
 * - Validasi inline: start ≥ 1, end ≥ start, end ≤ max ayat
 * - Confirmation pill setelah input valid
 * - Emits { start_verse_id, end_verse_id } saat valid, null jika belum
 *
 * Berbeda dengan BySurat.vue:
 *   - Tidak ada toggle mode full/range — selalu mode range ayat
 *   - Menggunakan resolveByAyat() dari composable
 *
 * Props:
 *   modelValue — VerseRange | null (pasangan verse id saat ini)
 * Emits:
 *   update:modelValue — emitted dengan resolved pair atau null jika invalid
 */

import { ref, computed, watch, onMounted } from 'vue'
import type { VerseRange } from '~/types/app'
import { useQuranStore } from '~/stores/quran'
import { useQuranRange } from '~/composables/useQuranRange'

// ── Props & Emits ─────────────────────────────────────────────────────────────

defineProps<{
  modelValue: VerseRange | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: VerseRange | null): void
}>()

// ── Store & Composable ────────────────────────────────────────────────────────

const quranStore = useQuranStore()
const { resolveByAyat, isLoading: rangeLoading } = useQuranRange()

// ── Form State ────────────────────────────────────────────────────────────────

const selectedSurah = ref<number | null>(null)
const startAyat = ref<number>(1)
const endAyat = ref<number>(1)
const validationError = ref<string | null>(null)
const isResolving = ref<boolean>(false)

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  if (quranStore.verses.length === 0) {
    await quranStore.loadVerses()
  }
})

// ── Computed ──────────────────────────────────────────────────────────────────

/**
 * Derived list of unique surahs with verse counts from the in-memory cache.
 */
const surahList = computed<{ surah: number; name: string; verseCount: number }[]>(() => {
  const map = new Map<number, { surah: number; name: string; verseCount: number }>()
  for (const verse of quranStore.verses) {
    const entry = map.get(verse.surah)
    if (entry) {
      entry.verseCount++
    }
    else {
      map.set(verse.surah, { surah: verse.surah, name: verse.surah_name, verseCount: 1 })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.surah - b.surah)
})

/** Verse count for the currently selected surah; 0 when none selected. */
const currentSurahVerseCount = computed<number>(() => {
  if (!selectedSurah.value) return 0
  return surahList.value.find(s => s.surah === selectedSurah.value)?.verseCount ?? 0
})

/** Name of the currently selected surah. */
const currentSurahName = computed<string>(() => {
  if (!selectedSurah.value) return ''
  return surahList.value.find(s => s.surah === selectedSurah.value)?.name ?? ''
})

/** Combined loading flag for spinner / disabled states. */
const isLoading = computed<boolean>(
  () => (quranStore.loading && surahList.value.length === 0) || rangeLoading.value || isResolving.value,
)

/** True when inputs are valid and a surah is selected. */
const isValidSelection = computed<boolean>(() => {
  if (!selectedSurah.value || currentSurahVerseCount.value === 0) return false
  const max = currentSurahVerseCount.value
  return startAyat.value >= 1
    && endAyat.value >= startAyat.value
    && endAyat.value <= max
})

// ── Event Handlers ────────────────────────────────────────────────────────────

function onSurahChange(event: Event): void {
  const val = (event.target as HTMLSelectElement).value
  selectedSurah.value = val ? Number(val) : null
  // Reset range to full surah defaults for the new selection
  startAyat.value = 1
  endAyat.value = currentSurahVerseCount.value || 1
  validationError.value = null
}

// ── Watch: surah change → reset endAyat to last verse ────────────────────────

watch(selectedSurah, () => {
  if (selectedSurah.value && currentSurahVerseCount.value > 0) {
    endAyat.value = currentSurahVerseCount.value
  }
})

// ── Watch: any input change → validate and resolve ────────────────────────────

watch(
  [selectedSurah, startAyat, endAyat],
  async ([surah, start, end]) => {
    // No surah selected — clear output
    if (!surah) {
      validationError.value = null
      emit('update:modelValue', null)
      return
    }

    const maxVerse = currentSurahVerseCount.value

    // Validate
    if (start < 1) {
      validationError.value = 'Ayat awal minimal 1'
      emit('update:modelValue', null)
      return
    }
    if (end < start) {
      validationError.value = 'Ayat akhir harus ≥ ayat awal'
      emit('update:modelValue', null)
      return
    }
    if (maxVerse > 0 && end > maxVerse) {
      validationError.value = `Ayat akhir maksimal ${maxVerse}`
      emit('update:modelValue', null)
      return
    }

    validationError.value = null
    isResolving.value = true
    try {
      const range = await resolveByAyat(surah, start, end)
      emit('update:modelValue', range)
    }
    finally {
      isResolving.value = false
    }
  },
  { immediate: false },
)
</script>

<template>
  <div class="space-y-4">

    <!-- ──────────────────────────────────────────────────────────────────────
         LOADING STATE — while verses are being fetched from Supabase
    ────────────────────────────────────────────────────────────────────── -->
    <div
      v-if="quranStore.loading && surahList.length === 0"
      class="flex items-center gap-2 py-3 text-sm text-gray-400"
      role="status"
      aria-live="polite"
    >
      <svg
        class="w-4 h-4 animate-spin text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      Memuat daftar surat…
    </div>

    <!-- ──────────────────────────────────────────────────────────────────────
         MAIN CONTENT — surah list loaded
    ────────────────────────────────────────────────────────────────────── -->
    <template v-else>

      <!-- ── Surah Dropdown ──────────────────────────────────────────────── -->
      <div>
        <label
          for="by-ayat-select"
          class="block text-xs font-medium text-gray-700 mb-1.5"
        >
          Pilih Surat
        </label>

        <div class="relative">
          <select
            id="by-ayat-select"
            :value="selectedSurah ?? ''"
            class="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-gray-800 shadow-sm transition-all duration-200 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/30 disabled:opacity-50"
            :disabled="isLoading"
            aria-label="Pilih surat Al-Quran"
            @change="onSurahChange"
          >
            <option
              value=""
              disabled
              :selected="!selectedSurah"
            >
              — Pilih surat —
            </option>
            <option
              v-for="s in surahList"
              :key="s.surah"
              :value="s.surah"
              :selected="s.surah === selectedSurah"
            >
              {{ s.surah }}. {{ s.name }} ({{ s.verseCount }} ayat)
            </option>
          </select>

          <!-- Custom chevron icon -->
          <span
            class="pointer-events-none absolute inset-y-0 right-3 flex items-center"
            aria-hidden="true"
          >
            <svg
              class="w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m19.5 8.25-7.5 7.5-7.5-7.5"
              />
            </svg>
          </span>
        </div>
      </div>

      <!-- ── Ayat Inputs (revealed once a surah is chosen) ──────────────── -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-1"
      >
        <div
          v-if="selectedSurah"
          class="space-y-3"
        >

          <!-- Ayat inputs row -->
          <div class="flex items-end gap-2">

            <!-- Ayat Awal -->
            <div class="flex-1">
              <label
                for="by-ayat-start"
                class="block text-xs font-medium text-gray-700 mb-1.5"
              >
                Ayat Awal
              </label>
              <input
                id="by-ayat-start"
                v-model.number="startAyat"
                type="number"
                min="1"
                :max="currentSurahVerseCount"
                inputmode="numeric"
                placeholder="1"
                class="w-full rounded-xl border bg-white px-3.5 py-3 text-sm text-center font-semibold text-gray-800 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50"
                :class="validationError
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30'
                  : 'border-gray-200 focus:border-green-400 focus:ring-green-400/30'"
                :aria-describedby="validationError ? 'by-ayat-error' : undefined"
                :disabled="isResolving"
                aria-label="Nomor ayat awal"
              >
            </div>

            <!-- Separator -->
            <div
              class="pb-3 text-gray-400 font-medium text-sm flex-shrink-0"
              aria-hidden="true"
            >
              —
            </div>

            <!-- Ayat Akhir -->
            <div class="flex-1">
              <label
                for="by-ayat-end"
                class="block text-xs font-medium text-gray-700 mb-1.5"
              >
                Ayat Akhir
              </label>
              <input
                id="by-ayat-end"
                v-model.number="endAyat"
                type="number"
                :min="startAyat"
                :max="currentSurahVerseCount"
                inputmode="numeric"
                :placeholder="String(currentSurahVerseCount)"
                class="w-full rounded-xl border bg-white px-3.5 py-3 text-sm text-center font-semibold text-gray-800 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50"
                :class="validationError
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30'
                  : 'border-gray-200 focus:border-green-400 focus:ring-green-400/30'"
                :aria-describedby="validationError ? 'by-ayat-error' : undefined"
                :disabled="isResolving"
                aria-label="Nomor ayat akhir"
              >
            </div>

          </div>

          <!-- Hint: max verse count -->
          <p
            v-if="!validationError"
            class="text-xs text-gray-400 text-center"
          >
            Surat ini memiliki {{ currentSurahVerseCount }} ayat
          </p>

          <!-- Validation error -->
          <p
            v-if="validationError"
            id="by-ayat-error"
            class="text-xs text-red-500 text-center font-medium"
            role="alert"
          >
            {{ validationError }}
          </p>

          <!-- Resolving spinner -->
          <div
            v-if="isResolving && !validationError"
            class="flex items-center justify-center gap-1.5 text-xs text-gray-400"
            role="status"
            aria-live="polite"
          >
            <svg
              class="w-3.5 h-3.5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Menghitung range…
          </div>

          <!-- ── Confirmation pill (shown when selection is valid) ────────── -->
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="isValidSelection && !validationError"
              class="flex items-center gap-2.5 rounded-xl bg-green-50 border border-green-200 px-3.5 py-2.5"
              role="status"
              aria-live="polite"
            >
              <!-- Checkmark / spinner icon -->
              <span
                class="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0"
                aria-hidden="true"
              >
                <svg
                  v-if="!isResolving"
                  class="w-3.5 h-3.5 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
                <svg
                  v-else
                  class="w-3.5 h-3.5 animate-spin text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              </span>

              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-green-800 truncate">
                  {{ currentSurahName }}
                </p>
                <p class="text-xs text-green-600">
                  Ayat {{ startAyat }}–{{ endAyat }}
                  <span class="text-green-500">
                    ({{ endAyat - startAyat + 1 }} ayat)
                  </span>
                </p>
              </div>
            </div>
          </Transition>

        </div>
      </Transition>

    </template>

  </div>
</template>
