<script setup lang="ts">
/**
 * InputStep/BookSelector.vue
 *
 * Step 2 of the Input form — choose a kitab/mushaf (Quran book/edition).
 *
 * Features:
 * - Dropdown/select listing all books from the `books` store
 * - "Tambah Cepat" inline form to add a new book and auto-select it
 * - Prominent display of the selected book's name
 * - Empty state with a prompt when no books exist
 *
 * Props:
 *   modelValue — currently selected book ID (null = nothing selected)
 * Emits:
 *   update:modelValue — emitted with the selected book ID (or null)
 */

import { ref, computed, onMounted } from 'vue'
import type { Book } from '~/types/database'

// ── Props & Emits ─────────────────────────────────────────────────────────────

const props = defineProps<{
  modelValue: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
}>()

// ── Store ─────────────────────────────────────────────────────────────────────

const booksStore = useBooksStore()

// ── Quick-add form state ──────────────────────────────────────────────────────

const showQuickAdd = ref(false)
const quickAddName = ref('')
const quickAddDescription = ref('')
const quickAddError = ref<string | null>(null)
const nameInputRef = ref<HTMLInputElement | null>(null)

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  if (booksStore.books.length === 0) {
    await booksStore.fetchBooks()
  }
})

// ── Computed ──────────────────────────────────────────────────────────────────

const selectedBook = computed<Book | null>(() =>
  props.modelValue
    ? (booksStore.books.find(b => b.id === props.modelValue) ?? null)
    : null,
)

// ── Helpers ───────────────────────────────────────────────────────────────────

function selectBook(event: Event): void {
  const id = (event.target as HTMLSelectElement).value
  emit('update:modelValue', id || null)
}

async function openQuickAdd(): Promise<void> {
  quickAddName.value = ''
  quickAddDescription.value = ''
  quickAddError.value = null
  showQuickAdd.value = true
  // Focus the name input after the transition renders
  await nextTick()
  nameInputRef.value?.focus()
}

function cancelQuickAdd(): void {
  showQuickAdd.value = false
  quickAddError.value = null
}

async function saveQuickAdd(): Promise<void> {
  const name = quickAddName.value.trim()
  if (!name) {
    quickAddError.value = 'Nama kitab tidak boleh kosong'
    nameInputRef.value?.focus()
    return
  }

  quickAddError.value = null
  const prevCount = booksStore.books.length

  await booksStore.addBook(name, quickAddDescription.value.trim() || undefined)

  if (booksStore.error) {
    quickAddError.value = booksStore.error
    return
  }

  // Auto-select the newly added book (addBook pushes it to the end of the list)
  if (booksStore.books.length > prevCount) {
    const newBook = booksStore.books[booksStore.books.length - 1]
    if (newBook) {
      emit('update:modelValue', newBook.id)
    }
  }

  showQuickAdd.value = false
}
</script>

