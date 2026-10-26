<script setup lang="ts">
/**
 * InputStep/RangeEntryList.vue
 *
 * Menampilkan semua range entries yang sudah ditambahkan dalam satu sesi,
 * lengkap dengan nomor urut, label yang mudah dibaca, jumlah pengulangan,
 * dan tombol hapus per entry.
 *
 * Props:
 *   entries     — array RangeEntryDisplay (bisa kosong = empty state)
 *   processType — SessionType | null, untuk color theming
 *
 * Emits:
 *   remove(id)  — ketika user klik tombol hapus pada entry tertentu
 */

import { computed } from 'vue'
import type { SessionType } from '~/types/database'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface RangeEntryDisplay {
  id: string
  label: string         // contoh: "Al-Baqarah: Ayat 1–10" atau "Juz 5"
  repetitions: number
  startVerseId: number
  endVerseId: number
}

// ── Props & Emits ─────────────────────────────────────────────────────────────

const props = defineProps<{
  entries: RangeEntryDisplay[]
  processType: SessionType | null
}>()

const emit = defineEmits<{
  (e: 'remove', id: string): void
}>()

// ── Color Theming ─────────────────────────────────────────────────────────────

interface ThemeClasses {
  cardBg: string
  cardBorder: string
  numberBg: string
  numberText: string
  labelText: string
  metaText: string
  repsBg: string
  repsText: string
  emptyBorder: string
  emptyIcon: string
  emptyText: string
  emptySubtext: string
}

type ThemeKey = NonNullable<SessionType> | 'default'

const THEME_MAP: Record<ThemeKey, ThemeClasses> = {
  ziyadah: {
    cardBg: 'bg-green-50',
    cardBorder: 'border-green-200',
    numberBg: 'bg-green-100',
    numberText: 'text-green-700',
    labelText: 'text-green-900',
    metaText: 'text-green-600',
    repsBg: 'bg-green-100',
    repsText: 'text-green-700',
    emptyBorder: 'border-green-200',
    emptyIcon: 'text-green-300',
    emptyText: 'text-green-800',
    emptySubtext: 'text-green-500',
  },
  murojahah: {
    cardBg: 'bg-blue-50',
    cardBorder: 'border-blue-200',
    numberBg: 'bg-blue-100',
    numberText: 'text-blue-700',
    labelText: 'text-blue-900',
    metaText: 'text-blue-600',
    repsBg: 'bg-blue-100',
    repsText: 'text-blue-700',
    emptyBorder: 'border-blue-200',
    emptyIcon: 'text-blue-300',
    emptyText: 'text-blue-800',
    emptySubtext: 'text-blue-500',
  },
  tilawah: {
    cardBg: 'bg-orange-50',
    cardBorder: 'border-orange-200',
    numberBg: 'bg-orange-100',
    numberText: 'text-orange-700',
    labelText: 'text-orange-900',
    metaText: 'text-orange-600',
    repsBg: 'bg-orange-100',
    repsText: 'text-orange-700',
    emptyBorder: 'border-orange-200',
    emptyIcon: 'text-orange-300',
    emptyText: 'text-orange-800',
    emptySubtext: 'text-orange-500',
  },
  tadabbur: {
    cardBg: 'bg-purple-50',
    cardBorder: 'border-purple-200',
    numberBg: 'bg-purple-100',
    numberText: 'text-purple-700',
    labelText: 'text-purple-900',
    metaText: 'text-purple-600',
    repsBg: 'bg-purple-100',
    repsText: 'text-purple-700',
    emptyBorder: 'border-purple-200',
    emptyIcon: 'text-purple-300',
    emptyText: 'text-purple-800',
    emptySubtext: 'text-purple-500',
  },
  default: {
    cardBg: 'bg-gray-50',
    cardBorder: 'border-gray-200',
    numberBg: 'bg-gray-100',
    numberText: 'text-gray-600',
    labelText: 'text-gray-900',
    metaText: 'text-gray-500',
    repsBg: 'bg-gray-100',
    repsText: 'text-gray-600',
    emptyBorder: 'border-gray-200',
    emptyIcon: 'text-gray-300',
    emptyText: 'text-gray-700',
    emptySubtext: 'text-gray-400',
  },
}

