// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  // Client-rendered SPA — no SSR needed for this single-user PWA
  ssr: false,

  modules: [
    '@nuxtjs/supabase',
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vite-pwa/nuxt'
  ],

  supabase: {
    // No auth redirects — this is a single-user app with no authentication
    redirect: false,
    // Point to our manually-defined Database type (replace with supabase gen types later)
    types: '~/types/supabase.ts'
  },

  pwa: {
    manifest: {
      name: 'e-Quran',
      short_name: 'e-Quran',
      description: 'Personal Quran tracking app',
      theme_color: '#16a34a', // green-600
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait'
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico}']
    }
  }
})
