<script setup lang="ts">
/**
 * InputStep/DateSelector.vue
 *
 * Step 3 of the Input form — pilih tanggal sesi.
 *
 * Menampilkan tanggal yang dipilih dalam format Hijriah secara prominent,
 * dengan tanggal Masehi sebagai info sekunder.
 *
 * Konversi Hijriah mempertimbangkan hijri_offset dari settings store.
 * Tombol "Hari ini" mereset ke tanggal efektif (dengan batas Maghrib).
 *
 * Props:
 *   modelValue — tanggal sesi dalam format ISO (YYYY-MM-DD)
 * Emits:
 *   update:modelValue — emitted dengan ISO date string baru saat tanggal berubah
 */

import { computed } from 'vue'
import { toHijriDate } from '~/utils/hijri'

// ── Props & Emits ─────────────────────────────────────────────────────────────

const props = defineProps<{
  modelValue: string // ISO YYYY-MM-DD
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

// ── Composables & Stores ──────────────────────────────────────────────────────

const settingsStore = useSettingsStore()

/**
 * effectiveDate dari useHijriDate — tanggal Gregorian yang aktif berdasarkan
 * batas Maghrib (bisa hari ini atau besok setelah Maghrib). (REQ-5.2)
 */
const { effectiveDate } = useHijriDate()

// ── Constants ─────────────────────────────────────────────────────────────────

/** Nama bulan Hijriah dalam Bahasa Indonesia (1-indexed, sesuai spec) */
const HIJRI_MONTH_NAMES_ID = [
  'Muharram',
  'Safar',
  "Rabi'ul Awwal",
  "Rabi'ul Akhir",
  'Jumadil Awwal',
  'Jumadil Akhir',
  'Rajab',
  "Sya'ban",
  'Ramadan',
  'Syawal',
  "Dzulqa'dah",
  'Dzulhijjah',
] as const

/** Nama hari dalam Bahasa Indonesia (indeks 0 = Ahad/Minggu, 6 = Sabtu) */
const INDONESIAN_DAY_NAMES = [
  'Ahad',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  "Jum'at",
  'Sabtu',
] as const

/** Nama bulan Masehi dalam Bahasa Indonesia */
const GREGORIAN_MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse YYYY-MM-DD sebagai tanggal lokal (menghindari UTC midnight shift).
 * `new Date('2024-03-15')` menghasilkan UTC midnight, yang di zona waktu +7
 * akan menjadi 07:00 WIB — tanggal tetap benar. Namun konstruksi manual
 * lebih eksplisit dan portable.
 */
function parseLocalDate(isoStr: string): Date {
  const parts = isoStr.split('-').map(Number)
  return new Date(parts[0]!, parts[1]! - 1, parts[2]!)
}

/**
 * Format Date sebagai YYYY-MM-DD menggunakan komponen waktu lokal,
 * menghindari UTC offset yang terjadi jika menggunakan toISOString().
 */
function dateToLocalIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ── Computed ──────────────────────────────────────────────────────────────────

/** ISO date hari ini berdasarkan tanggal efektif (mempertimbangkan Maghrib) */
const todayIso = computed(() => dateToLocalIso(effectiveDate.value))

/** True jika tanggal yang dipilih sama dengan hari ini (tanggal efektif) */
const isToday = computed(() => props.modelValue === todayIso.value)

/** Tanggal Hijriah yang bersesuaian dengan modelValue, dengan offset koreksi */
const selectedHijri = computed(() => {
  try {
    return toHijriDate(parseLocalDate(props.modelValue), settingsStore.hijri_offset)
  }
  catch {
    return null
  }
})

/** Nama bulan Hijriah dalam Bahasa Indonesia */
const hijriMonthName = computed((): string => {
  if (!selectedHijri.value) return ''
  return HIJRI_MONTH_NAMES_ID[selectedHijri.value.month - 1] ?? ''
})

/** Nama hari dalam Bahasa Indonesia untuk tanggal yang dipilih */
const selectedDayName = computed((): string => {
  try {
    return INDONESIAN_DAY_NAMES[parseLocalDate(props.modelValue).getDay()] ?? 'Ahad'
  }
  catch {
    return ''
  }
})

/**
 * Tanggal Hijriah diformat secara prominent — contoh: "Sabtu, 15 Ramadan 1446 H"
 */
const hijriFormatted = computed((): string => {
  if (!selectedHijri.value) return '—'
  const { day, year } = selectedHijri.value
  return `${selectedDayName.value}, ${day} ${hijriMonthName.value} ${year} H`
})

/**
 * Tanggal Masehi sebagai info sekunder — contoh: "15 Maret 2025 M"
 */
const gregorianFormatted = computed((): string => {
  try {
    const date = parseLocalDate(props.modelValue)
    const monthName = GREGORIAN_MONTH_NAMES_ID[date.getMonth()]
    return `${date.getDate()} ${monthName} ${date.getFullYear()} M`
  }
  catch {
    return props.modelValue
  }
})

// ── Event Handlers ────────────────────────────────────────────────────────────

function onDateChange(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  if (value) emit('update:modelValue', value)
}

function resetToToday(): void {
  emit('update:modelValue', todayIso.value)
}
</script>

<template>
  <div class="space-y-3">

    <!-- ── Hijri date display ────────────────────────────────────────────── -->
    <div
      class="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3.5"
      role="status"
      aria-live="polite"
      :aria-label="`Tanggal sesi: ${hijriFormatted}, ${gregorianFormatted}`"
    >

      <!-- Calendar icon -->
      <span
        class="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0"
        aria-hidden="true"
      >
        <svg
          class="w-5 h-5 text-emerald-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.75"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
          />
        </svg>
      </span>

      <!-- Date text -->
      <div class="flex-1 min-w-0">
        <!-- Hijri date: prominent primary display -->
        <p class="text-base font-bold text-gray-900 leading-tight">
          {{ hijriFormatted }}
        </p>
        <!-- Gregorian date: secondary info -->
        <p class="text-xs text-gray-500 mt-0.5">
          {{ gregorianFormatted }}
        </p>
      </div>

      <!-- "Hari ini" badge — shown when selected date equals today's effective date -->
      <Transition
        enter-active-class="transition-all duration-200"
        enter-from-class="opacity-0 scale-75"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition-all duration-150"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-75"
      >
        <span
          v-if="isToday"
          class="flex-shrink-0 rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-semibold text-white"
        >
          Hari ini
        </span>
      </Transition>

    </div>

    <!-- ── Date picker row ────────────────────────────────────────────────── -->
    <div class="flex items-center gap-2">

      <!-- Native Gregorian date input -->
      <div class="relative flex-1">
        <input
          :value="modelValue"
          type="date"
          class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm font-medium text-gray-800 shadow-sm transition-all duration-200 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 [color-scheme:light]"
          aria-label="Pilih tanggal dalam format Masehi"
          @change="onDateChange"
        >
      </div>

      <!-- "Hari ini" reset button — only shown when the selected date ≠ today -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 scale-90"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-90"
      >
        <button
          v-if="!isToday"
          type="button"
          class="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition-all duration-200 hover:bg-emerald-100 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 whitespace-nowrap"
          aria-label="Reset tanggal ke hari ini"
          @click="resetToToday"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          Hari ini
        </button>
      </Transition>

    </div>

  </div>
</template>