<template>
  <div>

    <!-- ──────────────────────────────────────────────────────────────────────
         LOADING STATE
    ────────────────────────────────────────────────────────────────────── -->
    <div
      v-if="booksStore.loading && booksStore.books.length === 0"
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
      Memuat daftar kitab…
    </div>

    <!-- ──────────────────────────────────────────────────────────────────────
         MAIN CONTENT (books loaded or empty)
    ────────────────────────────────────────────────────────────────────── -->
    <template v-else>

      <!-- ── Empty state ─────────────────────────────────────────────────── -->
      <div
        v-if="booksStore.books.length === 0 && !showQuickAdd"
        class="rounded-xl border-2 border-dashed border-gray-200 px-4 py-6 text-center"
      >
        <!-- Book icon -->
        <div
          class="mx-auto mb-3 w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center"
          aria-hidden="true"
        >
          <svg
            class="w-6 h-6 text-gray-400"
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
        </div>
        <p class="text-sm font-medium text-gray-700 mb-1">
          Belum ada kitab
        </p>
        <p class="text-xs text-gray-400 mb-4">
          Tambahkan kitab/mushaf pertama kamu
        </p>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-green-600 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
          @click="openQuickAdd"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2.5"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Tambah Kitab
        </button>
      </div>

      <!-- ── Dropdown + Tambah Cepat button ─────────────────────────────── -->
      <div
        v-else-if="!showQuickAdd"
        class="space-y-3"
      >

        <!-- Selected book display pill -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="selectedBook"
            class="flex items-center gap-2.5 rounded-xl bg-green-50 border border-green-200 px-3.5 py-2.5"
            role="status"
            aria-live="polite"
          >
            <span
              class="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              <svg
                class="w-4 h-4 text-green-600"
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
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-green-800 truncate">
                {{ selectedBook.name }}
              </p>
              <p
                v-if="selectedBook.description"
                class="text-xs text-green-600 truncate"
              >
                {{ selectedBook.description }}
              </p>
            </div>
            <svg
              class="w-4 h-4 text-green-500 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
        </Transition>

        <!-- Dropdown row -->
        <div class="flex items-center gap-2">
          <!-- Select element -->
          <div class="relative flex-1">
            <select
              :value="modelValue ?? ''"
              class="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-gray-800 shadow-sm transition-all duration-200 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/30 disabled:opacity-50"
              :aria-label="selectedBook ? `Kitab dipilih: ${selectedBook.name}` : 'Pilih kitab/mushaf'"
              @change="selectBook"
            >
              <option
                value=""
                disabled
                :selected="!modelValue"
              >
                — Pilih kitab/mushaf —
              </option>
              <option
                v-for="book in booksStore.books"
                :key="book.id"
                :value="book.id"
                :selected="book.id === modelValue"
              >
                {{ book.name }}
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
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </span>
          </div>

          <!-- Tambah Cepat button -->
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-xl border border-green-300 bg-green-50 px-3.5 py-3 text-sm font-semibold text-green-700 shadow-sm transition-all duration-200 hover:bg-green-100 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 whitespace-nowrap"
            aria-label="Tambah kitab baru dengan cepat"
            @click="openQuickAdd"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Tambah Cepat
          </button>
        </div>

        <!-- Store-level error (fetch) -->
        <p
          v-if="booksStore.error && !showQuickAdd"
          class="text-xs text-red-500 mt-1"
          role="alert"
        >
          {{ booksStore.error }}
        </p>
      </div>

    </template>

    <!-- ──────────────────────────────────────────────────────────────────────
         QUICK-ADD INLINE FORM
    ────────────────────────────────────────────────────────────────────── -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="showQuickAdd"
        class="rounded-xl border border-green-200 bg-green-50/60 px-4 py-4 space-y-3"
        role="dialog"
        aria-modal="false"
        aria-labelledby="quick-add-title"
      >
        <!-- Form header -->
        <div class="flex items-center justify-between">
          <h3
            id="quick-add-title"
            class="text-sm font-semibold text-green-800"
          >
            Tambah Kitab Baru
          </h3>
          <button
            type="button"
            class="w-7 h-7 rounded-lg flex items-center justify-center text-green-600 hover:bg-green-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            aria-label="Batal tambah kitab"
            @click="cancelQuickAdd"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Name field -->
        <div>
          <label
            for="quick-add-name"
            class="block text-xs font-medium text-gray-700 mb-1"
          >
            Nama Kitab <span class="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="quick-add-name"
            ref="nameInputRef"
            v-model="quickAddName"
            type="text"
            autocomplete="off"
            placeholder="cth. Quran Madinah Merah"
            maxlength="100"
            required
            class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 transition-all duration-200 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/30"
            :class="quickAddError ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30' : ''"
            :aria-describedby="quickAddError ? 'quick-add-error' : undefined"
            aria-required="true"
            @keyup.enter="saveQuickAdd"
            @keyup.esc="cancelQuickAdd"
          >
          <!-- Validation error -->
          <p
            v-if="quickAddError"
            id="quick-add-error"
            class="mt-1 text-xs text-red-500"
            role="alert"
          >
            {{ quickAddError }}
          </p>
        </div>

        <!-- Description field -->
        <div>
          <label
            for="quick-add-description"
            class="block text-xs font-medium text-gray-700 mb-1"
          >
            Deskripsi
            <span class="text-gray-400 font-normal">(opsional)</span>
          </label>
          <input
            id="quick-add-description"
            v-model="quickAddDescription"
            type="text"
            autocomplete="off"
            placeholder="cth. Ukuran saku, untuk bepergian"
            maxlength="200"
            class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 transition-all duration-200 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/30"
            @keyup.enter="saveQuickAdd"
            @keyup.esc="cancelQuickAdd"
          >
        </div>

        <!-- Action buttons -->
        <div class="flex items-center gap-2 pt-1">
          <!-- Save button -->
          <button
            type="button"
            :disabled="booksStore.loading"
            class="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-green-600 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="saveQuickAdd"
          >
            <svg
              v-if="booksStore.loading"
              class="w-4 h-4 animate-spin"
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
            <span>{{ booksStore.loading ? 'Menyimpan…' : 'Simpan Kitab' }}</span>
          </button>
          <!-- Cancel button -->
          <button
            type="button"
            :disabled="booksStore.loading"
            class="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-all duration-200 hover:bg-gray-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:opacity-50"
            @click="cancelQuickAdd"
          >
            Batal
          </button>
        </div>
      </div>
    </Transition>

  </div>
</template>
