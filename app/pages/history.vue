<script setup lang="ts">
/**
 * pages/history.vue — Halaman Riwayat Sesi
 *
 * 10.1 Fetch dan tampilkan list sesi dengan sesi terbaru di atas
 * 10.2 Filter chip: Semua / Ziyadah / Murojahah / Tilawah / Tadabbur
 * 10.3 Filter tanggal (date range picker)
 * 10.4 Setiap item: ikon proses berwarna, tanggal Hijriah, nama kitab,
 *       summary range, jumlah repetisi
 * 10.5 Tombol hapus per item dengan konfirmasi
 */

import { ref, computed, onMounted } from 'vue'
import type { SessionType } from '~/types/database'
import type { SessionWithEntries } from '~/stores/sessions'

// ── Stores & Composables ──────────────────────────────────────────────────────

const sessionsStore = useSessionsStore()
const quranStore = useQuranStore()
const settingsStore = useSettingsStore()

// ── Constants ─────────────────────────────────────────────────────────────────

const HIJRI_MONTHS_ID = [
  'Muharram', 'Safar', "Rabi'ul Awwal", "Rabi'ul Akhir",
  'Jumadal Ula', 'Jumadal Akhirah', 'Rajab', "Sya'ban",
  'Ramadhan', 'Syawwal', "Dzulqa'dah", 'Dzulhijjah',
]

/**
 * Konfigurasi tampilan per proses — warna & label untuk ikon, chip, badge.
 * Selaras dengan PROCESS_CONFIG di pages/index.vue.
 */
const PROCESS_CONFIG = {
  ziyadah: {
    label: 'Ziyadah',
    abbr: 'Z',
    bgSolid: 'bg-green-500',
    bgLight: 'bg-green-50',
    textColor: 'text-green-700',
    chipActive: 'bg-green-500 text-white border-green-500',
    chipInactive: 'bg-white text-green-700 border-green-200 hover:border-green-300',
  },
  murojahah: {
    label: 'Murojahah',
    abbr: 'M',
    bgSolid: 'bg-blue-500',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-700',
    chipActive: 'bg-blue-500 text-white border-blue-500',
    chipInactive: 'bg-white text-blue-700 border-blue-200 hover:border-blue-300',
  },
  tilawah: {
    label: 'Tilawah',
    abbr: 'T',
    bgSolid: 'bg-orange-500',
    bgLight: 'bg-orange-50',
    textColor: 'text-orange-700',
    chipActive: 'bg-orange-500 text-white border-orange-500',
    chipInactive: 'bg-white text-orange-700 border-orange-200 hover:border-orange-300',
  },
  tadabbur: {
    label: 'Tadabbur',
    abbr: 'D',
    bgSolid: 'bg-purple-500',
    bgLight: 'bg-purple-50',
    textColor: 'text-purple-700',
    chipActive: 'bg-purple-500 text-white border-purple-500',
    chipInactive: 'bg-white text-purple-700 border-purple-200 hover:border-purple-300',
  },
} as const satisfies Record<SessionType, {
  label: string
  abbr: string
  bgSolid: string
  bgLight: string
  textColor: string
  chipActive: string
  chipInactive: string
}>

const PROCESS_ORDER: SessionType[] = ['ziyadah', 'murojahah', 'tilawah', 'tadabbur']

// ── Filter State ──────────────────────────────────────────────────────────────

/** Proses yang sedang difilter — null berarti "Semua" */
const activeTypeFilter = ref<SessionType | null>(null)

/** Input tanggal filter */
const dateFrom = ref<string>('')
const dateTo = ref<string>('')

/** Apakah panel filter tanggal sedang dibuka */
const showDateFilter = ref<boolean>(false)

// ── Delete Confirmation State ─────────────────────────────────────────────────

/** ID sesi yang menunggu konfirmasi hapus */
const pendingDeleteId = ref<string | null>(null)

/** True selama dialog konfirmasi hapus terbuka */
const showDeleteDialog = ref<boolean>(false)

// ── Computed ──────────────────────────────────────────────────────────────────

/** True jika ada filter tanggal yang aktif */
const hasActiveDateFilter = computed(() => !!(dateFrom.value || dateTo.value))

