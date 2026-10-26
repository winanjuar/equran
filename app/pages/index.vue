<script setup lang="ts">
/**
 * pages/index.vue — Dashboard
 *
 * Menampilkan:
 *  8.1 Tanggal Hijriah hari ini (nama hari + tanggal + bulan + tahun)
 *  8.2 Kartu "Target Hari Ini" — daftar surat target Tilawah dari hijri_daily_targets
 *  8.3 Tombol shortcut ke /input dengan proses pre-selected
 *  8.4 4 mini heat map (satu per proses, 30 hari terakhir, segmentasi Surat)
 *  8.5 Daftar 5 sesi terbaru
 */

import { ref, computed, onMounted } from 'vue'
import { normalizeIntensity, getIntensityClass } from '~/utils/heatmap'
import type { SessionType } from '~/types/database'
import type { SessionWithEntries } from '~/stores/sessions'

// ── Composables & Stores ──────────────────────────────────────────────────────

const { hijriDate, dayName } = useHijriDate()
const quranStore = useQuranStore()
const sessionsStore = useSessionsStore()
const settingsStore = useSettingsStore()
const { client } = useSupabase()

// ── Constants ─────────────────────────────────────────────────────────────────

const HIJRI_MONTHS_ID = [
  'Muharram', 'Safar', "Rabi'ul Awwal", "Rabi'ul Akhir",
  'Jumadal Ula', 'Jumadal Akhirah', 'Rajab', "Sya'ban",
  'Ramadhan', 'Syawwal', "Dzulqa'dah", 'Dzulhijjah',
]

/**
 * Konfigurasi tampilan untuk setiap proses tracking.
 * Digunakan di tombol shortcut dan header mini heatmap.
 */
const PROCESS_CONFIG = {
  ziyadah: {
    label: 'Ziyadah',
    desc: 'Hafalan Baru',
    abbr: 'Z',
    bgBtn: 'bg-green-500 hover:bg-green-600 active:bg-green-700',
    bgLight: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    dotColor: 'bg-green-500',
  },
  murojahah: {
    label: 'Murojahah',
    desc: 'Ulang Hafalan',
    abbr: 'M',
    bgBtn: 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    dotColor: 'bg-blue-500',
  },
  tilawah: {
    label: 'Tilawah',
    desc: 'Baca Quran',
    abbr: 'T',
    bgBtn: 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700',
    bgLight: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    dotColor: 'bg-orange-500',
  },
  tadabbur: {
    label: 'Tadabbur',
    desc: 'Renungkan',
    abbr: 'D',
    bgBtn: 'bg-purple-500 hover:bg-purple-600 active:bg-purple-700',
    bgLight: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    dotColor: 'bg-purple-500',
  },
} as const satisfies Record<SessionType, {
  label: string
  desc: string
  abbr: string
  bgBtn: string
  bgLight: string
  textColor: string
  borderColor: string
  dotColor: string
}>

const PROCESS_ORDER: SessionType[] = ['ziyadah', 'murojahah', 'tilawah', 'tadabbur']

// ── Reactive State ────────────────────────────────────────────────────────────

/** Peta skor per surah untuk setiap proses (kunci = nomor surah 1–114) */
const heatmapScores = ref<Record<SessionType, Map<number, number>>>({
  ziyadah: new Map(),
  murojahah: new Map(),
  tilawah: new Map(),
  tadabbur: new Map(),
})

const heatmapLoading = ref(false)
const pageReady = ref(false)

// ── Computed ──────────────────────────────────────────────────────────────────

/** Target tilawah hari ini dari hijri_daily_targets */
const todayTargets = computed(() => {
  if (!quranStore.initialized) return []
  return quranStore.getHijriTargets(hijriDate.value.day)
})

/** Nama surat untuk number surah tertentu dari cache quran store */
function getSurahName(surahNumber: number): string {
  if (!quranStore.initialized) return `Surat ${surahNumber}`
  const verse = quranStore.verses.find(v => v.surah === surahNumber)
  return verse?.surah_name ?? `Surat ${surahNumber}`
}

/**
 * Hitung segmen heatmap untuk sebuah proses:
 * 114 entri, masing-masing dengan intensity level 0–5 dan CSS color class.
 */
function buildHeatmapSegments(type: SessionType) {
  const scores = heatmapScores.value[type]
  const normalized = normalizeIntensity(scores)
  return Array.from({ length: 114 }, (_, i) => {
    const surah = i + 1
    const intensity = (normalized.get(surah) ?? 0) as 0 | 1 | 2 | 3 | 4 | 5
    return {
      surah,
      intensity,
      colorClass: getIntensityClass(type, intensity),
    }
  })
}

