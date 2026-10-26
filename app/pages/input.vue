<script setup lang="ts">
/**
 * pages/input.vue — Halaman Input / Catat Sesi
 *
 * Multi-step form untuk mencatat sesi kegiatan Quran.
 *
 * Step 1  (task 9.1)  — Pilih proses: Ziyadah / Murojahah / Tilawah / Tadabbur
 * Step 2  (task 9.2)  — Pilih kitab/mushaf
 * Step 3  (task 9.3)  — Pilih tanggal (default: hari ini Hijriah)
 * Step 4  (task 9.4–9.12) — Pilih mode & input range + tombol "+ Tambah Range"
 * Step 5  (task 9.13) — Jumlah pengulangan
 * Step 6  (task 9.14) — Catatan opsional
 * Step 7  (task 9.15) — Tombol Simpan
 */

import { ref, computed, watch } from 'vue'
import type { SessionType } from '~/types/database'
import type { RangeMode, VerseRange } from '~/types/app'
import InputStepProcessSelector from '~/components/InputStep/ProcessSelector.vue'
import InputStepBookSelector from '~/components/InputStep/BookSelector.vue'
import InputStepDateSelector from '~/components/InputStep/DateSelector.vue'
import InputStepRangeEntryList from '~/components/InputStep/RangeEntryList.vue'
import RangeSelectorBySurat from '~/components/RangeSelector/BySurat.vue'
import RangeSelectorByJuz from '~/components/RangeSelector/ByJuz.vue'
import RangeSelectorByJuzHizb from '~/components/RangeSelector/ByJuzHizb.vue'
import RangeSelectorByRuku from '~/components/RangeSelector/ByRuku.vue'
import RangeSelectorByHalaman from '~/components/RangeSelector/ByHalaman.vue'
import RangeSelectorByAyat from '~/components/RangeSelector/ByAyat.vue'
import RangeSelectorByHariHijriah from '~/components/RangeSelector/ByHariHijriah.vue'

// ── Local types ───────────────────────────────────────────────────────────────

/** Single range entry as stored and displayed in the entry list (task 9.12). */
interface RangeEntryItem {
  id: string
  label: string
  repetitions: number
  startVerseId: number
  endVerseId: number
}

/** Tab descriptor for the range mode selector strip. */
interface RangeModeTab {
  mode: RangeMode
  label: string
  /** If true, the tab is only visible when selectedProcess === 'tilawah'. */
  tilawahOnly: boolean
}

// ── Store & Composables ───────────────────────────────────────────────────────

const quranStore = useQuranStore()

// ── Query param: pre-select process from dashboard shortcut ──────────────────

const route = useRoute()

// ── Form State ────────────────────────────────────────────────────────────────

/**
 * Step 1: Proses yang dipilih.
 * Pre-populated jika navigasi berasal dari shortcut di Dashboard (?type=...).
 */
const selectedProcess = ref<SessionType | null>(
  (['ziyadah', 'murojahah', 'tilawah', 'tadabbur'] as SessionType[]).includes(
    route.query.type as SessionType,
  )
    ? (route.query.type as SessionType)
    : null,
)

/** Step 2: ID kitab/mushaf yang dipilih. */
const selectedBookId = ref<string | null>(null)

/**
 * Step 3: Tanggal sesi dalam format ISO (YYYY-MM-DD).
 * Di-default ke tanggal efektif hari ini — mempertimbangkan batas Maghrib
 * agar tanggal Hijriah sudah berganti jika sudah lewat Maghrib. (REQ-5.2)
 */
const { effectiveDate: _todayEffectiveDate, hijriDate } = useHijriDate()

const sessionsStore = useSessionsStore()
const settingsStore = useSettingsStore()

function _dateToLocalIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const selectedDate = ref<string>(_dateToLocalIso(_todayEffectiveDate.value))

/** Step 4: Mode range aktif yang dipilih pengguna. */
const selectedRangeMode = ref<RangeMode>('by_surah')

/**
 * Step 4: Nilai range yang di-emit oleh komponen selector aktif.
 * Hanya digunakan untuk mode selain by_hijri_day.
 */
