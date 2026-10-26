<script setup lang="ts">
/**
 * RangeSelector/ByHariHijriah.vue
 *
 * Komponen read-only untuk mode "By Hari Hijriah" (REQ-3.1 mode 7).
 * Khusus proses Tilawah — REQ-3.2, REQ-4.3, REQ-4.4.
 *
 * Secara otomatis saat mount:
 * 1. Membaca hari Hijriah aktif dari useHijriDate()
 * 2. Memanggil resolveByHijriDay(hijriDay) → VerseRange[]
 * 3. Emit seluruh array range via update:modelValue
 *
 * Kontrak BERBEDA dari komponen RangeSelector lainnya:
 * - modelValue & emit bertipe VerseRange[] | null (array, bukan tunggal)
 *   karena satu hari Hijriah mencakup beberapa surat target (REQ-4.4).
 * - Komponen ini sepenuhnya read-only; tidak ada input dari user.
 *
 * Props:
 *   modelValue — VerseRange[] | null
 * Emits:
 *   update:modelValue — VerseRange[] | null
 */

import { ref, computed, onMounted } from 'vue'
import type { VerseRange } from '~/types/app'
import { useQuranStore } from '~/stores/quran'
import { useQuranRange } from '~/composables/useQuranRange'
import { useHijriDate } from '~/composables/useHijriDate'

// ── Props & Emits ─────────────────────────────────────────────────────────────

defineProps<{
  modelValue: VerseRange[] | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: VerseRange[] | null): void
}>()

// ── Store & Composables ───────────────────────────────────────────────────────

const quranStore = useQuranStore()
const { resolveByHijriDay, isLoading: rangeLoading } = useQuranRange()
const { hijriDate } = useHijriDate()

// ── State ─────────────────────────────────────────────────────────────────────

const isResolving = ref<boolean>(false)
const resolveError = ref<string | null>(null)

/**
 * Daftar surat yang sudah di-resolve, digunakan untuk UI.
 * Diisi setelah resolveTargets() berhasil.
 */
const resolvedTargets = ref<{
  surah: number
  surahName: string
  verseCount: number
  range: VerseRange
}[]>([])

/**
 * True setelah resolveTargets() selesai (berhasil maupun error).
 * Digunakan untuk membedakan "belum dicoba" vs "tidak ada data".
 */
const hasAttempted = ref<boolean>(false)

// ── Computed ──────────────────────────────────────────────────────────────────

/** Gabungan flag loading untuk state spinner */
const isLoading = computed<boolean>(() => rangeLoading.value || isResolving.value)

/** Hari Hijriah aktif (1–30) dari useHijriDate */
const todayHijriDay = computed<number>(() => hijriDate.value.day)

/** Nama bulan Hijriah aktif, misal "Ramadan" */
const todayHijriMonth = computed<string>(() => hijriDate.value.monthName)

/** Tahun Hijriah aktif */
const todayHijriYear = computed<number>(() => hijriDate.value.year)

/**
 * Map surah → surah_name dari verses cache.
 * Diisi setelah verses terload (oleh resolveByHijriDay → ensureVersesLoaded).
 */
const surahNameMap = computed<Map<number, string>>(() => {
  const map = new Map<number, string>()
  for (const v of quranStore.verses) {
    if (!map.has(v.surah)) map.set(v.surah, v.surah_name)
  }
  return map
})

/**
 * Map surah → total ayat dari verses cache.
 */
const surahVerseCountMap = computed<Map<number, number>>(() => {
  const map = new Map<number, number>()
  for (const v of quranStore.verses) {
    map.set(v.surah, (map.get(v.surah) ?? 0) + 1)
  }
  return map
})

/** Total ayat dari semua surat target hari ini */
const totalVerseCount = computed<number>(() =>
  resolvedTargets.value.reduce((sum, t) => sum + t.verseCount, 0),
)

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * Resolve semua range untuk hari Hijriah aktif dari store & Supabase.
 * Dipanggil otomatis saat mount; bisa dipanggil ulang untuk retry.
 */