const heatmapSegments = computed(() =>
  Object.fromEntries(
    PROCESS_ORDER.map(type => [type, buildHeatmapSegments(type)]),
  ) as Record<SessionType, ReturnType<typeof buildHeatmapSegments>>,
)

/** Apakah ada aktivitas di heatmap untuk proses tertentu? */
function hasActivity(type: SessionType): boolean {
  return heatmapScores.value[type].size > 0
}

/** Ringkasan range untuk satu sesi (satu baris di daftar sesi terbaru) */
function getRangeSummary(session: SessionWithEntries): string {
  if (!session.entries?.length) return '—'
  if (!quranStore.initialized) return `${session.entries.length} range`

  const entry = session.entries[0]
  const startVerse = quranStore.verses.find(v => v.id === entry.start_verse_id)
  const endVerse = quranStore.verses.find(v => v.id === entry.end_verse_id)

  if (!startVerse) return `${session.entries.length} range`

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

/** Format tanggal Hijriah dari data sesi */
function formatSessionDate(session: SessionWithEntries): string {
  const { hijri_day, hijri_month, hijri_year } = session.session
  const monthName = HIJRI_MONTHS_ID[hijri_month - 1] ?? `Bln ${hijri_month}`
  return `${hijri_day} ${monthName} ${hijri_year} H`
}

/** Jumlah total pengulangan dari seluruh entries satu sesi */
function getTotalRepetitions(session: SessionWithEntries): number {
  return session.entries.reduce((sum, e) => sum + e.repetitions, 0)
}

// ── Data Fetching ─────────────────────────────────────────────────────────────

/**
 * Ambil data verse_activity_log 30 hari terakhir untuk semua proses,
 * join dengan quran_verses untuk mendapatkan nomor surah,
 * lalu agregasikan skor per surah.
 */
async function fetchHeatmapData(): Promise<void> {
  heatmapLoading.value = true

  const today = new Date()
  const from = new Date(today)
  from.setDate(from.getDate() - 30)

  const fromStr = from.toISOString().slice(0, 10)
  const toStr = today.toISOString().slice(0, 10)

  try {
    await Promise.all(
      PROCESS_ORDER.map(async (type) => {
        const { data, error } = await client
          .from('verse_activity_log')
          .select('score, quran_verses!inner(surah)')
          .eq('session_type', type)
          .gte('session_date', fromStr)
          .lte('session_date', toStr)

        if (error) {
          console.error(`[heatmap] Gagal mengambil data ${type}:`, error.message)
          return
        }

        // Agregasi skor per surah
        const surahScores = new Map<number, number>()
        for (const row of (data ?? [])) {
          const qv = (row as unknown as { quran_verses: { surah: number } }).quran_verses
          if (qv?.surah) {
            surahScores.set(qv.surah, (surahScores.get(qv.surah) ?? 0) + (row.score as number))
          }
        }
        heatmapScores.value[type] = surahScores
      }),
    )
  }
  finally {
    heatmapLoading.value = false
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  // Settings diperlukan untuk kalkulasi waktu Maghrib (useHijriDate)
  await settingsStore.loadSettings()

  // Muat semua data secara paralel
  await Promise.all([
    quranStore.loadAll(),
    sessionsStore.fetchRecent(),
    fetchHeatmapData(),
  ])

  pageReady.value = true
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">

    <!-- ══════════════════════════════════════════════════════════════════════
         HEADER — Tanggal Hijriah
         8.1: nama hari + tanggal + nama bulan + tahun
    ══════════════════════════════════════════════════════════════════════ -->
    <header class="bg-gradient-to-br from-green-600 to-emerald-700 text-white px-4 pt-10 pb-8">
      <!-- Bismillah -->
      <p
        class="text-center text-white/80 text-sm mb-5 leading-relaxed font-light tracking-wide"
        dir="rtl"
        lang="ar"
        aria-hidden="true"
      >
        بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
      </p>

      <!-- Tanggal Hijriah -->
      <div class="text-center">
        <!-- Nama hari -->
        <p class="text-green-200 text-sm font-medium uppercase tracking-widest mb-1">
          {{ dayName }}
        </p>

        <!-- Tanggal + bulan + tahun -->
        <div class="flex items-baseline justify-center gap-2 mb-1">
          <span class="text-5xl font-bold tabular-nums leading-none">
            {{ hijriDate.day }}
          </span>
          <div class="text-left">
            <p class="text-xl font-semibold leading-tight">
              {{ hijriDate.monthName }}
            </p>
            <p class="text-green-200 text-sm leading-tight">
              {{ hijriDate.year }} H
            </p>
          </div>
        </div>
      </div>
    </header>

    <!-- ── Main content ──────────────────────────────────────────────────── -->
    <div class="px-4 py-5 space-y-5 max-w-lg mx-auto">

      <!-- ════════════════════════════════════════════════════════════════════
           8.2: Kartu "Target Hari Ini" — Tilawah
      ════════════════════════════════════════════════════════════════════ -->
      <section aria-labelledby="target-heading">
        <div class="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">

          <!-- Card header -->
          <div class="flex items-center gap-2 px-4 py-3 bg-orange-50 border-b border-orange-100">
            <span class="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" aria-hidden="true" />
            <h2
              id="target-heading"
              class="text-sm font-semibold text-orange-700"
            >
              Target Tilawah Hari Ini
            </h2>
            <span class="ml-auto text-xs text-orange-500 font-medium">
              Hari ke-{{ hijriDate.day }}
            </span>
          </div>

          <!-- Loading state -->
          <div
            v-if="quranStore.loading"
            class="px-4 py-5 space-y-2"
            aria-label="Memuat target..."
          >
            <div
              v-for="n in 3"
              :key="n"
              class="h-4 bg-gray-100 rounded animate-pulse"
              :style="{ width: `${60 + n * 10}%` }"
            />
          </div>

          <!-- Error state -->
          <div
            v-else-if="quranStore.error"
            class="px-4 py-4 text-sm text-red-600"
          >
            Gagal memuat target. Periksa koneksi internet.
          </div>

          <!-- Target list -->
          <ul
            v-else-if="todayTargets.length > 0"
            class="divide-y divide-gray-50"
          >
            <li
              v-for="(target, idx) in todayTargets"
              :key="target.surah"
              class="flex items-center gap-3 px-4 py-3"
            >
              <span
                class="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center flex-shrink-0"
                aria-hidden="true"
              >
                {{ idx + 1 }}
              </span>
              <span class="text-sm font-medium text-gray-800">
                {{ getSurahName(target.surah) }}
              </span>
              <span class="ml-auto text-xs text-gray-400 font-mono">
                Surat {{ target.surah }}
              </span>
            </li>
          </ul>

          <!-- Empty state -->
          <div
            v-else
            class="px-4 py-5 text-center"
          >
            <p class="text-sm text-gray-400">Tidak ada target untuk hari ini.</p>
          </div>

        </div>
      </section>

      <!-- ════════════════════════════════════════════════════════════════════
           8.3: Tombol Shortcut ke /input (4 proses)
      ════════════════════════════════════════════════════════════════════ -->
      <section aria-label="Catat sesi baru">
        <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2.5 px-0.5">
          Catat Sesi Baru
        </h2>
        <div class="grid grid-cols-2 gap-3">
          <NuxtLink
            v-for="type in PROCESS_ORDER"
            :key="type"
            :to="`/input?type=${type}`"
            class="flex items-center gap-3 rounded-xl px-4 py-3.5 text-white transition-all duration-150 shadow-sm active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500"
            :class="PROCESS_CONFIG[type].bgBtn"
            :aria-label="`Catat sesi ${PROCESS_CONFIG[type].label}`"
          >
            <!-- Process icon placeholder (initial letter in circle) -->
            <span
              class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold flex-shrink-0"
              aria-hidden="true"
            >
              {{ PROCESS_CONFIG[type].abbr }}
            </span>
            <div class="min-w-0">
              <p class="text-sm font-bold leading-tight truncate">
                {{ PROCESS_CONFIG[type].label }}
              </p>
              <p class="text-xs text-white/80 leading-tight truncate">
                {{ PROCESS_CONFIG[type].desc }}
              </p>
            </div>
          </NuxtLink>
        </div>
      </section>

      <!-- ════════════════════════════════════════════════════════════════════
           8.4: 4 Mini Heat Map (per proses, 30 hari terakhir, per Surat)
      ════════════════════════════════════════════════════════════════════ -->
      <section aria-label="Aktivitas 30 hari terakhir">
        <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2.5 px-0.5">
          Aktivitas 30 Hari Terakhir
        </h2>

        <div class="grid grid-cols-2 gap-3">
          <div
            v-for="type in PROCESS_ORDER"
            :key="type"
            class="bg-white rounded-xl border p-3 shadow-sm"
            :class="PROCESS_CONFIG[type].borderColor"
          >
            <!-- Card header -->
            <div class="flex items-center gap-1.5 mb-2.5">
              <span
                class="w-2 h-2 rounded-full flex-shrink-0"
                :class="PROCESS_CONFIG[type].dotColor"
                aria-hidden="true"
              />
              <span
                class="text-xs font-semibold truncate"
                :class="PROCESS_CONFIG[type].textColor"
              >
                {{ PROCESS_CONFIG[type].label }}
              </span>
            </div>

            <!-- Heatmap grid (114 surat, setiap kotak = 1 surat) -->
            <div
              v-if="heatmapLoading"
              class="flex flex-wrap gap-[2px]"
              aria-label="Memuat heatmap..."
            >
              <div
                v-for="n in 114"
                :key="n"
                class="w-[5px] h-[5px] rounded-[1px] bg-gray-100 animate-pulse"
              />
            </div>

            <div
              v-else
              class="flex flex-wrap gap-[2px]"
              role="img"
              :aria-label="`Heatmap ${PROCESS_CONFIG[type].label}: distribusi aktivitas per surat`"
            >
              <div
                v-for="seg in heatmapSegments[type]"
                :key="seg.surah"
                class="w-[5px] h-[5px] rounded-[1px]"
                :class="seg.colorClass"
              />
            </div>

            <!-- Legend / summary -->
            <div class="mt-2">
              <p
                v-if="hasActivity(type)"
                class="text-[10px] leading-tight"
                :class="PROCESS_CONFIG[type].textColor"
              >
                {{ heatmapScores[type].size }} surat aktif
              </p>
              <p
                v-else
                class="text-[10px] text-gray-300 leading-tight"
              >
                Belum ada aktivitas
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- ════════════════════════════════════════════════════════════════════
           8.5: Daftar 5 Sesi Terbaru
      ════════════════════════════════════════════════════════════════════ -->
      <section aria-labelledby="recent-heading">
        <div class="flex items-center justify-between mb-2.5 px-0.5">
          <h2
            id="recent-heading"
            class="text-xs font-semibold text-gray-500 uppercase tracking-widest"
          >
            Sesi Terbaru
          </h2>
          <NuxtLink
            to="/history"
            class="text-xs text-primary-600 font-medium hover:text-primary-700"
          >
            Lihat semua →
          </NuxtLink>
        </div>

        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          <!-- Loading state -->
          <div
            v-if="sessionsStore.loading"
            class="divide-y divide-gray-50"
            aria-label="Memuat sesi terbaru..."
          >
            <div
              v-for="n in 3"
              :key="n"
              class="flex items-center gap-3 px-4 py-3.5"
            >
              <div class="w-8 h-8 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
              <div class="flex-1 space-y-1.5">
                <div class="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                <div class="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
              </div>
              <div class="h-3 bg-gray-100 rounded animate-pulse w-8" />
            </div>
          </div>

          <!-- Error state -->
          <div
            v-else-if="sessionsStore.error"
            class="px-4 py-5 text-center"
          >
            <p class="text-sm text-red-500">Gagal memuat sesi terbaru.</p>
          </div>

          <!-- Session list -->
          <ul
            v-else-if="sessionsStore.recentSessions.length > 0"
            class="divide-y divide-gray-50"
          >
            <li
              v-for="item in sessionsStore.recentSessions"
              :key="item.session.id"
              class="flex items-center gap-3 px-4 py-3.5"
            >
              <!-- Process icon -->
              <span
                class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                :class="PROCESS_CONFIG[item.session.type].bgBtn.split(' ')[0]"
                :aria-label="PROCESS_CONFIG[item.session.type].label"
              >
                {{ PROCESS_CONFIG[item.session.type].abbr }}
              </span>

              <!-- Session info -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 truncate">
                  {{ getRangeSummary(item) }}
                </p>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span class="text-xs text-gray-400 truncate">
                    {{ formatSessionDate(item) }}
                  </span>
                  <template v-if="item.book">
                    <span class="text-gray-200 text-xs" aria-hidden="true">·</span>
                    <span class="text-xs text-gray-400 truncate">
                      {{ item.book.name }}
                    </span>
                  </template>
                </div>
              </div>

              <!-- Repetitions badge -->
              <div class="flex-shrink-0 text-right">
                <span
                  class="text-xs font-semibold px-2 py-0.5 rounded-full"
                  :class="[PROCESS_CONFIG[item.session.type].bgLight, PROCESS_CONFIG[item.session.type].textColor]"
                >
                  {{ getTotalRepetitions(item) }}×
                </span>
              </div>
            </li>
          </ul>

          <!-- Empty state -->
          <div
            v-else
            class="px-4 py-8 text-center"
          >
            <svg
              class="w-10 h-10 text-gray-200 mx-auto mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
              />
            </svg>
            <p class="text-sm font-medium text-gray-400">Belum ada sesi tercatat</p>
            <p class="text-xs text-gray-300 mt-1">
              Mulai dengan menekan tombol di atas
            </p>
          </div>

        </div>
      </section>

      <!-- Bottom spacer for safe area -->
      <div class="h-2" aria-hidden="true" />
    </div>

  </div>
</template>