const currentRange = ref<VerseRange | null>(null)

/**
 * Step 4: Array range yang di-emit oleh RangeSelectorByHariHijriah.
 * Khusus mode by_hijri_day — satu entri per surat target hari ini.
 */
const currentHijriRanges = ref<VerseRange[] | null>(null)

/**
 * Step 4–5: Daftar range entries yang sudah ditambahkan dalam satu sesi.
 * Setiap entry memiliki ID unik, label yang mudah dibaca, verse ID, dan repetisi.
 */
const rangeEntries = ref<RangeEntryItem[]>([])

/** Step 5: Jumlah pengulangan untuk range yang sedang di-input (default 1). */
const repetitions = ref<number>(1)

/** Step 6: Catatan opsional untuk sesi ini. */
const notes = ref<string>('')

// ── Range Mode Tabs Configuration ─────────────────────────────────────────────

const RANGE_MODE_TABS: RangeModeTab[] = [
  { mode: 'by_surah',     label: 'By Surat',       tilawahOnly: false },
  { mode: 'by_juz',       label: 'By Juz',          tilawahOnly: false },
  { mode: 'by_juz_hizb',  label: 'By Juz+Hizb',    tilawahOnly: false },
  { mode: 'by_ruku',      label: "By Ruku'",         tilawahOnly: false },
  { mode: 'by_halaman',   label: 'By Halaman',      tilawahOnly: false },
  { mode: 'by_ayat',      label: 'By Ayat',         tilawahOnly: false },
  { mode: 'by_hijri_day', label: 'By Hari Hijriah', tilawahOnly: true  },
]

// ── Computed ──────────────────────────────────────────────────────────────────

/** Step 1 selesai jika proses sudah dipilih. */
const step1Complete = computed(() => selectedProcess.value !== null)

/** Step 4 selesai jika minimal satu range sudah ditambahkan. */
const step4Complete = computed(() => rangeEntries.value.length > 0)

/**
 * Tab yang tampil di strip.
 * "By Hari Hijriah" hanya ditampilkan ketika selectedProcess === 'tilawah'.
 */
const visibleRangeModes = computed<RangeModeTab[]>(() =>
  RANGE_MODE_TABS.filter(tab => !tab.tilawahOnly || selectedProcess.value === 'tilawah'),
)

/** True jika ada range yang siap ditambahkan ke daftar entries. */
const canAddRange = computed<boolean>(() => {
  if (selectedRangeMode.value === 'by_hijri_day') {
    return (currentHijriRanges.value?.length ?? 0) > 0
  }
  return currentRange.value !== null
})

/** Label tombol Tambah Range — menampilkan jumlah entri untuk by_hijri_day. */
const addRangeLabel = computed<string>(() => {
  if (selectedRangeMode.value === 'by_hijri_day') {
    const count = currentHijriRanges.value?.length ?? 0
    return count > 0
      ? `Tambah Semua Target (${count} surat)`
      : 'Tambah Range'
  }
  return 'Tambah Range'
})

/** Kelas warna tab aktif, disesuaikan dengan proses yang dipilih. */
const activeTabClass = computed<string>(() => {
  switch (selectedProcess.value) {
    case 'ziyadah':   return 'bg-green-500 text-white shadow-sm'
    case 'murojahah': return 'bg-blue-500 text-white shadow-sm'
    case 'tilawah':   return 'bg-orange-500 text-white shadow-sm'
    case 'tadabbur':  return 'bg-purple-500 text-white shadow-sm'
    default:          return 'bg-gray-600 text-white shadow-sm'
  }
})

/** Kelas warna tombol "+ Tambah Range", disesuaikan dengan proses aktif. */
const addButtonClass = computed<string>(() => {
  switch (selectedProcess.value) {
    case 'ziyadah':
      return 'bg-green-500 hover:bg-green-600 active:bg-green-700 text-white focus-visible:ring-green-400'
    case 'murojahah':
      return 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white focus-visible:ring-blue-400'
    case 'tilawah':
      return 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white focus-visible:ring-orange-400'
    case 'tadabbur':
      return 'bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white focus-visible:ring-purple-400'
    default:
      return 'bg-green-500 hover:bg-green-600 active:bg-green-700 text-white focus-visible:ring-green-400'
  }
})