const theme = computed<ThemeClasses>(() =>
  THEME_MAP[props.processType ?? 'default'],
)

// ── Helpers ───────────────────────────────────────────────────────────────────

function removeEntry(id: string): void {
  emit('remove', id)
}

/** Format repetitions as "3×" */
function formatReps(n: number): string {
  return `${n}×`
}
</script>

<template>
  <div>

    <!-- ──────────────────────────────────────────────────────────────────────
         EMPTY STATE
    ────────────────────────────────────────────────────────────────────── -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="entries.length === 0"
        class="rounded-xl border-2 border-dashed px-4 py-8 text-center"
        :class="theme.emptyBorder"
        role="status"
        aria-label="Belum ada range yang ditambahkan"
      >
        <!-- List icon -->
        <div
          class="mx-auto mb-3 w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center"
          aria-hidden="true"
        >
          <svg
            class="w-6 h-6"
            :class="theme.emptyIcon"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.75"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
            />
          </svg>
        </div>

        <p
          class="text-sm font-medium mb-1"
          :class="theme.emptyText"
        >
          Belum ada range ditambahkan
        </p>
        <p
          class="text-xs"
          :class="theme.emptySubtext"
        >
          Pilih range di atas lalu klik "+ Tambah Range"
        </p>
      </div>
    </Transition>

    <!-- ──────────────────────────────────────────────────────────────────────
         ENTRY LIST
    ────────────────────────────────────────────────────────────────────── -->
    <TransitionGroup
      v-if="entries.length > 0"
      tag="ul"
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in absolute w-full"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
      move-class="transition-all duration-200"
      class="relative space-y-2"
      role="list"
      aria-label="Daftar range yang ditambahkan"
    >
      <li
        v-for="(entry, index) in entries"
        :key="entry.id"
        class="flex items-start gap-3 rounded-xl border px-3.5 py-3"
        :class="[theme.cardBg, theme.cardBorder]"
        :aria-label="`Range ${index + 1}: ${entry.label}, ${entry.repetitions} kali`"
      >

        <!-- ── Entry Number Badge ──────────────────────────────────────── -->
        <span
          class="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mt-0.5"
          :class="[theme.numberBg, theme.numberText]"
          aria-hidden="true"
        >
          {{ index + 1 }}
        </span>

        <!-- ── Label & Meta ───────────────────────────────────────────── -->
        <div class="flex-1 min-w-0">
          <!-- Human-readable range label -->
          <p
            class="text-sm font-semibold leading-snug"
            :class="theme.labelText"
          >
            {{ entry.label }}
          </p>

          <!-- Verse ID range (secondary info) -->
          <p
            class="text-xs mt-0.5"
            :class="theme.metaText"
          >
            Ayat ID {{ entry.startVerseId }}–{{ entry.endVerseId }}
          </p>
        </div>

        <!-- ── Repetitions Badge ──────────────────────────────────────── -->
        <span
          class="flex-shrink-0 px-2.5 py-1 rounded-lg text-sm font-bold mt-0.5"
          :class="[theme.repsBg, theme.repsText]"
          :aria-label="`${entry.repetitions} kali pengulangan`"
        >
          {{ formatReps(entry.repetitions) }}
        </span>

        <!-- ── Delete Button ──────────────────────────────────────────── -->
        <button
          type="button"
          class="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 transition-all duration-150 active:scale-[0.92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 hover:bg-red-50 hover:text-red-600"
          :aria-label="`Hapus range ${index + 1}: ${entry.label}`"
          @click="removeEntry(entry.id)"
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
              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
            />
          </svg>
        </button>

      </li>
    </TransitionGroup>

    <!-- ── Summary footer (visible only when there are entries) ─────────── -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <p
        v-if="entries.length > 0"
        class="mt-2 text-xs text-gray-400 text-right"
        aria-live="polite"
      >
        {{ entries.length }} range ditambahkan
      </p>
    </Transition>

  </div>
</template>