/** Sesi yang menunggu penghapusan (untuk teks di dialog konfirmasi) */
const pendingDeleteSession = computed(
  () => sessionsStore.sessions.find(s => s.session.id === pendingDeleteId.value) ?? null,
)

// ── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Buat ringkasan range dari entries sebuah sesi.
 * Menggunakan cache quran store — tidak ada DB call.
 */
function getRangeSummary(session: SessionWithEntries): string {
  if (!session.entries?.length) return '—'
  if (!quranStore.initialized) return `${session.entries.length} entri`

  const entry = session.entries[0]
  const startVerse = quranStore.verses.find(v => v.id === entry.start_verse_id)
  const endVerse = quranStore.verses.find(v => v.id === entry.end_verse_id)

  if (!startVerse) return `${session.entries.length} entri`

  let summary: string
  if (startVerse.surah === endVerse?.surah) {
    const allVerses = quranStore.versesBySurah(startVerse.surah)
    const isFullSurah
      = startVerse.verse === 1
        && endVerse?.verse === (allVerses.at(-1)?.verse ?? 0)
    summary = isFullSurah
      ? startVerse.surah_name
      : `${startVerse.surah_name} ${startVerse.verse}–${endVerse?.verse}`
  }
  else {
    summary = `${startVerse.surah_name} – ${endVerse?.surah_name ?? '...'}`
  }

  if (session.entries.length > 1) {
    summary += ` +${session.entries.length - 1} lainnya`
  }
  return summary
}

/** Format tanggal Hijriah dari data sesi: "15 Ramadhan 1446 H" */
function formatSessionDate(session: SessionWithEntries): string {
  const { hijri_day, hijri_month, hijri_year } = session.session
  const monthName = HIJRI_MONTHS_ID[hijri_month - 1] ?? `Bln ${hijri_month}`
  return `${hijri_day} ${monthName} ${hijri_year} H`
}

/** Total pengulangan dari seluruh entries dalam satu sesi */
function getTotalRepetitions(session: SessionWithEntries): number {
  return session.entries.reduce((sum, e) => sum + e.repetitions, 0)
}

// ── Filter Actions ────────────────────────────────────────────────────────────

/** Ambil ulang sesi dari store menggunakan filter yang aktif */
async function applyFilters(): Promise<void> {
  await sessionsStore.fetchHistory({
    type: activeTypeFilter.value ?? undefined,
    dateFrom: dateFrom.value || undefined,
    dateTo: dateTo.value || undefined,
  })
}

/** Pilih filter proses lalu langsung ambil ulang data */
async function selectTypeFilter(type: SessionType | null): Promise<void> {
  activeTypeFilter.value = type
  await applyFilters()
}

/** Hapus semua filter (proses + tanggal) dan ambil ulang data */
async function clearAllFilters(): Promise<void> {
  activeTypeFilter.value = null
  dateFrom.value = ''
  dateTo.value = ''
  showDateFilter.value = false
  await applyFilters()
}

/** Hapus hanya filter tanggal dan ambil ulang data */
async function clearDateFilters(): Promise<void> {
  dateFrom.value = ''
  dateTo.value = ''
  showDateFilter.value = false
  await applyFilters()
}

// ── Delete Actions ────────────────────────────────────────────────────────────

/** Buka dialog konfirmasi hapus untuk sesi tertentu */
function requestDelete(sessionId: string): void {
  pendingDeleteId.value = sessionId
  showDeleteDialog.value = true
}

/** Tutup dialog tanpa melakukan hapus */
function cancelDelete(): void {
  pendingDeleteId.value = null
  showDeleteDialog.value = false
}

