<script setup lang="ts">
/**
 * InputStep/ProcessSelector.vue
 *
 * Step 1 of the Input form — choose a Quran tracking process.
 * Displays 4 large color-coded buttons: Ziyadah, Murojahah, Tilawah, Tadabbur.
 *
 * Props:
 *   modelValue — currently selected SessionType (null = nothing selected)
 * Emits:
 *   update:modelValue — emitted with the newly selected SessionType on click
 */

import type { SessionType } from '~/types/database'

// ── Props & Emits ─────────────────────────────────────────────────────────────

const props = defineProps<{
  modelValue: SessionType | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: SessionType): void
}>()

// ── Process Option Definitions ────────────────────────────────────────────────

interface ProcessOption {
  type: SessionType
  label: string
  description: string
  // Inactive card
  bgInactive: string
  borderInactive: string
  iconBg: string
  iconColor: string
  textLabel: string
  textDesc: string
  // Active (selected) card
  bgActive: string
  borderActive: string
  ringColor: string
}

const PROCESS_OPTIONS: ProcessOption[] = [
  {
    type: 'ziyadah',
    label: 'Ziyadah',
    description: 'Menambah hafalan baru',
    bgInactive: 'bg-green-50',
    borderInactive: 'border-green-200',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    textLabel: 'text-green-800',
    textDesc: 'text-green-500',
    bgActive: 'bg-green-500',
    borderActive: 'border-green-500',
    ringColor: 'ring-green-500',
  },
  {
    type: 'murojahah',
    label: 'Murojahah',
    description: 'Mengulang hafalan',
    bgInactive: 'bg-blue-50',
    borderInactive: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    textLabel: 'text-blue-800',
    textDesc: 'text-blue-500',
    bgActive: 'bg-blue-500',
    borderActive: 'border-blue-500',
    ringColor: 'ring-blue-500',
  },
  {
    type: 'tilawah',
    label: 'Tilawah',
    description: 'Membaca Al-Quran',
    bgInactive: 'bg-orange-50',
    borderInactive: 'border-orange-200',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    textLabel: 'text-orange-800',
    textDesc: 'text-orange-500',
    bgActive: 'bg-orange-500',
    borderActive: 'border-orange-500',
    ringColor: 'ring-orange-500',
  },
  {
    type: 'tadabbur',
    label: 'Tadabbur',
    description: 'Merenungkan & memahami',
    bgInactive: 'bg-purple-50',
    borderInactive: 'border-purple-200',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    textLabel: 'text-purple-800',
    textDesc: 'text-purple-500',
    bgActive: 'bg-purple-500',
    borderActive: 'border-purple-500',
    ringColor: 'ring-purple-500',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function isSelected(type: SessionType): boolean {
  return props.modelValue === type
}

function select(type: SessionType): void {
  emit('update:modelValue', type)
}
</script>

<template>
  <!--
    Role="radiogroup" groups the 4 exclusive-choice buttons semantically.
    Each button uses role="radio" + aria-checked to convey selection state
    to assistive technologies.
  -->
  <div
    class="grid grid-cols-2 gap-3"
    role="radiogroup"
    aria-label="Pilih proses kegiatan"
  >
    <button
      v-for="option in PROCESS_OPTIONS"
      :key="option.type"
      type="button"
      role="radio"
      :aria-checked="isSelected(option.type)"
      :aria-label="`${option.label} — ${option.description}`"
      class="relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 px-3 py-6 text-center transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      :class="[
        isSelected(option.type)
          ? [option.bgActive, option.borderActive, option.ringColor, 'shadow-lg shadow-black/10']
          : [option.bgInactive, option.borderInactive, 'hover:shadow-sm'],
      ]"
      @click="select(option.type)"
    >

      <!-- ── Checkmark badge (shown when selected) ─────────────────────── -->
      <Transition
        enter-active-class="transition-all duration-200"
        enter-from-class="opacity-0 scale-50"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition-all duration-150"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-50"
      >
        <span
          v-if="isSelected(option.type)"
          class="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-white/30 flex items-center justify-center"
          aria-hidden="true"
        >
          <svg
            class="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="3"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </span>
      </Transition>

      <!-- ── Icon container ─────────────────────────────────────────────── -->
      <span
        class="w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-200"
        :class="isSelected(option.type) ? 'bg-white/20' : option.iconBg"
        aria-hidden="true"
      >

        <!-- Ziyadah: Academic-cap — memorizing new verses -->
        <svg
          v-if="option.type === 'ziyadah'"
          class="w-6 h-6 transition-colors duration-200"
          :class="isSelected(option.type) ? 'text-white' : option.iconColor"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.75"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 3.741-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"
          />
        </svg>

        <!-- Murojahah: Arrow-path — reviewing/repeating -->
        <svg
          v-else-if="option.type === 'murojahah'"
          class="w-6 h-6 transition-colors duration-200"
          :class="isSelected(option.type) ? 'text-white' : option.iconColor"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.75"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
          />
        </svg>

        <!-- Tilawah: Book-open — reading the Quran -->
        <svg
          v-else-if="option.type === 'tilawah'"
          class="w-6 h-6 transition-colors duration-200"
          :class="isSelected(option.type) ? 'text-white' : option.iconColor"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.75"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
          />
        </svg>

        <!-- Tadabbur: Light-bulb — contemplation and understanding -->
        <svg
          v-else-if="option.type === 'tadabbur'"
          class="w-6 h-6 transition-colors duration-200"
          :class="isSelected(option.type) ? 'text-white' : option.iconColor"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.75"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
          />
        </svg>

      </span>

      <!-- ── Label & description ─────────────────────────────────────────── -->
      <div class="flex flex-col gap-0.5">
        <p
          class="text-base font-bold leading-tight transition-colors duration-200"
          :class="isSelected(option.type) ? 'text-white' : option.textLabel"
        >
          {{ option.label }}
        </p>
        <p
          class="text-xs leading-tight transition-colors duration-200"
          :class="isSelected(option.type) ? 'text-white/75' : option.textDesc"
        >
          {{ option.description }}
        </p>
      </div>

    </button>
  </div>
</template>
