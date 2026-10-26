<script setup lang="ts">
/**
 * RangeSelector/ByRuku.vue
 *
 * Komponen pemilih range berdasarkan Ruku' (REQ-3.1, mode 4: by_ruku).
 *
 * Features:
 * - Dropdown pertama: pilih surat (1–114)
 * - Dropdown kedua: pilih ruku' ke-N relatif dalam surat (baru muncul setelah surat dipilih)
 * - Opsi ruku' diturunkan dari `quranStore.verses` → max `ruku_in_surah` per surat
 * - Confirmation pill setelah keduanya dipilih: "Ruku' N dari Surat X" + jumlah ayat
 * - Emit null jika salah satu belum dipilih
 *
 * Props:
 *   modelValue — VerseRange | null (pasangan verse id saat ini)
 * Emits:
 *   update:modelValue — emitted dengan resolved pair atau null jika belum lengkap
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
const { resolveByRuku, isLoading: rangeLoading } = useQuranRange()

// ── Form State ────────────────────────────────────────────────────────────────

const selectedSurah = ref<number | null>(null)
const selectedRuku = ref<number | null>(null)
const isResolving = ref<boolean>(false)

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  if (quranStore.verses.length === 0) {
    await quranStore.loadVerses()
  }
})

// ── Computed ──────────────────────────────────────────────────────────────────

/**
 * Derived list of unique surahs from the in-memory cache.
 * Single pass over verses — same pattern as BySurat.vue.
 */
const surahList = computed<{ surah: number; name: string }[]>(() => {
  const map = new Map<number, { surah: number; name: string }>()
  for (const verse of quranStore.verses) {
    if (!map.has(verse.surah)) {
      map.set(verse.surah, { surah: verse.surah, name: verse.surah_name })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.surah - b.surah)
})

/**
 * Maximum ruku_in_surah value for the selected surah.
 * Returns 0 when no surah is selected or cache is empty.
 */
const maxRukuInSurah = computed<number>(() => {
  if (!selectedSurah.value || quranStore.verses.length === 0) return 0
  let max = 0
  for (const v of quranStore.verses) {
    if (v.surah === selectedSurah.value && v.ruku_in_surah > max) {
      max = v.ruku_in_surah
    }
  }
  return max
})

/**
 * Array [1..maxRukuInSurah] used to populate the ruku dropdown.
 */
const rukuList = computed<number[]>(() =>
  maxRukuInSurah.value > 0
    ? Array.from({ length: maxRukuInSurah.value }, (_, i) => i + 1)
    : [],
)

/**
 * Name of the currently selected surah.
 */
const selectedSurahName = computed<string>(() =>
  surahList.value.find(s => s.surah === selectedSurah.value)?.name ?? '',
)

/**
 * Verse count for the currently selected surah + ruku combination.
 * Used in the confirmation pill.
 */
const rukuVerseCount = computed<number>(() => {
  if (!selectedSurah.value || !selectedRuku.value || quranStore.verses.length === 0) return 0
  return quranStore.verses.filter(
    v => v.surah === selectedSurah.value && v.ruku_in_surah === selectedRuku.value,
  ).length
})

/** Combined loading flag for disabled/spinner states. */
const isLoading = computed<boolean>(
  () => (quranStore.loading && quranStore.verses.length === 0) || rangeLoading.value || isResolving.value,
)

// ── Event Handlers ────────────────────────────────────────────────────────────

function onSurahChange(event: Event): void {
  const val = (event.target as HTMLSelectElement).value
  selectedSurah.value = val ? Number(val) : null
  // Reset ruku when surah changes — user must re-select
  selectedRuku.value = null
  emit('update:modelValue', null)
}

function onRukuChange(event: Event): void {
  const val = (event.target as HTMLSelectElement).value
  selectedRuku.value = val ? Number(val) : null
}

// ── Watch: both selections → resolve ─────────────────────────────────────────

watch(
  [selectedSurah, selectedRuku],
  async ([surah, ruku]) => {
    if (!surah || !ruku) {
      emit('update:modelValue', null)
      return
    }

    isResolving.value = true
    try {
      const range = await resolveByRuku(surah, ruku)
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
      Memuat data surat…
    </div>

    <!-- ──────────────────────────────────────────────────────────────────────
         MAIN CONTENT — verses loaded
    ────────────────────────────────────────────────────────────────────── -->
    <template v-else>

      <!-- ── Surah Dropdown ──────────────────────────────────────────────── -->
      <div>
        <label
          for="by-ruku-surah-select"
          class="block text-xs font-medium text-gray-700 mb-1.5"
        >
          Pilih Surat
        </label>

        <div class="relative">
          <select
            id="by-ruku-surah-select"
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
              {{ s.surah }}. {{ s.name }}
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

      <!-- ── Ruku Dropdown (revealed once a surah is chosen) ─────────────── -->
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
          <div>
            <label
              for="by-ruku-ruku-select"
              class="block text-xs font-medium text-gray-700 mb-1.5"
            >
              Pilih Ruku'
            </label>

            <div class="relative">
              <select
                id="by-ruku-ruku-select"
                :value="selectedRuku ?? ''"
                class="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-gray-800 shadow-sm transition-all duration-200 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/30 disabled:opacity-50"
                :disabled="isLoading || rukuList.length === 0"
                aria-label="Pilih nomor ruku dalam surat"
                @change="onRukuChange"
              >
                <option
                  value=""
                  disabled
                  :selected="!selectedRuku"
                >
                  — Pilih ruku' —
                </option>
                <option
                  v-for="n in rukuList"
                  :key="n"
                  :value="n"
                  :selected="n === selectedRuku"
                >
                  Ruku' {{ n }}
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

            <!-- Hint: how many ruku' in this surah -->
            <p class="mt-1.5 text-xs text-gray-400">
              {{ selectedSurahName }} memiliki {{ maxRukuInSurah }} ruku'
            </p>
          </div>

          <!-- ── Confirmation pill (revealed once both are chosen) ──────── -->
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="selectedRuku"
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
                  Ruku' {{ selectedRuku }} dari {{ selectedSurahName }}
                </p>
                <p
                  v-if="!isResolving && rukuVerseCount > 0"
                  class="text-xs text-green-600"
                >
                  {{ rukuVerseCount }} ayat
                </p>
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