/** Kelas warna tombol stepper +/-, disesuaikan dengan proses aktif. */
const stepperButtonClass = computed<string>(() => {
  switch (selectedProcess.value) {
    case 'ziyadah':
      return 'bg-green-500 hover:bg-green-600 active:bg-green-700 text-white focus-visible:ring-green-400'
    case 'murojahah':
      return 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white focus-visible:ring-blue-400'
    case 'tilawah':
      return 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white focus-visible:ring-orange-400'
    case 'tadabbur':
      return 'bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white focus-visible:ring-purple-400'
    default:
      return 'bg-green-500 hover:bg-green-600 active:bg-green-700 text-white focus-visible:ring-green-400'
  }
})

/** Kelas warna teks angka pada input repetisi, disesuaikan dengan proses aktif. */
const stepperValueClass = computed<string>(() => {
  switch (selectedProcess.value) {
    case 'ziyadah':   return 'text-green-600'
    case 'murojahah': return 'text-blue-600'
    case 'tilawah':   return 'text-orange-600'
    case 'tadabbur':  return 'text-purple-600'
    default:          return 'text-gray-800'
  }
})

// ── Watches ───────────────────────────────────────────────────────────────────

/**
 * Jika proses berubah dari Tilawah, dan mode aktif adalah by_hijri_day,
 * otomatis kembali ke mode default (by_surah).
 */
watch(selectedProcess, (process) => {
  if (process !== 'tilawah' && selectedRangeMode.value === 'by_hijri_day') {
    selectedRangeMode.value = 'by_surah'
    currentRange.value = null
    currentHijriRanges.value = null
  }
})

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * Ganti mode range.
 * Reset current range selection agar selector baru mulai bersih.
 */
function setRangeMode(mode: RangeMode): void {
  if (selectedRangeMode.value === mode) return
  selectedRangeMode.value = mode
  currentRange.value = null
  currentHijriRanges.value = null
}

/** Hasilkan ID unik sederhana untuk setiap range entry. */
function generateEntryId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Hasilkan label human-readable untuk sebuah range berdasarkan mode dan verse data.
 *
 * Mode mapping:
 *   by_surah    → "Al-Baqarah (Seluruh Surat)" | "Al-Baqarah: Ayat 5–10"
 *   by_juz      → "Juz 5"
 *   by_juz_hizb → "Juz 5, Hizb 1"
 *   by_ruku     → "Ruku' 3 dari Al-Baqarah"
 *   by_halaman  → "Halaman 50"
 *   by_ayat     → "Al-Baqarah: Ayat 1–10"
 *   by_hijri_day → "Al-Baqarah (Tilawah Hari ke-15)"
 */
function generateRangeLabel(mode: RangeMode, range: VerseRange): string {
  const allVerses = quranStore.verses
  if (allVerses.length === 0) {
    return `Ayat ID ${range.start_verse_id}–${range.end_verse_id}`
  }

  const startVerse = allVerses.find(v => v.id === range.start_verse_id)
  const endVerse   = allVerses.find(v => v.id === range.end_verse_id)

  if (!startVerse) {
    return `Ayat ID ${range.start_verse_id}–${range.end_verse_id}`
  }

  switch (mode) {
    case 'by_surah': {
      if (!endVerse) return startVerse.surah_name
      // Deteksi apakah range mencakup seluruh surat
      const totalInSurah = allVerses.filter(v => v.surah === startVerse.surah).length
      const isFullSurah = (
        startVerse.surah === endVerse.surah
        && startVerse.verse === 1
        && endVerse.verse === totalInSurah
      )
      return isFullSurah
        ? `${startVerse.surah_name} (Seluruh Surat)`
        : `${startVerse.surah_name}: Ayat ${startVerse.verse}–${endVerse.verse}`
    }

    case 'by_juz':
      return `Juz ${startVerse.juz}`

    case 'by_juz_hizb':
      return `Juz ${startVerse.juz}, Hizb ${startVerse.hizb_in_juz}`

    case 'by_ruku':
      return `Ruku' ${startVerse.ruku_in_surah} dari ${startVerse.surah_name}`

    case 'by_halaman':
      return `Halaman ${startVerse.page}`

    case 'by_ayat': {
      if (!endVerse) return `${startVerse.surah_name}: Ayat ${startVerse.verse}`
      return `${startVerse.surah_name}: Ayat ${startVerse.verse}–${endVerse.verse}`
    }

    case 'by_hijri_day':
      return `${startVerse.surah_name} (Tilawah Hari ke-${hijriDate.value.day})`

    default:
      return `Ayat ID ${range.start_verse_id}–${range.end_verse_id}`
  }
}

