/**
 * books store — manages the list of kitab/mushaf from the `books` table.
 *
 * Provides CRUD actions (fetch, add, update, delete) that stay in sync with
 * Supabase, and exposes reactive state consumed by the UI.
 *
 * All Supabase access goes through the useSupabase() composable — never a
 * direct import of the client.
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Book } from '~/types/database'

export const useBooksStore = defineStore('books', () => {
  // Initialise Supabase helpers once at store setup time (safe for Nuxt composables)
  const { books: booksApi } = useSupabase()

  // ── Reactive state ─────────────────────────────────────────────────────────
  const books = ref<Book[]>([])

  /** True while any async operation is in flight */
  const loading = ref<boolean>(false)
  /** Last error message, or null if no error */
  const error = ref<string | null>(null)

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Fetch all rows from `books` ordered by `created_at` ascending and
   * populate the reactive `books` list.
   */
  async function fetchBooks(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { data, error: sbError } = await booksApi.getAll()
      if (sbError) throw sbError
      books.value = data ?? []
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch books'
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Insert a new book into `books` and append the created record to the
   * local list so the UI reflects the change immediately without a re-fetch.
   */
  async function addBook(name: string, description?: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { data, error: sbError } = await booksApi.create({
        name,
        description: description ?? null,
      })
      if (sbError) throw sbError
      if (data) {
        books.value.push(data)
      }
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to add book'
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Update the `name` and/or `description` of an existing book in Supabase
   * and sync the change into the local list.
   */
  async function updateBook(id: string, name: string, description?: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { error: sbError } = await booksApi.update(id, {
        name,
        description: description ?? null,
      })
      if (sbError) throw sbError
      // Sync local state — avoids a full re-fetch
      const index = books.value.findIndex(b => b.id === id)
      if (index !== -1) {
        books.value[index] = {
          ...books.value[index],
          name,
          description: description ?? null,
        }
      }
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update book'
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Delete a book by `id` from Supabase and remove it from the local list.
   */
  async function deleteBook(id: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { error: sbError } = await booksApi.delete(id)
      if (sbError) throw sbError
      books.value = books.value.filter(b => b.id !== id)
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete book'
    }
    finally {
      loading.value = false
    }
  }

  return {
    // state
    books,
    loading,
    error,
    // actions
    fetchBooks,
    addBook,
    updateBook,
    deleteBook,
  }
})
