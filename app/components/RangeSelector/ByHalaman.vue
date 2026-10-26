<script setup lang="ts">
/**
 * RangeSelector/ByHalaman.vue
 *
 * Komponen pemilih range berdasarkan Halaman Mushaf Madinah
 * (REQ-3.1, mode 5: by_page).
 *
 * Features:
 * - Number input untuk nomor halaman (1–604)
 * - Validasi: error ditampilkan jika di luar range atau bukan angka
 * - Confirmation pill setelah input valid: nama surat awal–akhir + jumlah ayat
 * - Auto-resolve ke VerseRange saat input valid
 *
 * Props:
 *   modelValue — VerseRange | null (pasangan verse id saat ini)
 * Emits:
 *   update:modelValue — emitted dengan resolved pair atau null jika belum valid
 */

import { ref, computed, watch, onMounted } from 'vue'
import type { VerseRange } from '~/types/app'
import { useQuranStore } from '~/stores/quran'
import { useQuranRange } from '~/composables/useQuranRange'

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_MIN = 1
const PAGE_MAX = 604

// ── Props & Emits ─────────────────────────────────────────────────────────────

defineProps<{
  modelValue: VerseRange | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: VerseRange | null): void
}>()

// ── Store & Composable ────────────────────────────────────────────────────────

const quranStore = useQuranStore()
const { resolveByHalaman, isLoading: rangeLoading } = useQuranRange()

// ── Form State ────────────────────────────────────────────────────────────────

/** Raw string value from the input element */
const pageInput = ref<string>('')

/** True once the user has touched / blurred the input at least once */
const isDirty = ref<boolean>(false)

const isResolving = ref<boolean>(false)

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  if (quranStore.verses.length === 0) {
    await quranStore.loadVerses()
  }
})

// ── Computed ──────────────────────────────────────────────────────────────────

/** Combined loading flag for disabled/spinner states. */
const isLoading = computed<boolean>(
  () => (quranStore.loading && quranStore.verses.length === 0) || rangeLoading.value || isResolving.value,
)

/**
 * Parsed page number — null if empty, NaN, or out of range.
 * Kept as a separate computed so watchers and pill can share it.
 */
const validPage = computed<number | null>(() => {
  if (pageInput.value === '') return null
  const n = Number(pageInput.value)
  if (!Number.isInteger(n) || n < PAGE_MIN || n > PAGE_MAX) return null
  return n
})

/**
 * Validation error message — only shown when input is dirty.
 */
const validationError = computed<string | null>(() => {
  if (!isDirty.value || pageInput.value === '') return null
  const n = Number(pageInput.value)
  if (Number.isNaN(n) || !Number.isInteger(n)) return 'Masukkan angka yang valid.'
  if (n < PAGE_MIN || n > PAGE_MAX) return `Halaman harus antara ${PAGE_MIN} dan ${PAGE_MAX}.`
  return null
})

/**
 * For the selected page, derive the first surah name, last surah name, and
 * total verse count from the in-memory cache.
 */
const pageInfo = computed<{ firstSurah: string; lastSurah: string; verseCount: number } | null>(() => {
  if (!validPage.value || quranStore.verses.length === 0) return null

  const inPage = quranStore.verses.filter(v => v.page === validPage.value)
  if (inPage.length === 0) return null

  // verses are ordered by id (mushaf order: surah then verse)
  const firstSurah = inPage[0].surah_name
  const lastSurah = inPage[inPage.length - 1].surah_name

  return {
    firstSurah,
    lastSurah,
    verseCount: inPage.length,
  }
})

// ── Event Handlers ────────────────────────────────────────────────────────────

function onInput(event: Event): void {
  pageInput.value = (event.target as HTMLInputElement).value
}

function onBlur(): void {
  isDirty.value = true
}

// ── Watch: valid page → resolve ───────────────────────────────────────────────

watch(
  validPage,
  async (page) => {
    if (!page) {
      emit('update:modelValue', null)
      return
    }

    isResolving.value = true
    try {
      const range = await resolveByHalaman(page)
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
      Memuat data halaman…
    </div>

    <!-- ──────────────────────────────────────────────────────────────────────
         MAIN CONTENT — verses loaded
    ────────────────────────────────────────────────────────────────────── -->
    <template v-else>

      <!-- ── Page Number Input ───────────────────────────────────────────── -->
      <div>
        <label
          for="by-halaman-input"
          class="block text-xs font-medium text-gray-700 mb-1.5"
        >
          Nomor Halaman
        </label>

        <input
          id="by-halaman-input"
          type="number"
          inputmode="numeric"
          :min="PAGE_MIN"
          :max="PAGE_MAX"
          :value="pageInput"
          :disabled="isLoading"
          :aria-invalid="validationError !== null"
          :aria-describedby="validationError ? 'by-halaman-error' : 'by-halaman-hint'"
          placeholder="1 – 604"
          class="w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50"
          :class="[
            validationError
              ? 'border-red-300 focus:border-red-400 focus:ring-red-400/30'
              : 'border-gray-200 focus:border-green-400 focus:ring-green-400/30',
          ]"
          @input="onInput"
          @blur="onBlur"
        >

        <!-- Hint text -->
        <p
          v-if="!validationError"
          id="by-halaman-hint"
          class="mt-1.5 text-xs text-gray-400"
        >
          Mushaf Madinah halaman {{ PAGE_MIN }}–{{ PAGE_MAX }}
        </p>

        <!-- Validation error -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <p
            v-if="validationError"
            id="by-halaman-error"
            class="mt-1.5 text-xs text-red-500 flex items-center gap-1"
            role="alert"
          >
            <svg
              class="w-3.5 h-3.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            {{ validationError }}
          </p>
        </Transition>
      </div>

      <!-- ── Confirmation pill (revealed once a valid page is entered) ───── -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="validPage"
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
              Halaman {{ validPage }}
            </p>

            <!-- Secondary info: surah range + verse count -->
            <template v-if="pageInfo">
              <p
                v-if="pageInfo.firstSurah === pageInfo.lastSurah"
                class="text-xs text-green-600 truncate"
              >
                {{ pageInfo.firstSurah }} · {{ pageInfo.verseCount }} ayat
              </p>
              <p
                v-else
                class="text-xs text-green-600 truncate"
              >
                {{ pageInfo.firstSurah }} – {{ pageInfo.lastSurah }} · {{ pageInfo.verseCount }} ayat
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

    </template>

  </div>
</template>