/** Konfirmasi dan jalankan penghapusan */
async function confirmDelete(): Promise<void> {
  if (!pendingDeleteId.value) return
  await sessionsStore.deleteSession(pendingDeleteId.value)
  pendingDeleteId.value = null
  showDeleteDialog.value = false
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  // Settings diperlukan untuk kalkulasi Maghrib (useHijriDate di komponen lain)
  await settingsStore.loadSettings()

  // Muat data quran (untuk range summary) dan riwayat sesi secara paralel
  await Promise.all([
    quranStore.loadAll(),
    sessionsStore.fetchHistory(),
  ])
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">

    <!-- ══════════════════════════════════════════════════════════════════════
         HEADER — Judul + Filter Chip + Date Range
    ══════════════════════════════════════════════════════════════════════ -->
    <header class="bg-white border-b border-gray-100 sticky top-0 z-10">
      <div class="max-w-lg mx-auto px-4 pt-10 pb-3">

        <!-- Judul halaman -->
        <h1 class="text-xl font-bold text-gray-900 mb-4">
          Riwayat Sesi
        </h1>

        <!-- ─────────────────────────────────────────────────────────────────
             10.2: Filter chip — Semua / Ziyadah / Murojahah / Tilawah / Tadabbur
        ───────────────────────────────────────────────────────────────── -->
        <div
          class="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
          role="group"
          aria-label="Filter proses"
        >
          <!-- Chip "Semua" -->
          <button
            type="button"
            class="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gray-800"
            :class="activeTypeFilter === null
              ? 'bg-gray-800 text-white border-gray-800'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'"
            :aria-pressed="activeTypeFilter === null"
            @click="selectTypeFilter(null)"
          >
            Semua
          </button>

          <!-- Chips per proses -->
          <button
            v-for="type in PROCESS_ORDER"
            :key="type"
            type="button"
            class="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
            :class="activeTypeFilter === type
              ? PROCESS_CONFIG[type].chipActive
              : PROCESS_CONFIG[type].chipInactive"
            :aria-pressed="activeTypeFilter === type"
            @click="selectTypeFilter(type)"
          >
            {{ PROCESS_CONFIG[type].label }}
          </button>

          <!-- Chip "Tanggal" — toggle date filter panel -->
          <button
            type="button"
            class="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors duration-150 inline-flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gray-800"
            :class="hasActiveDateFilter
              ? 'bg-gray-800 text-white border-gray-800'
              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'"
            :aria-pressed="showDateFilter"
            :aria-expanded="showDateFilter"
            aria-controls="date-filter-panel"
            @click="showDateFilter = !showDateFilter"
          >
            <!-- Heroicons: calendar-days outline -->
            <svg
              class="w-3.5 h-3.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
            </svg>
            <span>Tanggal</span>
            <!-- Titik indikator saat filter aktif -->
            <span
              v-if="hasActiveDateFilter"
              class="w-1.5 h-1.5 rounded-full"
              :class="hasActiveDateFilter ? 'bg-white/80' : 'bg-transparent'"
              aria-label="Filter tanggal aktif"
            />
          </button>
        </div>

        <!-- ─────────────────────────────────────────────────────────────────
             10.3: Date range picker — muncul saat chip tanggal diklik
        ───────────────────────────────────────────────────────────────── -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div
            v-if="showDateFilter"
            id="date-filter-panel"
            class="mt-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100"
          >
            <div class="grid grid-cols-2 gap-3">
              <!-- Dari -->
              <div>
                <label
                  for="date-from"
                  class="block text-xs font-medium text-gray-500 mb-1"
                >
                  Dari
                </label>
                <input
                  id="date-from"
                  v-model="dateFrom"
                  type="date"
                  class="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-800"
                  :max="dateTo || undefined"
                >
              </div>
              <!-- Sampai -->
              <div>
                <label
                  for="date-to"
                  class="block text-xs font-medium text-gray-500 mb-1"
                >
                  Sampai
                </label>
                <input
                  id="date-to"
                  v-model="dateTo"
                  type="date"
                  class="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-800"
                  :min="dateFrom || undefined"
                >
              </div>
            </div>

            <!-- Tombol terapkan & hapus filter tanggal -->
            <div class="flex gap-2 mt-3">
              <button
                type="button"
                class="flex-1 py-2.5 text-sm font-semibold bg-gray-800 text-white rounded-lg hover:bg-gray-700 active:scale-95 transition-all duration-150"
                @click="applyFilters(); showDateFilter = false"
              >
                Terapkan
              </button>
              <button
                v-if="hasActiveDateFilter"
                type="button"
                class="py-2.5 px-4 text-sm font-medium bg-white text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all duration-150"
                @click="clearDateFilters"
              >
                Hapus
              </button>
            </div>
          </div>
        </Transition>

      </div>
    </header>

    <!-- ── Main content ──────────────────────────────────────────────────── -->
    <div class="max-w-lg mx-auto px-4 py-4">

      <!-- ════════════════════════════════════════════════════════════════════
           Loading state
      ════════════════════════════════════════════════════════════════════ -->
      <div
        v-if="sessionsStore.loading"
        class="space-y-3"
        aria-label="Memuat riwayat..."
        aria-busy="true"
      >
        <div
          v-for="n in 5"
          :key="n"
          class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
            <div class="flex-1 space-y-2">
              <div class="h-3.5 bg-gray-100 rounded animate-pulse w-2/3" />
              <div class="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
              <div class="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
            </div>
            <div class="w-8 h-8 bg-gray-100 rounded-lg animate-pulse flex-shrink-0" />
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════════════════════════════════
           Error state
      ════════════════════════════════════════════════════════════════════ -->
      <div
        v-else-if="sessionsStore.error"
        class="bg-white rounded-2xl border border-red-100 shadow-sm p-6 text-center"
        role="alert"
      >
        <svg
          class="w-10 h-10 text-red-300 mx-auto mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <p class="text-sm font-semibold text-red-600 mb-1">
          Gagal memuat riwayat
        </p>
        <p class="text-xs text-gray-400 mb-4">
          {{ sessionsStore.error }}
        </p>
        <button
          type="button"
          class="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
          @click="applyFilters"
        >
          Coba lagi
        </button>
      </div>

      <!-- ════════════════════════════════════════════════════════════════════
           10.1 & 10.4: Session list — newest first
      ════════════════════════════════════════════════════════════════════ -->
      <ul
        v-else-if="sessionsStore.sessions.length > 0"
        class="space-y-3"
        aria-label="Daftar sesi"
      >
        <li
          v-for="item in sessionsStore.sessions"
          :key="item.session.id"
          class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div class="flex items-start gap-3 px-4 py-4">

            <!-- 10.4: Process icon — lingkaran berwarna dengan singkatan proses -->
            <span
              class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5"
              :class="PROCESS_CONFIG[item.session.type].bgSolid"
              :title="PROCESS_CONFIG[item.session.type].label"
              aria-hidden="true"
            >
              {{ PROCESS_CONFIG[item.session.type].abbr }}
            </span>

            <!-- 10.4: Session info -->
            <div class="flex-1 min-w-0">

              <!-- Range summary -->
              <p class="text-sm font-semibold text-gray-800 leading-snug">
                {{ getRangeSummary(item) }}
              </p>

              <!-- 10.4: Tanggal Hijriah + Nama kitab -->
              <div class="flex flex-wrap items-center gap-x-1.5 mt-0.5">
                <span class="text-xs text-gray-500">
                  {{ formatSessionDate(item) }}
                </span>
                <template v-if="item.book">
                  <span
                    class="text-gray-200 text-xs"
                    aria-hidden="true"
                  >·</span>
                  <span class="text-xs text-gray-400 truncate max-w-[130px]">
                    {{ item.book.name }}
                  </span>
                </template>
              </div>

              <!-- 10.4: Label proses + jumlah repetisi + catatan -->
              <div class="flex flex-wrap items-center gap-2 mt-2">
                <span
                  class="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full"
                  :class="[
                    PROCESS_CONFIG[item.session.type].bgLight,
                    PROCESS_CONFIG[item.session.type].textColor,
                  ]"
                >
                  {{ PROCESS_CONFIG[item.session.type].label }}
                </span>
                <span class="text-xs text-gray-400 font-medium">
                  {{ getTotalRepetitions(item) }}× ulang
                </span>
                <template v-if="item.session.notes">
                  <span
                    class="text-gray-200 text-xs"
                    aria-hidden="true"
                  >·</span>
                  <span class="text-xs text-gray-400 italic truncate max-w-[100px]">
                    {{ item.session.notes }}
                  </span>
                </template>
              </div>
            </div>

            <!-- 10.5: Tombol hapus -->
            <button
              type="button"
              class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-500 -mt-0.5 -mr-1"
              :aria-label="`Hapus sesi ${getRangeSummary(item)}`"
              @click="requestDelete(item.session.id)"
            >
              <!-- Heroicons: trash outline -->
              <svg
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.75"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>

          </div>
        </li>
      </ul>

      <!-- ════════════════════════════════════════════════════════════════════
           Empty state
      ════════════════════════════════════════════════════════════════════ -->
      <div
        v-else
        class="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-12 text-center"
        aria-label="Tidak ada sesi ditemukan"
      >
        <svg
          class="w-12 h-12 text-gray-200 mx-auto mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>

        <p class="text-sm font-medium text-gray-400 mb-1">
          <template v-if="activeTypeFilter || hasActiveDateFilter">
            Tidak ada sesi yang cocok dengan filter ini
          </template>
          <template v-else>
            Belum ada sesi tercatat
          </template>
        </p>

        <p
          v-if="!activeTypeFilter && !hasActiveDateFilter"
          class="text-xs text-gray-300"
        >
          Mulai catat aktivitas Quranmu
        </p>

        <template v-if="activeTypeFilter || hasActiveDateFilter">
          <button
            type="button"
            class="mt-3 text-sm text-primary-600 font-medium hover:text-primary-700 transition-colors"
            @click="clearAllFilters"
          >
            Hapus semua filter
          </button>
        </template>
        <template v-else>
          <NuxtLink
            to="/input"
            class="mt-4 inline-block px-5 py-2.5 text-sm font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 active:scale-95 transition-all duration-150"
          >
            Catat Sesi Baru
          </NuxtLink>
        </template>
      </div>

      <!-- Spacer bawah -->
      <div
        class="h-2"
        aria-hidden="true"
      />
    </div>

    <!-- ════════════════════════════════════════════════════════════════════
         10.5: Dialog Konfirmasi Hapus (bottom sheet)
    ════════════════════════════════════════════════════════════════════ -->
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showDeleteDialog"
        class="fixed inset-0 z-50 flex items-end justify-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/50"
          aria-hidden="true"
          @click="cancelDelete"
        />

        <!-- Bottom sheet -->
        <Transition
          enter-active-class="transition-transform duration-250 ease-out"
          enter-from-class="translate-y-full"
          enter-to-class="translate-y-0"
          leave-active-class="transition-transform duration-200 ease-in"
          leave-from-class="translate-y-0"
          leave-to-class="translate-y-full"
        >
          <div
            v-if="showDeleteDialog"
            class="relative w-full max-w-lg bg-white rounded-t-3xl px-5 pt-4 pb-10 shadow-2xl"
          >

            <!-- Handle indicator -->
            <div
              class="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6"
              aria-hidden="true"
            />

            <!-- Ikon & teks konfirmasi -->
            <div class="text-center mb-7">
              <div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <svg
                  class="w-8 h-8 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="1.75"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </div>

              <h2
                id="delete-dialog-title"
                class="text-lg font-bold text-gray-900 mb-2"
              >
                Hapus Sesi?
              </h2>

              <p class="text-sm text-gray-500 leading-relaxed px-2">
                <template v-if="pendingDeleteSession">
                  Sesi
                  <span class="font-semibold text-gray-700">{{ getRangeSummary(pendingDeleteSession) }}</span>
                  pada
                  <span class="font-semibold text-gray-700">{{ formatSessionDate(pendingDeleteSession) }}</span>
                  akan dihapus secara permanen beserta semua data aktivitasnya.
                </template>
                <template v-else>
                  Sesi ini akan dihapus secara permanen beserta semua data aktivitasnya.
                </template>
              </p>
            </div>

            <!-- Tombol aksi -->
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                class="py-3.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95 transition-all duration-150"
                @click="cancelDelete"
              >
                Batal
              </button>
              <button
                type="button"
                class="py-3.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 active:scale-95 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                :disabled="sessionsStore.loading"
                @click="confirmDelete"
              >
                <span v-if="sessionsStore.loading">Menghapus...</span>
                <span v-else>Hapus</span>
              </button>
            </div>

          </div>
        </Transition>
      </div>
    </Transition>

  </div>
</template>
