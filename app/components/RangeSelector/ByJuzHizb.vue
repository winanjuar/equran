<script setup lang="ts">
/**
 * RangeSelector/ByJuzHizb.vue
 *
 * Komponen pemilih range berdasarkan Juz + Hizb (REQ-3.1, mode 3: by_juz_hizb).
 *
 * Features:
 * - Dropdown pilih juz (1–30) dengan format "Juz N"
 * - Segmented control pilih hizb: Hizb 1 (setengah pertama) / Hizb 2 (setengah kedua)
 * - Keduanya harus dipilih sebelum emit range
 * - Confirmation pill setelah keduanya dipilih, menampilkan info surat awal–akhir + jumlah ayat
 * - Emits { start_verse_id, end_verse_id } saat juz & hizb dipilih, null jika belum
 *
 * Props:
 *   modelValue — VerseRange | null (pasangan verse id saat ini)
 * Emits:
 *   update:modelValue — emitted dengan resolved pair atau null
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
const { resolveByJuzHizb, isLoading: rangeLoading } = useQuranRange()

// ── Form State ────────────────────────────────────────────────────────────────

const selectedJuz = ref<number | null>(null)
const selectedHizb = ref<1 | 2 | null>(null)
const isResolving = ref<boolean>(false)

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  if (quranStore.verses.length === 0) {
    await quranStore.loadVerses()
  }
})

// ── Computed ──────────────────────────────────────────────────────────────────

/** Combined loading flag for spinner indicator. */
const isLoading = computed<boolean>(
  () => (quranStore.loading && quranStore.verses.length === 0) || rangeLoading.value || isResolving.value,
)

/**
 * For the selected juz+hizb, derive the first surah name, last surah name, and
 * total verse count from the in-memory cache.
 */
const hizbInfo = computed<{ firstSurah: string; lastSurah: string; verseCount: number } | null>(() => {
  if (!selectedJuz.value || !selectedHizb.value || quranStore.verses.length === 0) return null

  const inHizb = quranStore.verses.filter(
    v => v.juz === selectedJuz.value && v.hizb_in_juz === selectedHizb.value,
  )
  if (inHizb.length === 0) return null

  // verses are ordered by id which follows mushaf order (surah, then verse)
  const firstSurah = inHizb[0].surah_name
  const lastSurah = inHizb[inHizb.length - 1].surah_name

  return {
    firstSurah,
    lastSurah,
    verseCount: inHizb.length,
  }
})

// ── Event Handlers ────────────────────────────────────────────────────────────

function onJuzChange(event: Event): void {
  const val = (event.target as HTMLSelectElement).value
  selectedJuz.value = val ? Number(val) : null
  // Reset hizb when juz changes so user must re-confirm
  selectedHizb.value = null
}

function setHizb(hizb: 1 | 2): void {
  selectedHizb.value = hizb
}

// ── Watch: juz + hizb selection → resolve ────────────────────────────────────

watch(
  [selectedJuz, selectedHizb],
  async ([juz, hizb]) => {
    if (!juz || !hizb) {
      emit('update:modelValue', null)
      return
    }

    isResolving.value = true
    try {
      const range = await resolveByJuzHizb(juz, hizb)
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
      v-if="quranStore.loading && quranStore.verses.length === 0"
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
      Memuat data juz…
    </div>

    <!-- ──────────────────────────────────────────────────────────────────────
         MAIN CONTENT — verses loaded
    ────────────────────────────────────────────────────────────────────── -->
    <template v-else>

      <!-- ── Juz Dropdown ───────────────────────────────────────────────── -->
      <div>
        <label
          for="by-juz-hizb-select"
          class="block text-xs font-medium text-gray-700 mb-1.5"
        >
          Pilih Juz
        </label>

        <div class="relative">
          <select
            id="by-juz-hizb-select"
            :value="selectedJuz ?? ''"
            class="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-gray-800 shadow-sm transition-all duration-200 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/30 disabled:opacity-50"
            :disabled="isLoading"
            aria-label="Pilih juz Al-Quran"
            @change="onJuzChange"
          >
            <option
              value=""
              disabled
              :selected="!selectedJuz"
            >
              — Pilih juz —
            </option>
            <option
              v-for="n in 30"
              :key="n"
              :value="n"
              :selected="n === selectedJuz"
            >
              Juz {{ n }}
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

      <!-- ── Hizb Segmented Control (revealed once a juz is chosen) ──────── -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-1"
      >
        <div
          v-if="selectedJuz"
          class="space-y-3"
        >
          <!-- Label -->
          <p class="text-xs font-medium text-gray-700">
            Pilih Hizb
          </p>

          <!-- Segmented control -->
          <div
            class="flex rounded-xl border border-gray-200 overflow-hidden text-sm font-medium"
            role="radiogroup"
            aria-label="Pilih setengah juz (hizb)"
          >
            <!-- Hizb 1 — Setengah Pertama -->
            <button
              type="button"
              role="radio"
              :aria-checked="selectedHizb === 1"
              class="flex-1 flex items-center justify-center gap-1.5 py-2.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500"
              :class="selectedHizb === 1
                ? 'bg-green-500 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-50'"
              :disabled="isLoading"
              @click="setHizb(1)"
            >
              <!-- First-half icon (top bar filled) -->
              <svg
                class="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3 4.5h18M3 9h10.5"
                />
              </svg>
              Hizb 1
            </button>

            <!-- Divider -->
            <div
              class="w-px bg-gray-200"
              aria-hidden="true"
            />

            <!-- Hizb 2 — Setengah Kedua -->
            <button
              type="button"
              role="radio"
              :aria-checked="selectedHizb === 2"
              class="flex-1 flex items-center justify-center gap-1.5 py-2.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500"
              :class="selectedHizb === 2
                ? 'bg-green-500 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-50'"
              :disabled="isLoading"
              @click="setHizb(2)"
            >
              <!-- Second-half icon (bottom bar filled) -->
              <svg
                class="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3 15h10.5M3 19.5h18"
                />
              </svg>
              Hizb 2
            </button>
          </div>

          <!-- ── Confirmation pill (revealed once both juz & hizb are chosen) ── -->
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="selectedHizb"
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
                <!-- Primary label -->
                <p class="text-sm font-semibold text-green-800">
                  Juz {{ selectedJuz }} — Hizb {{ selectedHizb }}
                  <span class="font-normal text-green-700 text-xs ml-1">
                    ({{ selectedHizb === 1 ? 'Setengah Pertama' : 'Setengah Kedua' }})
                  </span>
                </p>

                <!-- Secondary info: surah range + verse count -->
                <template v-if="hizbInfo">
                  <p
                    v-if="hizbInfo.firstSurah === hizbInfo.lastSurah"
                    class="text-xs text-green-600 truncate"
                  >
                    {{ hizbInfo.firstSurah }} · {{ hizbInfo.verseCount }} ayat
                  </p>
                  <p
                    v-else
                    class="text-xs text-green-600 truncate"
                  >
                    {{ hizbInfo.firstSurah }} – {{ hizbInfo.lastSurah }} · {{ hizbInfo.verseCount }} ayat
                  </p>
                </template>
                <p
                  v-else-if="isResolving"
                  class="text-xs text-green-500"
                >
                  Menghitung range…
                </p>
              </div>
            </div>
          </Transition>

        </div>
      </Transition>

    </template>

  </div>
</template>