/**
 * Tambahkan range yang sedang dipilih ke daftar entries.
 *
 * - Mode by_hijri_day: menambahkan beberapa entries sekaligus (satu per surat target).
 * - Mode lainnya: menambahkan satu entry.
 *
 * Setelah berhasil, current selection di-reset agar user bisa pilih range baru.
 */
function addRange(): void {
  if (!canAddRange.value) return

  const reps = repetitions.value

  if (selectedRangeMode.value === 'by_hijri_day' && currentHijriRanges.value) {
    for (const range of currentHijriRanges.value) {
      rangeEntries.value.push({
        id: generateEntryId(),
        label: generateRangeLabel('by_hijri_day', range),
        repetitions: reps,
        startVerseId: range.start_verse_id,
        endVerseId: range.end_verse_id,
      })
    }
  }
  else if (currentRange.value) {
    rangeEntries.value.push({
      id: generateEntryId(),
      label: generateRangeLabel(selectedRangeMode.value, currentRange.value),
      repetitions: reps,
      startVerseId: currentRange.value.start_verse_id,
      endVerseId: currentRange.value.end_verse_id,
    })
  }

  // Reset selector setelah ditambahkan
  currentRange.value = null
  currentHijriRanges.value = null
}

/** Hapus entry dari daftar berdasarkan ID. */
function removeEntry(id: string): void {
  rangeEntries.value = rangeEntries.value.filter(e => e.id !== id)
}

/** Kurangi repetisi (min 1). */
function decrementRepetitions(): void {
  if (repetitions.value > 1) repetitions.value--
}

/** Tambah repetisi. */
function incrementRepetitions(): void {
  repetitions.value++
}

/**
 * Pastikan nilai repetisi selalu integer >= 1.
 * Dipanggil saat input number kehilangan fokus atau berubah langsung.
 */
function clampRepetitions(): void {
  const val = Math.floor(repetitions.value)
  repetitions.value = isNaN(val) || val < 1 ? 1 : val
}

// ── Save state ─────────────────────────────────────────────────────────────

/** Whether a save operation is currently in flight */
const saving = ref<boolean>(false)

/** Error message from the last failed save attempt, or null */
const saveError = ref<string | null>(null)

// ── Save helpers ────────────────────────────────────────────────────────────

/**
 * Parse an ISO date string (YYYY-MM-DD) into a local Date without
 * timezone offset issues (avoids UTC midnight → previous-day trap).
 */
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

/**
 * canSave — true only when every required field is filled:
 * - A session type is selected
 * - A book/mushaf is selected
 * - A valid date is set (10-char YYYY-MM-DD)
 * - At least one range entry has been added
 */
const canSave = computed<boolean>(() =>
  selectedProcess.value !== null
  && selectedBookId.value !== null
  && selectedDate.value.length === 10
  && rangeEntries.value.length > 0,
)

/**
 * Persist the current form as a session in Supabase.
 *
 * Computes the Hijri date of the *user-selected* date (not today) using
 * toHijriDate() with the user's hijri_offset preference, then delegates
 * the full write (session → entries → verse_activity_log) to sessionsStore.
 *
 * On success  → navigates to /history.
 * On failure  → sets saveError for inline display below the button.
 */