async function resolveTargets(): Promise<void> {
  resolveError.value = null
  resolvedTargets.value = []
  isResolving.value = true

  try {
    const hijriDay = todayHijriDay.value
    const ranges = await resolveByHijriDay(hijriDay)

    // Setelah resolveByHijriDay, verses & hijriTargets sudah terisi di store
    if (!ranges || ranges.length === 0) {
      emit('update:modelValue', null)
      return
    }

    // Ambil daftar surat terurut (sort_order) untuk mapping ke ranges
    const sortedTargets = [...quranStore.getHijriTargets(hijriDay)]
      .sort((a, b) => a.sort_order - b.sort_order)

    resolvedTargets.value = sortedTargets
      .map((target, idx) => {
        const range = ranges[idx]
        if (!range) return null
        return {
          surah: target.surah,
          surahName: surahNameMap.value.get(target.surah) ?? `Surat ${target.surah}`,
          verseCount: surahVerseCountMap.value.get(target.surah) ?? 0,
          range,
        }
      })
      .filter((t): t is NonNullable<typeof t> => t !== null)

    emit('update:modelValue', ranges)
  }
  catch (err) {
    resolveError.value = err instanceof Error
      ? err.message
      : 'Gagal memuat target harian Hijriah'
    emit('update:modelValue', null)
  }
  finally {
    isResolving.value = false
    hasAttempted.value = true
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  await resolveTargets()
})
</script>