async function handleSave(): Promise<void> {
  if (!canSave.value || saving.value) return
  saveError.value = null
  saving.value = true
  try {
    const dateObj = parseLocalDate(selectedDate.value)
    const hijri = toHijriDate(dateObj, settingsStore.hijri_offset)

    await sessionsStore.saveSession(
      {
        type: selectedProcess.value!,
        book_id: selectedBookId.value,
        date: selectedDate.value,
        hijri_day: hijri.day,
        hijri_month: hijri.month,
        hijri_year: hijri.year,
        notes: notes.value.trim() || null,
      },
      rangeEntries.value.map(e => ({
        start_verse_id: e.startVerseId,
        end_verse_id: e.endVerseId,
        repetitions: e.repetitions,
      })),
    )

    if (sessionsStore.error) {
      // saveSession caught an error internally and stored it in the store
      saveError.value = sessionsStore.error
    }
    else {
      await navigateTo('/history')
    }
  }
  catch (err) {
    saveError.value = err instanceof Error ? err.message : 'Gagal menyimpan sesi. Coba lagi.'
  }
  finally {
    saving.value = false
  }
}

// ── Process display config (untuk header badge setelah step 1 selesai) ────────

const PROCESS_CONFIG = {
  ziyadah: {
    label: 'Ziyadah',
    bgLight: 'bg-green-100',
    textColor: 'text-green-700',
    dotColor: 'bg-green-500',
  },
  murojahah: {
    label: 'Murojahah',
    bgLight: 'bg-blue-100',
    textColor: 'text-blue-700',
    dotColor: 'bg-blue-500',
  },
  tilawah: {
    label: 'Tilawah',
    bgLight: 'bg-orange-100',
    textColor: 'text-orange-700',
    dotColor: 'bg-orange-500',
  },
  tadabbur: {
    label: 'Tadabbur',
    bgLight: 'bg-purple-100',
    textColor: 'text-purple-700',
    dotColor: 'bg-purple-500',
  },
} as const satisfies Record<SessionType, { label: string; bgLight: string; textColor: string; dotColor: string }>
</script>