<template>
  <div class="space-y-4">

    <!-- ──────────────────────────────────────────────────────────────────────
         HEADER: Tanggal Hijriah hari ini (selalu ditampilkan)
         Data tersedia seketika dari useHijriDate(), tidak perlu loading.
    ────────────────────────────────────────────────────────────────────── -->
    <div class="relative overflow-hidden rounded-2xl bg-orange-500 px-4 py-5">
      <!-- Decorative background circles -->
      <div
        class="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"
        aria-hidden="true"
      />
      <div
        class="absolute -right-4 -bottom-12 h-40 w-40 rounded-full bg-white/5"
        aria-hidden="true"
      />

      <div class="relative">
        <!-- Top badges row -->
        <div class="flex items-center justify-between gap-2 flex-wrap">

          <!-- Tilawah badge -->
          <span class="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">
            <!-- Book open icon -->
            <svg
              class="w-3 h-3 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
              />
            </svg>
            Tilawah
          </span>

          <!-- "Hari ini" badge -->
          <span class="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">
            <!-- Calendar icon -->
            <svg
              class="w-3 h-3 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
              />
            </svg>
            Hari ini
          </span>

        </div>

        <!-- Main date display -->
        <p
          class="mt-4 text-3xl font-bold leading-none text-white"
          :aria-label="`Hari ke-${todayHijriDay}`"
        >
          Hari ke-<span class="tabular-nums">{{ todayHijriDay }}</span>
        </p>
        <p class="mt-1 text-base font-medium text-white/90">
          {{ todayHijriMonth }} {{ todayHijriYear }} H
        </p>
      </div>
    </div>

    <!-- ──────────────────────────────────────────────────────────────────────
         LOADING STATE
    ────────────────────────────────────────────────────────────────────── -->
    <div
      v-if="isLoading"
      class="flex items-center gap-2.5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <svg
        class="h-4 w-4 flex-shrink-0 animate-spin text-orange-400"
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
      <p class="text-sm text-orange-600">
        Memuat target harian…
      </p>
    </div>

    <!-- ──────────────────────────────────────────────────────────────────────
         ERROR STATE
    ────────────────────────────────────────────────────────────────────── -->
    <div
      v-else-if="resolveError"
      class="rounded-xl border border-red-200 bg-red-50 px-4 py-3"
      role="alert"
    >
      <!-- Error header -->
      <div class="flex items-start gap-2.5">
        <span
          class="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-100"
          aria-hidden="true"
        >
          <svg
            class="h-3 h-3 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-red-700">
            Gagal memuat target harian
          </p>
          <p class="mt-0.5 text-xs text-red-500 leading-relaxed">
            {{ resolveError }}
          </p>
        </div>
      </div>

      <!-- Retry button -->
      <button
        type="button"
        class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors duration-200 hover:bg-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 active:bg-red-300"
        @click="resolveTargets"
      >
        <!-- Refresh icon -->
        <svg
          class="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
          />
        </svg>
        Coba lagi
      </button>
    </div>

    <!-- ──────────────────────────────────────────────────────────────────────
         EMPTY STATE — sudah di-load, tapi tidak ada target untuk hari ini
    ────────────────────────────────────────────────────────────────────── -->
    <div
      v-else-if="hasAttempted && resolvedTargets.length === 0"
      class="rounded-xl border border-orange-200 bg-orange-50 px-4 py-6 text-center"
      role="status"
      aria-live="polite"
    >
      <!-- Moon icon -->
      <div
        class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100"
        aria-hidden="true"
      >
        <svg
          class="h-6 w-6 text-orange-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
          />
        </svg>
      </div>
      <p class="text-sm font-semibold text-orange-800">
        Tidak ada target untuk hari ke-{{ todayHijriDay }}
      </p>
      <p class="mt-1 text-xs leading-relaxed text-orange-600">
        Jadwal tilawah harian tidak tersedia untuk hari Hijriah ini.
      </p>
    </div>

    <!-- ──────────────────────────────────────────────────────────────────────
         RESULTS — semua range berhasil di-resolve
    ────────────────────────────────────────────────────────────────────── -->
    <template v-else-if="resolvedTargets.length > 0">

      <!-- Summary confirmation pill -->
      <div
        class="flex items-center gap-2.5 rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-2.5"
        role="status"
        aria-live="polite"
      >
        <!-- Checkmark badge -->
        <span
          class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-orange-100"
          aria-hidden="true"
        >
          <svg
            class="h-3.5 w-3.5 text-orange-600"
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
        </span>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-orange-800">
            {{ resolvedTargets.length }} surat target
          </p>
          <p class="text-xs text-orange-600">
            {{ totalVerseCount }} ayat · Semua akan ditambahkan otomatis
          </p>
        </div>
      </div>

      <!-- Surah cards list -->
      <div
        class="space-y-2"
        role="list"
        :aria-label="`Daftar ${resolvedTargets.length} surat target hari ke-${todayHijriDay}`"
      >
        <div
          v-for="(target, idx) in resolvedTargets"
          :key="target.surah"
          class="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3.5 py-3 shadow-sm"
          role="listitem"
        >
          <!-- Surah number badge -->
          <span
            class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700"
            aria-hidden="true"
          >
            {{ target.surah }}
          </span>

          <!-- Surah name + verse count -->
          <div class="flex-1 min-w-0">
            <p class="truncate text-sm font-semibold text-gray-800">
              {{ target.surahName }}
            </p>
            <p class="text-xs text-gray-400">
              {{ target.verseCount }} ayat · Seluruh surat
            </p>
          </div>

          <!-- Order indicator -->
          <span
            class="flex-shrink-0 text-xs font-medium text-orange-300"
            :aria-label="`urutan ke-${idx + 1}`"
          >
            #{{ idx + 1 }}
          </span>
        </div>
      </div>

    </template>

    <!-- ──────────────────────────────────────────────────────────────────────
         INFO NOTE (ditampilkan setelah loading selesai)
    ────────────────────────────────────────────────────────────────────── -->
    <p
      v-if="!isLoading"
      class="text-center text-xs leading-relaxed text-gray-400"
    >
      Semua surat target akan ditambahkan sekaligus sebagai entri sesi
    </p>

  </div>
</template>