<template>
  <div class="min-h-screen bg-gray-50">

    <!-- ══════════════════════════════════════════════════════════════════════
         PAGE HEADER
    ══════════════════════════════════════════════════════════════════════ -->
    <header class="bg-white border-b border-gray-100 px-4 pt-10 pb-4 sticky top-0 z-10">
      <div class="max-w-lg mx-auto flex items-center gap-3">
        <!-- Back button -->
        <NuxtLink
          to="/"
          class="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Kembali ke beranda"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </NuxtLink>

        <div class="flex-1">
          <h1 class="text-lg font-bold text-gray-900 leading-tight">
            Catat Sesi
          </h1>
          <!-- Selected process badge -->
          <div
            v-if="selectedProcess"
            class="flex items-center gap-1.5 mt-0.5"
          >
            <span
              class="w-1.5 h-1.5 rounded-full"
              :class="PROCESS_CONFIG[selectedProcess].dotColor"
              aria-hidden="true"
            />
            <span
              class="text-xs font-medium"
              :class="PROCESS_CONFIG[selectedProcess].textColor"
            >
              {{ PROCESS_CONFIG[selectedProcess].label }}
            </span>
          </div>
          <p
            v-else
            class="text-xs text-gray-400 mt-0.5"
          >
            Pilih proses terlebih dahulu
          </p>
        </div>
      </div>
    </header>

    <!-- ══════════════════════════════════════════════════════════════════════
         FORM CONTENT
    ══════════════════════════════════════════════════════════════════════ -->
    <div class="px-4 py-5 space-y-5 max-w-lg mx-auto">

      <!-- ════════════════════════════════════════════════════════════════════
           STEP 1 — Pilih Proses (task 9.1)
      ════════════════════════════════════════════════════════════════════ -->
      <section aria-labelledby="step1-heading">

        <!-- Step header -->
        <div class="flex items-center gap-2 mb-3">
          <span
            class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors duration-200"
            :class="step1Complete
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-600'"
            aria-hidden="true"
          >
            <svg
              v-if="step1Complete"
              class="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="3"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span v-else>1</span>
          </span>
          <h2
            id="step1-heading"
            class="text-sm font-semibold text-gray-700"
          >
            Pilih Proses
          </h2>
        </div>

        <!-- ProcessSelector component -->
        <InputStepProcessSelector
          v-model="selectedProcess"
          aria-describedby="step1-heading"
        />

      </section>

      <!-- ════════════════════════════════════════════════════════════════════
           STEP 2–7 — Ditampilkan setelah step 1 selesai
      ════════════════════════════════════════════════════════════════════ -->
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-3"
        enter-to-class="opacity-100 translate-y-0"
      >
        <div
          v-if="step1Complete"
          class="space-y-4"
          aria-live="polite"
        >

          <!-- Step 2: Pilih Kitab/Mushaf (task 9.2) -->
          <section
            class="bg-white rounded-2xl border border-gray-100 px-4 py-4 shadow-sm"
            aria-labelledby="step2-heading"
          >
            <div class="flex items-center gap-2 mb-3">
              <span
                class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors duration-200"
                :class="selectedBookId
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'"
                aria-hidden="true"
              >
                <svg
                  v-if="selectedBookId"
                  class="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="3"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span v-else>2</span>
              </span>
              <h2
                id="step2-heading"
                class="text-sm font-semibold text-gray-700"
              >
                Kitab / Mushaf
              </h2>
            </div>

            <InputStepBookSelector
              v-model="selectedBookId"
              aria-describedby="step2-heading"
            />
          </section>

          <!-- Step 3: Pilih Tanggal (task 9.3) -->
          <section
            class="bg-white rounded-2xl border border-gray-100 px-4 py-4 shadow-sm"
            aria-labelledby="step3-heading"
          >
            <div class="flex items-center gap-2 mb-3">
              <!--
                Step 3 badge: selalu hijau & centang karena tanggal selalu punya
                nilai default (hari ini), jadi step ini otomatis "selesai".
              -->
              <span
                class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                aria-hidden="true"
              >
                <svg
                  class="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="3"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </span>
              <h2
                id="step3-heading"
                class="text-sm font-semibold text-gray-700"
              >
                Tanggal Sesi
              </h2>
            </div>

            <InputStepDateSelector
              v-model="selectedDate"
              aria-describedby="step3-heading"
            />
          </section>

          <!-- ════════════════════════════════════════════════════════════════
               STEP 4 — Pilih Range Bacaan (task 9.4–9.12)
          ════════════════════════════════════════════════════════════════ -->
          <section
            class="bg-white rounded-2xl border border-gray-100 px-4 py-4 shadow-sm"
            aria-labelledby="step4-heading"
          >

            <!-- Step header -->
            <div class="flex items-center gap-2 mb-4">
              <span
                class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors duration-200"
                :class="step4Complete
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'"
                aria-hidden="true"
              >
                <svg
                  v-if="step4Complete"
                  class="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="3"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span v-else>4</span>
              </span>
              <h2
                id="step4-heading"
                class="text-sm font-semibold text-gray-700"
              >
                Pilih Range Bacaan
              </h2>
            </div>

            <!-- ── Mode Tab Strip (horizontally scrollable chips) ─────────── -->
            <div
              class="-mx-4 px-4 pb-1 overflow-x-auto"
              style="scrollbar-width: none; -ms-overflow-style: none;"
            >
              <div
                class="flex gap-2 w-max min-w-full"
                role="tablist"
                aria-label="Pilih mode range bacaan"
              >
                <button
                  v-for="tab in visibleRangeModes"
                  :key="tab.mode"
                  type="button"
                  role="tab"
                  :aria-selected="selectedRangeMode === tab.mode"
                  class="flex-none rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-gray-400"
                  :class="selectedRangeMode === tab.mode
                    ? activeTabClass
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
                  @click="setRangeMode(tab.mode)"
                >
                  {{ tab.label }}
                </button>
              </div>
            </div>

            <!-- ── Dynamic Range Selector ─────────────────────────────────── -->
            <!-- Each v-if block naturally unmounts/remounts when mode changes,
                 which resets the child component's internal state automatically. -->
            <div class="mt-4">
              <RangeSelectorBySurat
                v-if="selectedRangeMode === 'by_surah'"
                v-model="currentRange"
              />
              <RangeSelectorByJuz
                v-else-if="selectedRangeMode === 'by_juz'"
                v-model="currentRange"
              />
              <RangeSelectorByJuzHizb
                v-else-if="selectedRangeMode === 'by_juz_hizb'"
                v-model="currentRange"
              />
              <RangeSelectorByRuku
                v-else-if="selectedRangeMode === 'by_ruku'"
                v-model="currentRange"
              />
              <RangeSelectorByHalaman
                v-else-if="selectedRangeMode === 'by_halaman'"
                v-model="currentRange"
              />
              <RangeSelectorByAyat
                v-else-if="selectedRangeMode === 'by_ayat'"
                v-model="currentRange"
              />
              <RangeSelectorByHariHijriah
                v-else-if="selectedRangeMode === 'by_hijri_day'"
                v-model="currentHijriRanges"
              />
            </div>

            <!-- ── "+ Tambah Range" Button ─────────────────────────────────── -->
            <button
              type="button"
              :disabled="!canAddRange"
              class="mt-4 w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98]"
              :class="canAddRange
                ? addButtonClass
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'"
              :aria-disabled="!canAddRange"
              @click="addRange"
            >
              <svg
                class="w-4 h-4 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2.5"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {{ addRangeLabel }}
            </button>

            <!-- ── Range Entry List ────────────────────────────────────────── -->
            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              enter-from-class="opacity-0 translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
            >
              <div
                v-if="rangeEntries.length > 0"
                class="mt-5 pt-4 border-t border-gray-100"
              >
                <p class="text-xs font-semibold text-gray-500 mb-3">
                  Range yang ditambahkan
                </p>
                <InputStepRangeEntryList
                  :entries="rangeEntries"
                  :process-type="selectedProcess"
                  @remove="removeEntry"
                />
              </div>
            </Transition>

          </section>

          <!-- Step 5: Jumlah Pengulangan (task 9.13) -->
          <section
            class="bg-white rounded-2xl border border-gray-100 px-4 py-4 shadow-sm"
            aria-labelledby="step5-heading"
          >
            <!-- Step header — selalu ✓ hijau karena repetisi selalu punya default valid -->
            <div class="flex items-center gap-2 mb-4">
              <span
                class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                aria-hidden="true"
              >
                <svg
                  class="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="3"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </span>
              <h2
                id="step5-heading"
                class="text-sm font-semibold text-gray-700"
              >
                Jumlah Pengulangan
              </h2>
            </div>

            <!-- Stepper UI -->
            <div
              class="flex items-center gap-4"
              role="group"
              aria-labelledby="step5-heading"
            >
              <!-- Tombol kurangi -->
              <button
                type="button"
                :disabled="repetitions <= 1"
                class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 active:scale-95"
                :class="repetitions <= 1
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  : stepperButtonClass"
                aria-label="Kurangi pengulangan"
                @click="decrementRepetitions"
              >
                −
              </button>

              <!-- Input + label -->
              <div class="flex-1 flex flex-col items-center gap-0.5">
                <input
                  v-model.number="repetitions"
                  type="number"
                  min="1"
                  inputmode="numeric"
                  class="w-full text-center text-4xl font-extrabold bg-transparent border-none outline-none focus:ring-0 p-0 leading-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  :class="stepperValueClass"
                  aria-label="Jumlah pengulangan"
                  @change="clampRepetitions"
                  @blur="clampRepetitions"
                >
                <span class="text-xs text-gray-400 select-none">
                  {{ repetitions }} kali
                </span>
              </div>

              <!-- Tombol tambah -->
              <button
                type="button"
                class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 active:scale-95"
                :class="stepperButtonClass"
                aria-label="Tambah pengulangan"
                @click="incrementRepetitions"
              >
                +
              </button>
            </div>
          </section>

          <!-- Step 6: Catatan Opsional (task 9.14) -->
          <section
            class="bg-white rounded-2xl border border-gray-100 px-4 py-4 shadow-sm"
            aria-labelledby="step6-heading"
          >
            <!-- Step header — selalu ✓ hijau karena catatan bersifat opsional -->
            <div class="flex items-center gap-2 mb-3">
              <span
                class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                aria-hidden="true"
              >
                <svg
                  class="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="3"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </span>
              <h2
                id="step6-heading"
                class="text-sm font-semibold text-gray-700"
              >
                Catatan
                <span class="text-gray-400 font-normal">(opsional)</span>
              </h2>
            </div>

            <!-- Textarea + character count -->
            <div class="relative">
              <textarea
                v-model="notes"
                :maxlength="500"
                rows="3"
                placeholder="Tambahkan catatan opsional..."
                class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm text-gray-800 placeholder-gray-400 resize-none leading-relaxed transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent"
                :class="selectedProcess === 'ziyadah'    ? 'focus:ring-green-400'
                      : selectedProcess === 'murojahah' ? 'focus:ring-blue-400'
                      : selectedProcess === 'tilawah'   ? 'focus:ring-orange-400'
                      : selectedProcess === 'tadabbur'  ? 'focus:ring-purple-400'
                      : 'focus:ring-gray-400'"
                aria-labelledby="step6-heading"
                aria-describedby="notes-char-count"
              />
              <p
                id="notes-char-count"
                class="mt-1.5 text-right text-xs tabular-nums"
                :class="notes.length >= 480 ? 'text-orange-500' : 'text-gray-400'"
                aria-live="polite"
                aria-atomic="true"
              >
                {{ notes.length }} / 500
              </p>
            </div>
          </section>

          <!-- Step 7: Tombol Simpan (task 9.15) -->
          <section aria-label="Simpan sesi">

            <!-- Save button — dynamic: enabled only when canSave, shows spinner while saving -->
            <button
              type="button"
              :disabled="!canSave || saving"
              class="w-full rounded-2xl py-4 text-base font-bold text-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98]"
              :class="[
                selectedProcess === 'ziyadah'    ? 'bg-green-500 focus-visible:ring-green-400'
                : selectedProcess === 'murojahah' ? 'bg-blue-500 focus-visible:ring-blue-400'
                : selectedProcess === 'tilawah'   ? 'bg-orange-500 focus-visible:ring-orange-400'
                :                                   'bg-purple-500 focus-visible:ring-purple-400',
                (!canSave || saving) ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90',
              ]"
              :aria-disabled="!canSave || saving"
              @click="handleSave"
            >
              <!-- Loading state -->
              <span
                v-if="saving"
                class="flex items-center justify-center gap-2"
              >
                <svg
                  class="w-5 h-5 animate-spin flex-shrink-0"
                  xmlns="http://www.w3.org/2000/svg"
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
                Menyimpan...
              </span>
              <!-- Idle state -->
              <span v-else>Simpan Sesi</span>
            </button>

            <!-- Hint text shown while form is incomplete -->
            <p
              v-if="!canSave"
              class="text-center text-xs text-gray-400 mt-2"
            >
              Lengkapi pilihan kitab dan range untuk mengaktifkan tombol simpan
            </p>

            <!-- Dismissible save-error alert -->
            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              enter-from-class="opacity-0 translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition-all duration-150 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 translate-y-1"
            >
              <div
                v-if="saveError"
                class="mt-3 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3"
                role="alert"
              >
                <!-- Warning icon -->
                <svg
                  class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
                <!-- Error message -->
                <p class="flex-1 text-sm text-red-700">
                  {{ saveError }}
                </p>
                <!-- Dismiss button -->
                <button
                  type="button"
                  class="text-red-400 hover:text-red-600 transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1 rounded"
                  aria-label="Tutup pesan error"
                  @click="saveError = null"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </Transition>

          </section>

        </div>
      </Transition>

      <!-- Bottom spacer for safe area -->
      <div class="h-4" aria-hidden="true" />

    </div>
  </div>
</template>
